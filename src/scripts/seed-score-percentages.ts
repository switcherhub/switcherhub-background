import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ConfigurationEntity } from '../configuration/entities/configuration.entity';

async function seedScorePercentages() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const configurationRepository =
      AppDataSource.getRepository(ConfigurationEntity);

    const type = 'score-percentages';
    const name = 'default';

    // Score percentages configuration
    // All percentages should sum to 100%
    const percentages = {
      'job-core': 18,
      environment: 12,
      tenure: 15.75,
      team: 12.25,
      training: 5.25,
      license: 1.75,
      shift: 7.5,
      salary: 5.25,
      'job-type': 2.25,
      'commute-user-a': 10,
      'commute-user-b': 10,
    };

    // Check if configuration already exists
    const existing = await configurationRepository.findOne({
      where: { type, name },
    });

    if (existing) {
      existing.data = { percentages };
      await configurationRepository.save(existing);
      console.log('✅ Updated existing score percentages configuration');
    } else {
      await configurationRepository.save({
        type,
        name,
        data: { percentages },
      });
      console.log('✅ Created score percentages configuration');
    }

    // Verify the sum
    const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
    console.log(`📊 Total percentage sum: ${sum}%`);

    if (Math.abs(sum - 100) > 0.01) {
      console.warn(`⚠️  Warning: Percentages sum to ${sum}%, expected 100%`);
    }

    console.log('✅ Score percentages configuration seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding score percentages:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seed script
seedScorePercentages()
  .then(() => {
    console.log('🎉 Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
