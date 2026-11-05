import 'reflect-metadata';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Known cache prefixes in the application
const KNOWN_PREFIXES = {
  routing: 'routing',
  configuration: 'configuration',
  resumeView: 'resume_view',
  resumeShowedContacts: 'resume_showed_contacts',
};

interface CacheStats {
  totalKeys: number;
  prefixStats: Record<string, number>;
  sampleKeys: string[];
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
 * Get cache statistics
 */
async function getCacheStats(redis: Redis): Promise<CacheStats> {
  const allKeys = await redis.keys('*');
  const totalKeys = allKeys.length;

  const prefixStats: Record<string, number> = {};
  const sampleKeys: string[] = [];

  // Count keys by prefix
  for (const key of allKeys) {
    let matched = false;
    for (const [name, prefix] of Object.entries(KNOWN_PREFIXES)) {
      if (key.startsWith(prefix)) {
        prefixStats[name] = (prefixStats[name] || 0) + 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      prefixStats['other'] = (prefixStats['other'] || 0) + 1;
    }

    // Collect sample keys (first 10)
    if (sampleKeys.length < 10) {
      sampleKeys.push(key);
    }
  }

  return {
    totalKeys,
    prefixStats,
    sampleKeys,
  };
}

/**
 * Display cache statistics
 */
function displayStats(stats: CacheStats): void {
  console.log('\n📊 Redis Cache Statistics:');
  console.log('═'.repeat(50));
  console.log(`Total keys: ${stats.totalKeys}`);

  if (stats.totalKeys === 0) {
    console.log('\n✨ Cache is empty!');
    return;
  }

  console.log('\nKeys by prefix:');
  for (const [prefix, count] of Object.entries(stats.prefixStats)) {
    const percentage = ((count / stats.totalKeys) * 100).toFixed(1);
    console.log(
      `  ${prefix.padEnd(25)}: ${count.toString().padStart(6)} (${percentage}%)`,
    );
  }

  if (stats.sampleKeys.length > 0) {
    console.log('\nSample keys (first 10):');
    stats.sampleKeys.forEach((key, index) => {
      console.log(`  ${index + 1}. ${key}`);
    });
  }
  console.log('═'.repeat(50));
}

/**
 * Clear all cache
 */
async function clearAllCache(redis: Redis): Promise<number> {
  const result = await redis.flushdb();
  return result === 'OK' ? 1 : 0;
}

/**
 * Clear cache by prefix
 */
async function clearCacheByPrefix(
  redis: Redis,
  prefix: string,
): Promise<number> {
  const keys = await redis.keys(`${prefix}*`);
  if (keys.length === 0) {
    return 0;
  }

  // Delete keys in batches to avoid blocking Redis
  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const deletedCount = await redis.del(...batch);
    deleted += deletedCount;
  }

  return deleted;
}

/**
 * Remove invalid routing cache entries (where distance or duration is -1)
 */
async function removeInvalidRoutingCache(redis: Redis): Promise<number> {
  const prefix = KNOWN_PREFIXES.routing;
  const keys = await redis.keys(`${prefix}*`);
  let removedCount = 0;

  // Check each key for invalid values
  for (const key of keys) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          distance: number;
          duration: number;
        };
        // Check if result is invalid (distance or duration is -1)
        if (parsed.distance < 0 || parsed.duration < 0) {
          await redis.del(key);
          removedCount++;
        }
      }
    } catch (error) {
      // Skip keys that can't be parsed
      console.warn(
        `⚠️  Error checking key ${key}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  return removedCount;
}

/**
 * Main function
 */
async function main() {
  const redis = createRedisClient();

  try {
    // Test connection
    await redis.ping();
    console.log('✅ Successfully connected to Redis\n');

    // Get and display stats
    const stats = await getCacheStats(redis);
    displayStats(stats);

    if (stats.totalKeys === 0) {
      await redis.quit();
      process.exit(0);
    }

    // Create readline interface
    const rl = createReadlineInterface();

    // Ask what to clear
    console.log('\n🎯 What would you like to clear?');
    console.log('  1. All cache');
    console.log('  2. Routing cache (routing:*)');
    console.log('  3. Configuration cache (configuration:*)');
    console.log('  4. Resume view cache (resume_view:*)');
    console.log('  5. Resume showed contacts cache (resume_showed_contacts:*)');
    console.log('  6. Other keys');
    console.log(
      '  7. Invalid routing cache entries (duration=-1 or distance=-1)',
    );
    console.log("  0. Exit (don't clear anything)");

    const choice = await askQuestion(rl, '\nEnter your choice (0-7): ');

    let keysToDelete = 0;
    let prefix = '';

    switch (choice.trim()) {
      case '1':
        const confirm = await askQuestion(
          rl,
          `⚠️  Are you sure you want to delete ALL ${stats.totalKeys} keys? (yes/no): `,
        );
        if (confirm.toLowerCase() === 'yes') {
          keysToDelete = await clearAllCache(redis);
          console.log(`\n✅ Successfully deleted all ${keysToDelete} keys`);
        } else {
          console.log('\n❌ Operation cancelled');
        }
        break;

      case '2':
        prefix = KNOWN_PREFIXES.routing;
        keysToDelete = stats.prefixStats.routing || 0;
        break;

      case '3':
        prefix = KNOWN_PREFIXES.configuration;
        keysToDelete = stats.prefixStats.configuration || 0;
        break;

      case '4':
        prefix = KNOWN_PREFIXES.resumeView;
        keysToDelete = stats.prefixStats.resumeView || 0;
        break;

      case '5':
        prefix = KNOWN_PREFIXES.resumeShowedContacts;
        keysToDelete = stats.prefixStats.resumeShowedContacts || 0;
        break;

      case '6':
        // Delete all keys that don't match known prefixes
        const otherKeys = await redis.keys('*');
        const keysToDeleteList: string[] = [];

        for (const key of otherKeys) {
          let isKnown = false;
          for (const knownPrefix of Object.values(KNOWN_PREFIXES)) {
            if (key.startsWith(knownPrefix)) {
              isKnown = true;
              break;
            }
          }
          if (!isKnown) {
            keysToDeleteList.push(key);
          }
        }

        if (keysToDeleteList.length === 0) {
          console.log('\n✨ No "other" keys found');
        } else {
          const confirm = await askQuestion(
            rl,
            `⚠️  Are you sure you want to delete ${keysToDeleteList.length} "other" keys? (yes/no): `,
          );
          if (confirm.toLowerCase() === 'yes') {
            const batchSize = 100;
            let deleted = 0;
            for (let i = 0; i < keysToDeleteList.length; i += batchSize) {
              const batch = keysToDeleteList.slice(i, i + batchSize);
              const deletedCount = await redis.del(...batch);
              deleted += deletedCount;
            }
            console.log(`\n✅ Successfully deleted ${deleted} keys`);
          } else {
            console.log('\n❌ Operation cancelled');
          }
        }
        break;

      case '7':
        const invalidCount = await removeInvalidRoutingCache(redis);
        if (invalidCount > 0) {
          console.log(
            `\n✅ Successfully removed ${invalidCount} invalid routing cache entries`,
          );
        } else {
          console.log('\n✨ No invalid routing cache entries found');
        }
        break;

      case '0':
        console.log('\n👋 Exiting without clearing cache');
        break;

      default:
        console.log('\n❌ Invalid choice');
        break;
    }

    // Handle prefix deletion
    if (prefix && keysToDelete > 0) {
      const confirm = await askQuestion(
        rl,
        `⚠️  Are you sure you want to delete ${keysToDelete} keys with prefix "${prefix}*"? (yes/no): `,
      );
      if (confirm.toLowerCase() === 'yes') {
        const deleted = await clearCacheByPrefix(redis, prefix);
        console.log(
          `\n✅ Successfully deleted ${deleted} keys with prefix "${prefix}*"`,
        );
      } else {
        console.log('\n❌ Operation cancelled');
      }
    } else if (prefix && keysToDelete === 0) {
      console.log(`\n✨ No keys found with prefix "${prefix}*"`);
    }

    rl.close();

    // Show final stats
    if (choice !== '0' && (keysToDelete > 0 || prefix)) {
      console.log('\n📊 Final cache statistics:');
      const finalStats = await getCacheStats(redis);
      displayStats(finalStats);
    }

    await redis.quit();
    console.log('\n✅ Connection closed');
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    await redis.quit();
    process.exit(1);
  }
}

console.log('🚀 Starting Redis cache clearing script...\n');
main();
