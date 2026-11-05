import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { ResumeEntity } from '../resume/entities/resume.entity';
import { JobCoreEntity } from '../job-core/entities/job-core.entity';
import { WorkEnvironmentEntity } from '../work-environment/entities/work-environment.entity';
import { ShiftTypeEntity } from '../shift-type/entities/shift-type.entity';
import { LocationTenureEntity } from '../location-tenure/entities/location-tenure.entity';
import { SameRoleCountEntity } from '../same-role-count/entities/same-role-count.entity';
import { TimeToStartWorkingEntity } from '../time-to-start-working/entities/time-to-start-working.entity';
import { LicenseRequiredEntity } from '../license-required/entities/license-required.entity';
import { JobTypeEntity } from '../job-type/entities/job-type.entity';
import { faker } from '@faker-js/faker';
import { UserRoleEnum } from '../users/interfaces/user-role.enum';

/**
 * Calculate distance between two points using Haversine formula (in km)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate duration in seconds from distance (assuming ~50 km/h average speed)
 */
function estimateDuration(distanceKm: number): number {
  const avgSpeedKmh = 50;
  return (distanceKm / avgSpeedKmh) * 3600; // Convert to seconds
}

async function getLocationByCoordinates(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en&addressdetails=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.address) {
    const workLocation = {
      country: data.address.country || null,
      city:
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.road ||
        data.address.state ||
        null,
      address: data.display_name,
      zipCode: data.address.postcode || null,
      lat: lat,
      lng: lon,
      state: data.address?.state || faker.location.state(),
      area: data.address?.suburb || null,
    };

    return workLocation;
  } else {
    console.error('Location not found');
    return null;
  }
}

async function generateTestResumes(count: number) {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const resumeRepository = AppDataSource.getRepository(ResumeEntity);
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
    const licenseRequiredRepository = AppDataSource.getRepository(
      LicenseRequiredEntity,
    );
    const jobTypeRepository = AppDataSource.getRepository(JobTypeEntity);

    // Load all available parameter values
    console.log('📦 Loading parameter data...');
    const jobCores = await jobCoreRepository.find({
      where: { isHidden: false },
    });
    const workEnvironments = await workEnvironmentRepository.find({
      where: { isHidden: false },
    });
    const shiftTypes = await shiftTypeRepository.find({
      where: { isHidden: false },
    });
    const locationTenures = await locationTenureRepository.find({
      where: { isHidden: false },
    });
    const sameRoleCounts = await sameRoleCountRepository.find({
      where: { isHidden: false },
    });
    const timeToStartWorkings = await timeToStartWorkingRepository.find({
      where: { isHidden: false },
    });
    const licenseRequireds = await licenseRequiredRepository.find({
      where: { isHidden: false },
    });
    const jobTypes = await jobTypeRepository.find({
      where: { isHidden: false },
    });

    if (
      !jobCores.length ||
      !workEnvironments.length ||
      !shiftTypes.length ||
      !locationTenures.length ||
      !sameRoleCounts.length ||
      !timeToStartWorkings.length ||
      !licenseRequireds.length ||
      !jobTypes.length
    ) {
      throw new Error(
        'Missing required parameter data. Please run seed script first.',
      );
    }

    console.log(`✅ Loaded parameter data`);
    console.log(`   - Job Cores: ${jobCores.length}`);
    console.log(`   - Work Environments: ${workEnvironments.length}`);
    console.log(`   - Shift Types: ${shiftTypes.length}`);
    console.log(`   - Location Tenures: ${locationTenures.length}`);
    console.log(`   - Same Role Counts: ${sameRoleCounts.length}`);
    console.log(`   - Time To Start Workings: ${timeToStartWorkings.length}`);
    console.log(`   - License Requireds: ${licenseRequireds.length}`);

    // Base coordinates for generating resumes (example: Louisville, KY area)
    const baseLat = 38.2527;
    const baseLng = -85.7585;
    const radiusKm = 50; // Generate resumes within 50km radius

    console.log(`\n🌱 Generating ${count} test resumes...`);
    console.log(`   Base location: ${baseLat}, ${baseLng}`);
    console.log(`   Radius: ${radiusKm}km`);
    console.log(
      `   Strategy: Creating clusters with same jobCore, similar salaries, and close locations\n`,
    );
    console.log(`   This ensures resumes pass all comparison filters:\n`);
    console.log(`   - Same jobCore ✓\n`);
    console.log(`   - Salary within 10% ✓\n`);
    console.log(`   - Close locationHome (within cluster) ✓\n`);
    console.log(`   - commuteDistanceKm and commuteDurationSeconds set ✓\n`);

    let created = 0;
    let skipped = 0;

    // Strategy: Create clusters of resumes with same jobCore, similar salaries, and close locations
    // This ensures maximum matches in calculateComparison
    // Each cluster: 8-15 resumes with locationHome within 5km radius
    const resumesPerCluster = Math.max(
      8,
      Math.min(15, Math.floor(count / jobCores.length)),
    );
    const clustersCount = Math.ceil(count / resumesPerCluster);

    console.log(
      `   Creating ${clustersCount} clusters with ~${resumesPerCluster} resumes each\n`,
    );

    for (let clusterIndex = 0; clusterIndex < clustersCount; clusterIndex++) {
      // Select jobCore for this cluster (cycle through all jobCores)
      const jobCore = jobCores[clusterIndex % jobCores.length];

      // Base salary for this cluster (will vary within 10%)
      const baseSalary = faker.number.int({ min: 15, max: 35 });
      const salaryVariation = baseSalary * 0.1; // 10% variation

      // Cluster center location (within main radius)
      const clusterDistance = faker.number.float({
        min: 0,
        max: radiusKm * 0.7,
      });
      const clusterBearing = faker.number.float({ min: 0, max: 360 });
      const clusterLatOffset =
        (clusterDistance / 111.32) * Math.cos((clusterBearing * Math.PI) / 180);
      const clusterLngOffset =
        (clusterDistance / (111.32 * Math.cos((baseLat * Math.PI) / 180))) *
        Math.sin((clusterBearing * Math.PI) / 180);
      const clusterCenterLat = baseLat + clusterLatOffset;
      const clusterCenterLng = baseLng + clusterLngOffset;

      // Target commute distance for this cluster (all resumes will have similar commute)
      // This ensures they pass the distance/duration filters
      const targetCommuteDistanceKm = faker.number.float({ min: 8, max: 15 });
      const targetCommuteDurationSeconds = estimateDuration(
        targetCommuteDistanceKm,
      );

      // Generate resumes for this cluster
      const resumesInCluster = Math.min(resumesPerCluster, count - created);

      for (let i = 0; i < resumesInCluster; i++) {
        try {
          // Random parameter selections (but same jobCore for cluster)
          const workEnvironment = faker.helpers.arrayElement(workEnvironments);
          const jobType = faker.helpers.arrayElement(jobTypes);
          const shiftType = faker.helpers.arrayElement(shiftTypes);
          const locationTenure = faker.helpers.arrayElement(locationTenures);
          const sameRoleCount = faker.helpers.arrayElement(sameRoleCounts);
          const timeToStartWorking =
            faker.helpers.arrayElement(timeToStartWorkings);
          const licenseRequired = faker.helpers.arrayElement(licenseRequireds);

          // Generate work location near cluster center
          // Work locations will be within 2-5km of cluster center
          const workDistanceFromCenter = faker.number.float({ min: 2, max: 5 });
          const workBearing = faker.number.float({ min: 0, max: 360 });
          const workLatOffset =
            (workDistanceFromCenter / 111.32) *
            Math.cos((workBearing * Math.PI) / 180);
          const workLngOffset =
            (workDistanceFromCenter /
              (111.32 * Math.cos((clusterCenterLat * Math.PI) / 180))) *
            Math.sin((workBearing * Math.PI) / 180);
          const workLat = clusterCenterLat + workLatOffset;
          const workLng = clusterCenterLng + workLngOffset;

          // Generate home location to achieve target commute distance
          // Vary the commute distance slightly (within 10%) to simulate real scenarios
          const commuteDistance =
            targetCommuteDistanceKm *
            faker.number.float({ min: 0.95, max: 1.05 });
          const commuteBearing = faker.number.float({ min: 0, max: 360 });
          const homeLatOffset =
            (commuteDistance / 111.32) *
            Math.cos((commuteBearing * Math.PI) / 180);
          const homeLngOffset =
            (commuteDistance / (111.32 * Math.cos((workLat * Math.PI) / 180))) *
            Math.sin((commuteBearing * Math.PI) / 180);
          const homeLat = workLat + homeLatOffset;
          const homeLng = workLng + homeLngOffset;

          // Calculate actual commute distance and duration
          const actualCommuteDistanceKm = calculateDistance(
            homeLat,
            homeLng,
            workLat,
            workLng,
          );
          const actualCommuteDurationSeconds = estimateDuration(
            actualCommuteDistanceKm,
          );

          // Get location details (with delay to avoid rate limiting)
          const location = await getLocationByCoordinates(workLat, workLng);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          const locationHome = await getLocationByCoordinates(homeLat, homeLng);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

          if (!location || !locationHome) {
            console.log(
              `⚠️  Skipping resume ${created + 1}: Could not get location data`,
            );
            skipped++;
            continue;
          }

          // Generate salary data within 10% of base salary for this group
          const salaryVariationAmount = faker.number.float({
            min: -salaryVariation,
            max: salaryVariation,
          });
          const resumeSalary = Math.max(10, baseSalary + salaryVariationAmount);

          // Create resume entity
          const resume = resumeRepository.create({
            firstName: faker.person.firstName(),
            salaryHourly: resumeSalary,
            allowChat: faker.datatype.boolean(),
            isHidden: false,
            isApproved: true,
            location: location as any,
            locationHome: locationHome as any,
            commuteDistanceKm: actualCommuteDistanceKm,
            commuteDurationSeconds: Math.round(actualCommuteDurationSeconds),
            jobCoreId: jobCore.id,
            jobTypeId: jobType.id,
            workEnvironmentId: workEnvironment.id,
            shiftTypeId: shiftType.id,
            locationTenureId: locationTenure.id,
            sameRoleCountId: sameRoleCount.id,
            timeToStartWorkingId: timeToStartWorking.id,
            licenseRequiredId: licenseRequired.id,
            title: '',
            order: 0,
            showedContacts: 0,
            views: 0,
            chatsStarted: 0,
            reviews: 0,
          });

          await resumeRepository.save(resume);
          created++;

          if (created % 10 === 0) {
            console.log(
              `   ✅ Created ${created}/${count} resumes... (Cluster ${clusterIndex + 1}/${clustersCount})`,
            );
          }
        } catch (error) {
          console.error(
            `   ❌ Error creating resume ${created + 1}:`,
            error.message,
          );
          skipped++;
        }
      }
    }

    console.log(`\n✅ Resume generation completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${count}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get count from command line argument or use default
// Usage: npm run generate:test-resumes [count]
// Example: npm run generate:test-resumes 200
const count = process.argv[2] ? parseInt(process.argv[2], 10) : 100;

if (isNaN(count) || count <= 0) {
  console.error('❌ Invalid count. Please provide a positive number.');
  console.error('Usage: npm run generate:test-resumes [count]');
  console.error('Example: npm run generate:test-resumes 200');
  process.exit(1);
}

console.log(`🚀 Starting generation of ${count} test resumes...\n`);
console.log(
  `⚠️  Note: This script uses OpenStreetMap API with 1s delay between requests.`,
);
console.log(
  `   Generating ${count} resumes will take approximately ${Math.ceil((count * 2) / 60)} minutes.\n`,
);
generateTestResumes(count);
