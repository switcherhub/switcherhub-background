import {
  Injectable,
  Inject,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigurationEntity } from '../entities/configuration.entity';

@Injectable()
export class ConfigurationService implements OnModuleInit {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly CACHE_PREFIX = 'configuration';

  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurationRepository: Repository<ConfigurationEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    // Preload all configurations into cache on startup
    await this.preloadAllConfigurations();
  }

  /**
   * Preload all configurations into cache for faster access
   */
  private async preloadAllConfigurations(): Promise<void> {
    try {
      const allConfigs = await this.configurationRepository.find();

      for (const config of allConfigs) {
        const cacheKey = this.getCacheKey(config.type, config.name);
        await this.cacheManager.set(cacheKey, config.data, this.CACHE_TTL);
      }

      console.log(
        `✅ Preloaded ${allConfigs.length} configurations into cache`,
      );
    } catch (error) {
      console.error('Error preloading configurations:', error);
    }
  }

  /**
   * Get configuration by type and name
   */
  async getConfiguration(
    type: string,
    name: string,
  ): Promise<Record<string, any> | null> {
    const cacheKey = this.getCacheKey(type, name);
    const cached = await this.cacheManager.get<Record<string, any>>(cacheKey);

    if (cached) {
      return cached;
    }

    const config = await this.configurationRepository.findOne({
      where: { type, name },
    });

    if (!config) {
      return null;
    }

    await this.cacheManager.set(cacheKey, config.data, this.CACHE_TTL);
    return config.data;
  }

  /**
   * Get all configurations by type
   */
  async getConfigurationsByType(type: string): Promise<ConfigurationEntity[]> {
    return this.configurationRepository.find({
      where: { type },
    });
  }

  /**
   * Get all configurations
   */
  async getAllConfigurations(): Promise<ConfigurationEntity[]> {
    return this.configurationRepository.find();
  }

  /**
   * Create or update configuration
   */
  async setConfiguration(
    type: string,
    name: string,
    data: Record<string, any>,
  ): Promise<ConfigurationEntity> {
    let config = await this.configurationRepository.findOne({
      where: { type, name },
    });

    if (config) {
      config.data = data;
    } else {
      config = this.configurationRepository.create({ type, name, data });
    }

    const saved = await this.configurationRepository.save(config);

    // Update cache
    const cacheKey = this.getCacheKey(type, name);
    await this.cacheManager.set(cacheKey, saved.data, this.CACHE_TTL);

    return saved;
  }

  /**
   * Update specific field in configuration data
   */
  async updateConfigurationField(
    type: string,
    name: string,
    field: string,
    value: any,
  ): Promise<ConfigurationEntity> {
    const config = await this.configurationRepository.findOne({
      where: { type, name },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuration ${type}/${name} not found`,
      );
    }

    config.data[field] = value;
    const saved = await this.configurationRepository.save(config);

    // Update cache
    const cacheKey = this.getCacheKey(type, name);
    await this.cacheManager.set(cacheKey, saved.data, this.CACHE_TTL);

    return saved;
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(type: string, name: string): Promise<void> {
    const config = await this.configurationRepository.findOne({
      where: { type, name },
    });

    if (!config) {
      throw new NotFoundException(
        `Configuration ${type}/${name} not found`,
      );
    }

    // Remove from cache
    const cacheKey = this.getCacheKey(type, name);
    await this.cacheManager.del(cacheKey);

    await this.configurationRepository.remove(config);
  }

  /**
   * Cache key generator
   */
  private getCacheKey(type: string, name: string): string {
    return `${this.CACHE_PREFIX}:${type}:${name}`;
  }
}


