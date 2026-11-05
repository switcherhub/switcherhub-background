import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { WorkspacePaymentMethodEntity } from '../entities/workspace-payment-method.entity';
import { WorkspaceEntity } from '../entities/workspace.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { PaymentMethodCreateDto } from '../dto/payment-method-create.dto';
import { PaymentMethodSetupIntentResponseDto } from '../dto/payment-method-setup-intent.dto';

@Injectable()
export class WorkspacePaymentMethodService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(WorkspacePaymentMethodEntity)
    private readonly paymentMethodRepository: Repository<WorkspacePaymentMethodEntity>,
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });
    } else {
      console.warn(
        'STRIPE_SECRET_KEY is not configured. Payment method features will not work.',
      );
    }
  }

  /**
   * Create a Stripe Setup Intent for adding a payment method to a workspace.
   * Returns client secret that frontend can use to collect payment method.
   */
  async createSetupIntent(
    workspaceId: string,
    userId: string,
  ): Promise<PaymentMethodSetupIntentResponseDto> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Get or create Stripe customer for workspace
    let stripeCustomerId = await this.getOrCreateStripeCustomer(workspace);

    // Create setup intent
    const setupIntent = await this.stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        workspaceId: workspaceId,
        userId: userId,
      },
    });

    return {
      clientSecret: setupIntent.client_secret as string,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Attach payment method to workspace after setup intent is confirmed.
   */
  async attachPaymentMethod(
    workspaceId: string,
    userId: string,
    dto: PaymentMethodCreateDto,
  ): Promise<WorkspacePaymentMethodEntity> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    // Retrieve setup intent to get payment method
    const setupIntent = await this.stripe.setupIntents.retrieve(
      dto.setupIntentId,
    );

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestException(
        'Setup intent is not succeeded. Payment method was not confirmed.',
      );
    }

    const paymentMethodId = setupIntent.payment_method as string;
    if (!paymentMethodId) {
      throw new BadRequestException('Payment method not found in setup intent');
    }

    // Use the same customer as in Setup Intent — Stripe already attached the payment method to it when the user confirmed.
    // If we called getOrCreateStripeCustomer() here, we could get a different (new) customer when the workspace has no payment methods yet.
    const setupIntentCustomerId =
      typeof setupIntent.customer === 'string'
        ? setupIntent.customer
        : (setupIntent.customer?.id ?? null);

    if (!setupIntentCustomerId) {
      throw new BadRequestException(
        'Setup intent has no customer. Please create a new setup intent.',
      );
    }

    // Get payment method details
    const paymentMethod =
      await this.stripe.paymentMethods.retrieve(paymentMethodId);

    // Check if payment method already exists in database
    const existingPaymentMethod = await this.paymentMethodRepository.findOne({
      where: { stripePaymentMethodId: paymentMethodId },
    });

    if (existingPaymentMethod) {
      if (existingPaymentMethod.workspaceId !== workspaceId) {
        throw new BadRequestException(
          'This payment method is already attached to another workspace',
        );
      }
      return existingPaymentMethod;
    }

    // Verify Setup Intent was for this workspace (metadata from createSetupIntent)
    const siWorkspaceId = setupIntent.metadata?.workspaceId;
    if (siWorkspaceId && siWorkspaceId !== workspaceId) {
      throw new BadRequestException(
        'Setup intent was created for a different workspace.',
      );
    }

    // Use customer from Setup Intent; no need to call attach() — Stripe already attached the payment method when the user confirmed.
    const stripeCustomerId = setupIntentCustomerId;

    // Check if this is the first payment method - make it default
    const existingMethods = await this.paymentMethodRepository.find({
      where: { workspaceId },
    });
    const isDefault = existingMethods.length === 0;

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.paymentMethodRepository.update(
        { workspaceId, isDefault: true },
        { isDefault: false },
      );
    }

    // Extract card details if available
    let cardDetails = null;
    if (paymentMethod.type === 'card' && paymentMethod.card) {
      cardDetails = {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      };
    }

    // Save payment method to database
    const paymentMethodEntity = this.paymentMethodRepository.create({
      workspaceId,
      stripePaymentMethodId: paymentMethodId,
      stripeCustomerId,
      type: paymentMethod.type,
      cardDetails,
      isDefault,
      addedById: userId,
    });

    return this.paymentMethodRepository.save(paymentMethodEntity);
  }

  /**
   * Get all payment methods for a workspace.
   */
  async getPaymentMethods(
    workspaceId: string,
  ): Promise<WorkspacePaymentMethodEntity[]> {
    return this.paymentMethodRepository.find({
      where: { workspaceId },
      relations: ['addedBy'],
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Set a payment method as default.
   */
  async setDefaultPaymentMethod(
    workspaceId: string,
    paymentMethodId: string,
  ): Promise<WorkspacePaymentMethodEntity> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, workspaceId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Unset all other defaults
    await this.paymentMethodRepository.update(
      { workspaceId, isDefault: true },
      { isDefault: false },
    );

    // Set this as default
    paymentMethod.isDefault = true;
    return this.paymentMethodRepository.save(paymentMethod);
  }

  /**
   * Delete a payment method.
   */
  async deletePaymentMethod(
    workspaceId: string,
    paymentMethodId: string,
  ): Promise<void> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: paymentMethodId, workspaceId },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Delete from Stripe
    if (this.stripe && paymentMethod.stripePaymentMethodId) {
      try {
        await this.stripe.paymentMethods.detach(
          paymentMethod.stripePaymentMethodId,
        );
      } catch (error) {
        console.error('Failed to detach payment method from Stripe:', error);
        // Continue with database deletion even if Stripe fails
      }
    }

    // Delete from database
    await this.paymentMethodRepository.remove(paymentMethod);

    // If this was the default, set another one as default if available
    if (paymentMethod.isDefault) {
      const remainingMethods = await this.paymentMethodRepository.find({
        where: { workspaceId },
        order: { createdAt: 'ASC' },
        take: 1,
      });

      if (remainingMethods.length > 0) {
        remainingMethods[0].isDefault = true;
        await this.paymentMethodRepository.save(remainingMethods[0]);
      }
    }
  }

  /**
   * Get or create Stripe customer for workspace.
   * Stores customer ID in workspace metadata or creates a new customer.
   */
  private async getOrCreateStripeCustomer(
    workspace: WorkspaceEntity,
  ): Promise<string> {
    // Check if workspace already has a payment method with customer ID
    const existingPaymentMethod = await this.paymentMethodRepository.findOne({
      where: { workspaceId: workspace.id },
      order: { createdAt: 'ASC' },
    });

    if (existingPaymentMethod?.stripeCustomerId) {
      return existingPaymentMethod.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await this.stripe.customers.create({
      name: workspace.name,
      metadata: {
        workspaceId: workspace.id,
      },
    });

    return customer.id;
  }
}
