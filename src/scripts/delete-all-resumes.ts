import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ResumeEntity } from '../resume/entities/resume.entity';

async function deleteAllResumes() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const resumeRepository = AppDataSource.getRepository(ResumeEntity);

    // Count resumes before deletion
    const countBefore = await resumeRepository.count();
    console.log(`📊 Found ${countBefore} resumes in database`);

    if (countBefore === 0) {
      console.log('ℹ️  No resumes to delete');
      return;
    }

    // Delete all resumes
    console.log('🗑️  Deleting all resumes...');
    await resumeRepository.delete({});

    // Verify deletion
    const countAfter = await resumeRepository.count();
    console.log(`✅ Successfully deleted ${countBefore} resumes`);
    console.log(`📊 Remaining resumes: ${countAfter}`);

    if (countAfter > 0) {
      console.warn(
        `⚠️  Warning: ${countAfter} resumes still exist (might be soft-deleted)`,
      );
    }
  } catch (error) {
    console.error('❌ Error deleting resumes:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the delete script
deleteAllResumes()
  .then(() => {
    console.log('🎉 Delete script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Delete script failed:', error);
    process.exit(1);
  });
