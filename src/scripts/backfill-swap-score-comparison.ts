import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { SwapRequestEntity } from '../swap-request/entities/swap-request.entity';
import { ResumeComparisonService } from '../resume-comparison/services/resume-comparison.service';

dotenv.config();

/**
 * Backfill score and comparison for all swap requests that have NULL score or comparison.
 * Uses the same logic as swap creation (ResumeComparisonService.calculateScoreAndComparisonForSwap).
 *
 * Run: npm run backfill:swap-score-comparison
 */
async function backfillSwapScoreAndComparison() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const dataSource = app.get(DataSource);
  const swapRepo = dataSource.getRepository(SwapRequestEntity);
  const comparisonService = app.get(ResumeComparisonService);

  const swaps = await swapRepo
    .createQueryBuilder('swap')
    .where('swap.score IS NULL OR swap.comparison IS NULL')
    .getMany();

  if (swaps.length === 0) {
    console.log('✅ All swap requests already have score and comparison. Nothing to do.');
    await app.close();
    process.exit(0);
  }

  console.log(`📦 Found ${swaps.length} swap(s) missing score or comparison.\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < swaps.length; i++) {
    const swap = swaps[i];
    const num = i + 1;
    process.stdout.write(
      `[${num}/${swaps.length}] Swap ${swap.id} (resumeA: ${swap.resumeAId}, resumeB: ${swap.resumeBId})... `,
    );

    try {
      const result =
        await comparisonService.calculateScoreAndComparisonForSwap(
          swap.resumeAId,
          swap.resumeBId,
        );

      swap.score = result.totalScore;
      swap.comparison = result.comparison as SwapRequestEntity['comparison'];
      await swapRepo.save(swap);

      console.log(
        `✅ score=${result.totalScore ?? 'null'}, comparison=${result.comparison ? 'set' : 'null'}`,
      );
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      failed++;
    }
  }

  console.log(`\n✅ Done. Updated: ${updated}, Failed: ${failed}, Total: ${swaps.length}`);
  await app.close();
  process.exit(failed > 0 ? 1 : 0);
}

backfillSwapScoreAndComparison().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
