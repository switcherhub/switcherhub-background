import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ResumeEntity } from '../resume/entities/resume.entity';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function recalculateCommute() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const resumeRepository = AppDataSource.getRepository(ResumeEntity);

    // Get all resumes with locationHome and location
    const queryResumes = await resumeRepository
      .createQueryBuilder('resume')
      .where('resume.locationHome IS NOT NULL')
      .andWhere('resume.location IS NOT NULL')
      .andWhere('CAST(resume."locationHome"->>\'lat\' AS FLOAT) IS NOT NULL')
      .andWhere('CAST(resume."locationHome"->>\'lng\' AS FLOAT) IS NOT NULL')
      .andWhere("CAST(resume.location->>'lat' AS FLOAT) IS NOT NULL")
      .andWhere("CAST(resume.location->>'lng' AS FLOAT) IS NOT NULL")
      .getMany();

    console.log(
      `\n📦 Found ${queryResumes.length} resumes with both locations`,
    );

    const mapUrl = process.env.MAP_URL || 'https://map.switcherhub.com';
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < queryResumes.length; i++) {
      const resume = queryResumes[i];
      const locationHome = resume.locationHome as any;
      const location = resume.location as any;

      if (
        !locationHome?.lng ||
        !locationHome?.lat ||
        !location?.lng ||
        !location?.lat
      ) {
        console.log(`⚠️  Skipping resume ${resume.id}: Missing coordinates`);
        skipped++;
        continue;
      }

      try {
        const coordStr = `${locationHome.lng},${locationHome.lat};${location.lng},${location.lat}`;
        const url = `${mapUrl}/table/v1/driving/${coordStr}?sources=0&annotations=duration,distance`;

        console.log(
          `[${i + 1}/${queryResumes.length}] Calculating commute for resume ${resume.id}...`,
        );

        const response = await axios.get<{
          durations?: number[][];
          distances?: number[][];
        }>(url);

        const distance = response.data.distances?.[0]?.[1];
        const duration = response.data.durations?.[0]?.[1];

        if (distance !== undefined && duration !== undefined) {
          const distanceKm = distance / 1000;
          const durationSeconds = duration;

          resume.commuteDistanceKm = distanceKm;
          resume.commuteDurationSeconds = durationSeconds;


          await resumeRepository.save(resume);

          console.log(
            `   ✅ Updated: ${distanceKm.toFixed(2)}km, ${durationSeconds} seconds`,
          );
          updated++;

          // Add delay to avoid rate limiting (1 request per second)
          if (i < queryResumes.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } else {
          console.log(`   ❌ No distance/duration data received`);
          failed++;
        }
      } catch (error) {
        console.error(
          `   ❌ Error calculating commute for resume ${resume.id}:`,
          error instanceof Error ? error.message : error,
        );
        failed++;
      }

      if ((i + 1) % 10 === 0) {
        console.log(
          `\n📊 Progress: ${i + 1}/${queryResumes.length} processed (${updated} updated, ${failed} failed, ${skipped} skipped)\n`,
        );
      }
    }

    console.log(`\n✅ Commute recalculation completed!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${queryResumes.length}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log('🚀 Starting commute recalculation for all resumes...\n');
recalculateCommute();
