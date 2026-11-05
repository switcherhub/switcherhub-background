import 'reflect-metadata';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

interface RoutingError {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  error: string;
  timestamp: number;
  provider: string;
}

/**
 * Create readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask user for confirmation
 */
function askQuestion(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Connect to Redis
 */
function createRedisClient(): Redis {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  console.log(`🔌 Connecting to Redis at ${host}:${port}...`);

  const redis = new Redis({
    host,
    port,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Failed to connect to Redis after 3 attempts');
        process.exit(1);
      }
      return Math.min(times * 50, 2000);
    },
  });

  redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
  });

  return redis;
}

/**
 * Get all routing errors from Redis
 * Includes errors from both error cache and cached invalid results
 */
async function getRoutingErrors(redis: Redis): Promise<RoutingError[]> {
  const ERROR_PREFIX = 'routing:error';
  const CACHE_PREFIX = 'routing';
  const errors: RoutingError[] = [];
  const errorMap = new Map<string, RoutingError>();

  // Get errors from error cache
  const errorKeys = await redis.keys(`${ERROR_PREFIX}:*`);
  for (const key of errorKeys) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const error = JSON.parse(cached) as RoutingError;
        const errorKey = `${error.from.lat},${error.from.lng}:${error.to.lat},${error.to.lng}`;
        errorMap.set(errorKey, error);
      }
    } catch (err) {
      console.warn(
        `⚠️  Error parsing error key ${key}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Get errors from cached invalid results
  const cacheKeys = await redis.keys(`${CACHE_PREFIX}:*`);
  for (const key of cacheKeys) {
    // Skip error keys (already processed)
    if (key.startsWith(ERROR_PREFIX)) {
      continue;
    }

    try {
      const cached = await redis.get(key);
      if (cached) {
        const result = JSON.parse(cached) as {
          distance: number;
          duration: number;
          error?: string;
        };

        // If result is invalid and has error message
        if ((result.distance < 0 || result.duration < 0) && result.error) {
          // Extract coordinates from key (format: routing:lat1:lng1:lat2:lng2)
          const parts = key.split(':');
          if (parts.length >= 5) {
            const lat1 = parseFloat(parts[1]);
            const lng1 = parseFloat(parts[2]);
            const lat2 = parseFloat(parts[3]);
            const lng2 = parseFloat(parts[4]);

            const errorKey = `${lat1},${lng1}:${lat2},${lng2}`;
            
            // Only add if not already in errorMap (prefer error cache version)
            if (!errorMap.has(errorKey)) {
              errorMap.set(errorKey, {
                from: { lat: lat1, lng: lng1 },
                to: { lat: lat2, lng: lng2 },
                error: result.error,
                timestamp: Date.now(), // Approximate timestamp
                provider: 'unknown',
              });
            }
          }
        }
      }
    } catch (err) {
      // Skip keys that can't be parsed
    }
  }

  // Convert map to array
  errors.push(...Array.from(errorMap.values()));

  // Sort by timestamp (newest first)
  errors.sort((a, b) => b.timestamp - a.timestamp);

  return errors;
}

/**
 * Format timestamp to readable date
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Display routing errors
 */
function displayErrors(errors: RoutingError[], limit?: number): void {
  if (errors.length === 0) {
    console.log('\n✨ No routing errors found!');
    return;
  }

  const displayErrors = limit ? errors.slice(0, limit) : errors;
  const totalErrors = errors.length;

  console.log('\n📋 Routing Errors:');
  console.log('═'.repeat(100));
  console.log(
    `Total errors: ${totalErrors}${limit ? ` (showing first ${limit})` : ''}`,
  );
  console.log('═'.repeat(100));

  // Group errors by error message
  const errorGroups = new Map<string, RoutingError[]>();
  for (const error of errors) {
    const key = error.error;
    if (!errorGroups.has(key)) {
      errorGroups.set(key, []);
    }
    errorGroups.get(key)!.push(error);
  }

  console.log(`\n📊 Errors grouped by type (${errorGroups.size} unique errors):\n`);
  let groupIndex = 1;
  for (const [errorMessage, errorList] of errorGroups.entries()) {
    console.log(
      `${groupIndex}. ${errorMessage} (${errorList.length} occurrence${errorList.length > 1 ? 's' : ''})`,
    );
    groupIndex++;
  }

  console.log('\n\n📝 Detailed Error List:');
  console.log('═'.repeat(100));

  displayErrors.forEach((error, index) => {
    console.log(`\n${index + 1}. Error #${totalErrors - index}`);
    console.log(`   Provider: ${error.provider}`);
    console.log(`   Time: ${formatTimestamp(error.timestamp)}`);
    console.log(
      `   From: (${error.from.lat.toFixed(6)}, ${error.from.lng.toFixed(6)})`,
    );
    console.log(
      `   To: (${error.to.lat.toFixed(6)}, ${error.to.lng.toFixed(6)})`,
    );
    console.log(`   Error: ${error.error}`);
    console.log('   ' + '-'.repeat(98));
  });

  if (limit && errors.length > limit) {
    console.log(
      `\n... and ${errors.length - limit} more errors (use --all flag to see all)`,
    );
  }

  console.log('═'.repeat(100));
}

/**
 * Clear all routing errors
 */
async function clearAllErrors(redis: Redis): Promise<number> {
  const ERROR_PREFIX = 'routing:error';
  const keys = await redis.keys(`${ERROR_PREFIX}:*`);
  if (keys.length === 0) {
    return 0;
  }

  const deleted = await redis.del(...keys);
  return deleted;
}

/**
 * Export errors to JSON file
 */
async function exportErrorsToFile(
  errors: RoutingError[],
  filename: string = 'routing-errors.json',
): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(filename, JSON.stringify(errors, null, 2), 'utf-8');
  console.log(`\n✅ Exported ${errors.length} errors to ${filename}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  const limit = showAll ? undefined : 50;
  const exportFile = args.find((arg) => arg.startsWith('--export='))?.split('=')[1];

  const redis = createRedisClient();

  try {
    // Test connection
    await redis.ping();
    console.log('✅ Successfully connected to Redis\n');

    // Get errors
    const errors = await getRoutingErrors(redis);

    if (errors.length === 0) {
      console.log('\n✨ No routing errors found!');
      await redis.quit();
      process.exit(0);
    }

    // Display errors
    displayErrors(errors, limit);

    // Export if requested
    if (exportFile) {
      await exportErrorsToFile(errors, exportFile);
    }

    // Ask what to do
    const rl = createReadlineInterface();

    console.log('\n🎯 What would you like to do?');
    console.log('  1. Clear all errors');
    console.log('  2. Export errors to JSON file');
    console.log('  3. Show all errors (remove limit)');
    console.log("  0. Exit (don't do anything)");

    const choice = await askQuestion(rl, '\nEnter your choice (0-3): ');

    switch (choice.trim()) {
      case '1':
        const confirm = await askQuestion(
          rl,
          `⚠️  Are you sure you want to delete all ${errors.length} errors? (yes/no): `,
        );
        if (confirm.toLowerCase() === 'yes') {
          const deleted = await clearAllErrors(redis);
          console.log(`\n✅ Successfully deleted ${deleted} errors`);
        } else {
          console.log('\n❌ Operation cancelled');
        }
        break;

      case '2':
        const filename =
          (await askQuestion(
            rl,
            'Enter filename (default: routing-errors.json): ',
          )) || 'routing-errors.json';
        await exportErrorsToFile(errors, filename);
        break;

      case '3':
        console.log('\n');
        displayErrors(errors);
        break;

      case '0':
        console.log('\n👋 Exiting');
        break;

      default:
        console.log('\n❌ Invalid choice');
        break;
    }

    rl.close();
    await redis.quit();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    await redis.quit();
    process.exit(1);
  }
}

console.log('🚀 Starting routing errors viewer...\n');
main();

