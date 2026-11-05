import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DataSource, Not, IsNull } from 'typeorm';
import { AppModule } from '../app.module';
import { SwapRequestEntity } from '../swap-request/entities/swap-request.entity';
import { ChatEntity } from '../chat/entities/chat.entity';
import { ChatService } from '../chat/services/chat.service';

dotenv.config();

/**
 * Для всіх swap-реквестів без чату створює чат між двома світчерами (власниками резюме A та B).
 *
 * Run: npm run backfill:swap-request-chats
 */
async function backfillSwapRequestChats() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const dataSource = app.get(DataSource);
  const swapRepo = dataSource.getRepository(SwapRequestEntity);
  const chatRepo = dataSource.getRepository(ChatEntity);
  const chatService = app.get(ChatService);

  const chatsWithSwap = await chatRepo.find({
    where: { targetSwapRequestId: Not(IsNull()) },
    select: ['targetSwapRequestId'],
  });
  const swapRequestIdsWithChat = new Set(
    chatsWithSwap
      .map((c) => c.targetSwapRequestId)
      .filter((id): id is string => id != null),
  );

  const swapsWithoutChat = await swapRepo.find({
    relations: ['resumeA', 'resumeB'],
  });

  const toProcess = swapsWithoutChat.filter(
    (s) => !swapRequestIdsWithChat.has(s.id),
  );

  if (toProcess.length === 0) {
    console.log(
      '✅ У всіх swap-реквестів вже є чати. Нічого робити не потрібно.',
    );
    await app.close();
    process.exit(0);
  }

  console.log(
    `📦 Знайдено ${toProcess.length} swap-реквест(ів) без чату (всього swap-реквестів: ${swapsWithoutChat.length}).\n`,
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const swap = toProcess[i];
    const num = i + 1;
    const switcherAId = swap.resumeA?.userId ?? null;
    const switcherBId = swap.resumeB?.userId ?? null;

    process.stdout.write(
      `[${num}/${toProcess.length}] Swap ${swap.id} (resumeA.userId: ${switcherAId ?? 'null'}, resumeB.userId: ${switcherBId ?? 'null'})... `,
    );

    if (!switcherAId || !switcherBId) {
      console.log(
        `⏭️ пропущено (немає userId у резюме)`,
      );
      skipped++;
      continue;
    }

    try {
      await chatService.createSwapRequestChat(
        swap.id,
        switcherAId,
        switcherBId,
      );
      console.log(`✅ чат створено`);
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌ ${msg}`);
      failed++;
    }
  }

  console.log(
    `\n✅ Готово. Створено: ${created}, пропущено: ${skipped}, помилок: ${failed}, всього оброблено: ${toProcess.length}`,
  );
  await app.close();
  process.exit(failed > 0 ? 1 : 0);
}

backfillSwapRequestChats().catch((err) => {
  console.error('❌ Критична помилка:', err);
  process.exit(1);
});
