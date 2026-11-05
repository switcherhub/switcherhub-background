import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { JobTypeEntity } from '../job-type/entities/job-type.entity';

/**
 * Backfill jobTypeId for resumes that have NULL.
 * Assigns a random job type to each resume missing jobTypeId.
 *
 * Run: npm run backfill:job-type
 */
async function backfillResumeJobType() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized\n');

    const resumeRepository = AppDataSource.getRepository(ResumeEntity);
    const jobTypeRepository = AppDataSource.getRepository(JobTypeEntity);

    // Load all job types
    const jobTypes = await jobTypeRepository.find({
      where: { isHidden: false },
    });

    if (!jobTypes.length) {
      console.error('❌ No job types found. Run seed script first: npm run seed');
      process.exit(1);
    }

    console.log(`📦 Found ${jobTypes.length} job types\n`);

    // Find resumes with null jobTypeId
    const resumesToUpdate = await resumeRepository
      .createQueryBuilder('resume')
      .where('resume."jobTypeId" IS NULL')
      .getMany();

    if (!resumesToUpdate.length) {
      console.log('✅ All resumes already have jobTypeId assigned. Nothing to do.');
      process.exit(0);
    }

    console.log(`📝 Updating ${resumesToUpdate.length} resumes with random jobTypeId...\n`);

    let updated = 0;
    for (const resume of resumesToUpdate) {
      const randomJobType =
        jobTypes[Math.floor(Math.random() * jobTypes.length)];
      resume.jobTypeId = randomJobType.id;
      resume.jobType = randomJobType;
      await resumeRepository.save(resume);
      updated++;
      if (updated % 50 === 0) {
        console.log(`   ✅ Updated ${updated}/${resumesToUpdate.length} resumes...`);
      }
    }

    console.log(`\n✅ Done! Updated ${updated} resumes with random jobTypeId.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

backfillResumeJobType();
