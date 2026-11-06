import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConsentEntity } from './entities/consent.entity';
import { ConsentPurposeEnum } from './types/consent-purpose.enum';
import { SwapRequestEntity } from 'src/swap-request/entities/swap-request.entity';
import { assertVersion } from 'src/app/idempotency/version-conflict';
import {
  ConsentRecord,
  evaluateTwoSidedConsent,
} from './consent.logic';

export interface AuthorizeInput {
  swapId: string;
  actorId: string;
  proposalVersion: number;
  recipientId?: string | null;
  disclosureSnapshot?: Record<string, unknown> | null;
  purpose?: ConsentPurposeEnum;
}

export interface ConsentStatus {
  swapId: string;
  proposalVersion: number;
  bothAuthorized: boolean;
  authorizedActorIds: string[];
  missingActorIds: string[];
}

@Injectable()
export class ConsentService {
  constructor(
    @InjectRepository(ConsentEntity)
    private readonly consentRepo: Repository<ConsentEntity>,
    @InjectRepository(SwapRequestEntity)
    private readonly swapRepo: Repository<SwapRequestEntity>,
  ) {}

  private async loadSwapWithParticipants(
    swapId: string,
  ): Promise<{ swap: SwapRequestEntity; participantIds: [string, string] }> {
    const swap = await this.swapRepo.findOne({
      where: { id: swapId },
      relations: ['resumeA', 'resumeB'],
    });
    if (!swap) {
      throw new NotFoundException('Swap request not found.');
    }
    const a = swap.resumeA?.userId ?? null;
    const b = swap.resumeB?.userId ?? null;
    if (!a || !b) {
      throw new BadRequestException('Swap participants are not resolved.');
    }
    return { swap, participantIds: [a, b] };
  }

  /** Grant explicit, version-bound consent for the current proposal. Idempotent. */
  async authorize(input: AuthorizeInput): Promise<ConsentStatus> {
    const purpose = input.purpose ?? ConsentPurposeEnum.AUTHORIZE_EMPLOYER_CONTACT;
    const { swap, participantIds } = await this.loadSwapWithParticipants(
      input.swapId,
    );

    // Only a participant may authorize.
    if (!participantIds.includes(input.actorId)) {
      throw new ForbiddenException('Only swap participants can authorize.');
    }
    // Consent must target the current proposal version (stale → 409).
    assertVersion(input.proposalVersion, swap.proposalVersion);

    // Idempotent: reuse an existing active consent for this actor/version/purpose.
    const existing = await this.consentRepo.findOne({
      where: {
        swapRequestId: input.swapId,
        actorId: input.actorId,
        proposalVersion: input.proposalVersion,
        purpose,
        revokedAt: IsNull(),
      },
    });
    if (!existing) {
      await this.consentRepo.save(
        this.consentRepo.create({
          swapRequestId: input.swapId,
          actorId: input.actorId,
          proposalVersion: input.proposalVersion,
          purpose,
          recipientId: input.recipientId ?? null,
          disclosureSnapshot: input.disclosureSnapshot ?? null,
        }),
      );
    }

    return this.status(input.swapId, purpose);
  }

  /** Revoke this actor's active consent (before send cancels the send). */
  async withdraw(
    swapId: string,
    actorId: string,
    proposalVersion: number,
    purpose: ConsentPurposeEnum = ConsentPurposeEnum.AUTHORIZE_EMPLOYER_CONTACT,
  ): Promise<ConsentStatus> {
    await this.consentRepo.update(
      {
        swapRequestId: swapId,
        actorId,
        proposalVersion,
        purpose,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
    return this.status(swapId, purpose);
  }

  /** Current two-sided consent status for a swap at its current proposal version. */
  async status(
    swapId: string,
    purpose: ConsentPurposeEnum = ConsentPurposeEnum.AUTHORIZE_EMPLOYER_CONTACT,
  ): Promise<ConsentStatus> {
    const { swap, participantIds } = await this.loadSwapWithParticipants(swapId);
    const rows = await this.consentRepo.find({
      where: { swapRequestId: swapId, purpose },
    });
    const consents: ConsentRecord[] = rows.map((r) => ({
      actorId: r.actorId,
      proposalVersion: r.proposalVersion,
      purpose: r.purpose,
      revokedAt: r.revokedAt,
    }));
    const result = evaluateTwoSidedConsent({
      consents,
      participantIds,
      proposalVersion: swap.proposalVersion,
      purpose,
    });
    return {
      swapId,
      proposalVersion: swap.proposalVersion,
      bothAuthorized: result.bothAuthorized,
      authorizedActorIds: result.authorizedActorIds,
      missingActorIds: result.missingActorIds,
    };
  }

  /** Gate helper for the swap flow: are both workers authorized at the current version? */
  async isBothAuthorized(
    swapId: string,
    purpose: ConsentPurposeEnum = ConsentPurposeEnum.AUTHORIZE_EMPLOYER_CONTACT,
  ): Promise<boolean> {
    return (await this.status(swapId, purpose)).bothAuthorized;
  }
}
