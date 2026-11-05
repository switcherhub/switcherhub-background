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
 * Generate a point at a specific distance and bearing from a given point
 */
function generatePointAtDistance(
  lat: number,
  lng: number,
  distanceKm: number,
  bearingDegrees: number,
): { lat: number; lng: number } {
  const R = 6371; // Earth's radius in km
  const bearing = (bearingDegrees * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distanceKm / R) * Math.cos(lat1),
      Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
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

async function generateFilteredResumes() {
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

    // Base coordinates for main resume (example: Louisville, KY area)
    const baseLat = 38.2527;
    const baseLng = -85.7585;
    const radiusKm = 1000; // Radius for filtering (1000km)

    // Select a single jobCore for all resumes
    const selectedJobCore = jobCores[0];
    const baseSalary = 25; // Base hourly salary
    const salaryVariation = baseSalary * 0.1; // 10% variation

    console.log(`\n🌱 Generating test resumes for comparison...`);
    console.log(`   Main resume location: ${baseLat}, ${baseLng}`);
    console.log(`   Filter radius: ${radiusKm}km`);
    console.log(`   Job Core: ${selectedJobCore.title}`);
    console.log(`   Base salary: $${baseSalary}/hour (variation: ±10%)\n`);

    // Step 1: Generate main resume
    console.log('📝 Step 1: Creating main resume...');
    const mainResumeLocation = await getLocationByCoordinates(baseLat, baseLng);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!mainResumeLocation) {
      throw new Error('Could not get location for main resume');
    }

    // Main resume locationHome (same as location for simplicity)
    const mainResumeLocationHome = await getLocationByCoordinates(
      baseLat,
      baseLng,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!mainResumeLocationHome) {
      throw new Error('Could not get locationHome for main resume');
    }

    // Calculate commute distance for main resume (use average distance)
    // Main resume location and locationHome are the same, so commute is 0
    // But we need a reasonable value for filtering, so use average from other resumes
    // Filter allows up to 4x commuteDistanceKm, so if commuteDistanceKm = 10, max distance = 40km
    const mainCommuteDistanceKm = 10; // Average commute distance
    const mainCommuteDurationSeconds = (mainCommuteDistanceKm / 50) * 3600; // Assuming 50 km/h
    const maxDistanceForFilter = mainCommuteDistanceKm * 4; // 40km - max distance that will pass filter

    const mainResume = resumeRepository.create({
      firstName: 'Main',
      salaryHourly: baseSalary,
      allowChat: true,
      isHidden: false,
      isApproved: true,
      location: mainResumeLocation as any,
      locationHome: mainResumeLocationHome as any,
      commuteDistanceKm: mainCommuteDistanceKm,
      commuteDurationSeconds: Math.round(mainCommuteDurationSeconds),
      jobCoreId: selectedJobCore.id,
      jobTypeId: faker.helpers.arrayElement(jobTypes).id,
      workEnvironmentId: faker.helpers.arrayElement(workEnvironments).id,
      shiftTypeId: faker.helpers.arrayElement(shiftTypes).id,
      locationTenureId: faker.helpers.arrayElement(locationTenures).id,
      sameRoleCountId: faker.helpers.arrayElement(sameRoleCounts).id,
      timeToStartWorkingId: faker.helpers.arrayElement(timeToStartWorkings).id,
      licenseRequiredId: faker.helpers.arrayElement(licenseRequireds).id,
      title: '',
      order: 0,
      showedContacts: 0,
      views: 0,
      chatsStarted: 0,
      reviews: 0,
    });

    const savedMainResume = await resumeRepository.save(mainResume);
    console.log(`✅ Main resume created with ID: ${savedMainResume.id}\n`);

    // Step 2: Generate 101 filtered resumes
    console.log('📝 Step 2: Creating 101 filtered resumes...');
    console.log(
      `   These resumes will pass all filters:\n`,
    );
    console.log(`   - Same jobCore (${selectedJobCore.title}) ✓\n`);
    console.log(`   - Salary within 10% of $${baseSalary}/hour ✓\n`);
    console.log(`   - locationHome within ${radiusKm}km of main resume ✓\n`);
    console.log(`   - location within ${radiusKm}km of main resume ✓\n`);
    console.log(`   Note: TomTom API will automatically batch requests if needed\n`);

    let created = 0;
    let skipped = 0;
    const targetCount = 50;

    // Generate resumes at distances that will pass the filter
    // Filter checks: distanceAToB <= mainCommuteDistanceKm * 4 (40km)
    // and distanceBToA <= resume.commuteDistanceKm * 4
    // So we need to generate resumes within ~40km of main resume locationHome
    for (let i = 0; i < targetCount; i++) {
      try {
        // Generate locationHome within maxDistanceForFilter (40km) from main resume locationHome
        // This ensures distanceAToB (from main.locationHome to resume.location) will be within limit
        const locationHomeDistance = faker.number.float({
          min: 5,
          max: maxDistanceForFilter * 0.8, // Up to 32km to leave room for work location
        });
        const locationHomeBearing = faker.number.float({ min: 0, max: 360 });

        // Generate locationHome point
        const locationHomePoint = generatePointAtDistance(
          baseLat,
          baseLng,
          locationHomeDistance,
          locationHomeBearing,
        );

        // Generate work location (location) - should be within maxDistanceForFilter from main locationHome
        // distanceAToB = distance from main.locationHome to resume.location
        // This should be <= mainCommuteDistanceKm * 4 (40km)
        const workDistanceFromMainHome = faker.number.float({
          min: 5,
          max: maxDistanceForFilter * 0.9, // Up to 36km
        });
        const workBearing = faker.number.float({ min: 0, max: 360 });
        const workPoint = generatePointAtDistance(
          baseLat,
          baseLng,
          workDistanceFromMainHome,
          workBearing,
        );

        // Get location details
        const location = await getLocationByCoordinates(
          workPoint.lat,
          workPoint.lng,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const locationHome = await getLocationByCoordinates(
          locationHomePoint.lat,
          locationHomePoint.lng,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!location || !locationHome) {
          console.log(
            `⚠️  Skipping resume ${i + 1}: Could not get location data`,
          );
          skipped++;
          continue;
        }

        // Generate salary within 10% of base salary
        const salaryVariationAmount = faker.number.float({
          min: -salaryVariation,
          max: salaryVariation,
        });
        const resumeSalary = Math.max(10, baseSalary + salaryVariationAmount);

        // Calculate commute distance from locationHome to work location
        const commuteDistance = calculateDistance(
          locationHomePoint.lat,
          locationHomePoint.lng,
          workPoint.lat,
          workPoint.lng,
        );
        const commuteDuration = (commuteDistance / 50) * 3600; // Assuming 50 km/h

        // Calculate distance from resume.locationHome to mainResume.location
        // This is distanceBToA - must be <= commuteDistanceKm * 4 to pass filter
        const distanceBToA = calculateDistance(
          locationHomePoint.lat,
          locationHomePoint.lng,
          baseLat,
          baseLng,
        );

        // Ensure commuteDistanceKm is large enough so that distanceBToA <= commuteDistanceKm * 4
        // If distanceBToA = 30km, then commuteDistanceKm should be at least 7.5km
        const minCommuteDistance = Math.max(commuteDistance, distanceBToA / 4);
        const finalCommuteDistance = faker.number.float({
          min: minCommuteDistance,
          max: minCommuteDistance * 1.2, // Add some variation
        });
        const finalCommuteDuration = (finalCommuteDistance / 50) * 3600;

        // Create resume entity
        const resume = resumeRepository.create({
          firstName: faker.person.firstName(),
          salaryHourly: resumeSalary,
          jobTypeId: faker.helpers.arrayElement(jobTypes).id,
          allowChat: faker.datatype.boolean(),
          isHidden: false,
          isApproved: true,
          location: location as any,
          locationHome: locationHome as any,
          commuteDistanceKm: finalCommuteDistance,
          commuteDurationSeconds: Math.round(finalCommuteDuration),
          jobCoreId: selectedJobCore.id, // Same jobCore as main resume
          workEnvironmentId: faker.helpers.arrayElement(workEnvironments).id,
          shiftTypeId: faker.helpers.arrayElement(shiftTypes).id,
          locationTenureId: faker.helpers.arrayElement(locationTenures).id,
          sameRoleCountId: faker.helpers.arrayElement(sameRoleCounts).id,
          timeToStartWorkingId: faker.helpers.arrayElement(timeToStartWorkings)
            .id,
          licenseRequiredId: faker.helpers.arrayElement(licenseRequireds).id,
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
          console.log(`   ✅ Created ${created}/${targetCount} resumes...`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating resume ${i + 1}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n✅ Resume generation completed!`);
    console.log(`   Created: ${created}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${targetCount}`);
    console.log(`\n🎯 Main Resume ID: ${savedMainResume.id}`);
    console.log(`\n📋 Use this ID to test the endpoint:`);
    console.log(
      `   GET {{url}}/resume-comparison/${savedMainResume.id}/calculate?radius=1000\n`,
    );

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

console.log(`🚀 Starting generation of filtered resumes...\n`);
console.log(
  `⚠️  Note: This script uses OpenStreetMap API with 1s delay between requests.`,
);
console.log(
  `   Generating 102 resumes (1 main + 101 filtered) will take approximately ${Math.ceil((102 * 2) / 60)} minutes.\n`,
);
generateFilteredResumes();

