import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ConfigurationEntity } from '../configuration/entities/configuration.entity';
import { JobCoreEntity } from '../job-core/entities/job-core.entity';
import { WorkEnvironmentEntity } from '../work-environment/entities/work-environment.entity';
import { ShiftTypeEntity } from '../shift-type/entities/shift-type.entity';
import { LocationTenureEntity } from '../location-tenure/entities/location-tenure.entity';
import { SameRoleCountEntity } from '../same-role-count/entities/same-role-count.entity';
import { TimeToStartWorkingEntity } from '../time-to-start-working/entities/time-to-start-working.entity';
import { JobTypeEntity } from '../job-type/entities/job-type.entity';
import { LicenseRequiredEntity } from '../license-required/entities/license-required.entity';

async function seedScoringConfiguration() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const configurationRepository =
      AppDataSource.getRepository(ConfigurationEntity);
    const jobCoreRepository = AppDataSource.getRepository(JobCoreEntity);
    const workEnvironmentRepository = AppDataSource.getRepository(
      WorkEnvironmentEntity,
    );
    const shiftTypeRepository = AppDataSource.getRepository(ShiftTypeEntity);
    const locationTenureRepository =
      AppDataSource.getRepository(LocationTenureEntity);
    const sameRoleCountRepository =
      AppDataSource.getRepository(SameRoleCountEntity);
    const timeToStartWorkingRepository = AppDataSource.getRepository(
      TimeToStartWorkingEntity,
    );
    const jobTypeRepository = AppDataSource.getRepository(JobTypeEntity);
    const licenseRequiredRepository = AppDataSource.getRepository(
      LicenseRequiredEntity,
    );

    // Get all parameter entities
    const [
      jobCores,
      workEnvironments,
      shiftTypes,
      locationTenures,
      sameRoleCounts,
      timeToStartWorkings,
      jobTypes,
      licenseRequireds,
    ] = await Promise.all([
      jobCoreRepository.find(),
      workEnvironmentRepository.find(),
      shiftTypeRepository.find(),
      locationTenureRepository.find(),
      sameRoleCountRepository.find(),
      timeToStartWorkingRepository.find(),
      jobTypeRepository.find(),
      licenseRequiredRepository.find(),
    ]);

    // Function to generate matrix JSON for all combinations
    const generateMatrix = (
      entities: Array<{ id: string }>,
    ): Record<string, number> => {
      const matrix: Record<string, number> = {};
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const key = [entities[i].id, entities[j].id].sort().join('-');
          matrix[key] = 0.5; // Different IDs = 0.5
        }
      }
      return matrix;
    };

    const type = 'scoring-matrix';

    // Helper function to create or skip configuration
    const createOrSkipConfiguration = async (
      name: string,
      entities: Array<{ id: string }>,
      displayName: string,
    ): Promise<void> => {
      // Check if configuration already exists
      const existing = await configurationRepository.findOne({
        where: { type, name },
      });

      if (existing) {
        console.log(
          `⏭️  Skipping ${displayName} - configuration already exists`,
        );
        return;
      }

      console.log(`🌱 Seeding ${displayName}...`);
      const matrix = generateMatrix(entities);
      await configurationRepository.save({
        type,
        name,
        data: { matrix },
      });
      console.log(
        `✅ Seeded ${displayName} (${Object.keys(matrix).length} entries)`,
      );
    };

    // Generate and save configurations
    await createOrSkipConfiguration('job-core', jobCores, 'Job Core Scoring');
    await createOrSkipConfiguration(
      'work-environment',
      workEnvironments,
      'Work Environment Scoring',
    );
    await createOrSkipConfiguration(
      'shift-type',
      shiftTypes,
      'Shift Type Scoring',
    );
    await createOrSkipConfiguration(
      'location-tenure',
      locationTenures,
      'Location Tenure Scoring',
    );
    await createOrSkipConfiguration(
      'same-role-count',
      sameRoleCounts,
      'Same Role Count Scoring',
    );
    await createOrSkipConfiguration(
      'time-to-start-working',
      timeToStartWorkings,
      'Time To Start Working Scoring',
    );
    await createOrSkipConfiguration('job-type', jobTypes, 'Job Type Scoring');
    await createOrSkipConfiguration(
      'license-required',
      licenseRequireds,
      'License Required Scoring',
    );

    console.log('✅ All scoring configurations seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding scoring configurations:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seed script
seedScoringConfiguration()
  .then(() => {
    console.log('🎉 Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
