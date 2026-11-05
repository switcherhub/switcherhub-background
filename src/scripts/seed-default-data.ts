import 'reflect-metadata';
import { AppDataSource } from '../database/config';
import { JobCoreEntity } from '../job-core/entities/job-core.entity';
import { WorkEnvironmentEntity } from '../work-environment/entities/work-environment.entity';
import { ShiftTypeEntity } from '../shift-type/entities/shift-type.entity';
import { LocationTenureEntity } from '../location-tenure/entities/location-tenure.entity';
import { SameRoleCountEntity } from '../same-role-count/entities/same-role-count.entity';
import { TimeToStartWorkingEntity } from '../time-to-start-working/entities/time-to-start-working.entity';
import { LicenseRequiredEntity } from '../license-required/entities/license-required.entity';

const jobCoreData = [
  'Cashier',
  'Retail Associate',
  'Customer Service Associate',
  'Grocery Clerk',
  'Stocker (Retail)',
  'Line Cook',
  'Food Prep Worker',
  'Dishwasher',
  'Housekeeping Staff (Hotels)',
  'Hotel Service Staff (Porter / Bell / Attendant)',
  'Warehouse Associate',
  'Picker / Packer',
  'Stock Associate (Warehouse)',
  'Loader / Unloader',
  'Forklift Operator (Entry-level)',
  'Production Worker',
  'Assembly Worker',
  'Machine Operator (Entry-level)',
  'Packaging Worker',
  'Cleaner / Janitor',
  'Laundry Worker (Commercial / Hotel)',
  'Custodial Staff (Facilities)',
  'Maintenance Worker (General)',
  'Facilities Assistant',
  'Security Guard',
  'Loss Prevention Associate',
  'Office Assistant',
  'Data Entry Clerk',
  'Call Center Agent',
  'Landscaper / Grounds Worker',
  'Outdoor Maintenance Worker',
  'Delivery Driver (Non-CDL)',
  'Courier / Route Driver',
  'General Laborer',
  'Car Wash Attendant',
];

const workEnvironmentData = [
  'Retail / Customer-facing',
  'Food Service & Hospitality',
  'Warehouse & Logistics',
  'Production / Light Manufacturing',
  'Cleaning & Facilities',
  'Maintenance',
  'Security & Safety',
  'Office / Back-office (Entry-level)',
  'Landscaping & Outdoor',
  'Delivery & Transport (Non-CDL)',
  'General / Specialty Hourly',
];

const shiftTypeData = [
  'Day',
  'Evening',
  'Night',
  'Rotating / Variable',
];

const locationTenureData = [
  'Less than 1 month',
  '1–6 months',
  '6–12 months',
  '1+ year',
];

const sameRoleCountData = [
  '1–2',
  '3–5',
  '6–10',
  '10+',
];

const timeToStartWorkingData = [
  '1–3 days',
  '1–2 weeks',
  '1+ month',
];

const licenseRequiredData = [
  'yes',
  'no',
];

async function seedData() {
  try {
    console.log('🔄 Initializing database connection...');
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');

    const jobCoreRepository = AppDataSource.getRepository(JobCoreEntity);
    const workEnvironmentRepository = AppDataSource.getRepository(WorkEnvironmentEntity);
    const shiftTypeRepository = AppDataSource.getRepository(ShiftTypeEntity);
    const locationTenureRepository = AppDataSource.getRepository(LocationTenureEntity);
    const sameRoleCountRepository = AppDataSource.getRepository(SameRoleCountEntity);
    const timeToStartWorkingRepository = AppDataSource.getRepository(TimeToStartWorkingEntity);
    const licenseRequiredRepository = AppDataSource.getRepository(LicenseRequiredEntity);

    // Seed Job Core
    console.log('🌱 Seeding Job Core data...');
    for (let i = 0; i < jobCoreData.length; i++) {
      const existing = await jobCoreRepository.findOne({
        where: { title: jobCoreData[i] },
      });
      if (!existing) {
        await jobCoreRepository.save({
          title: jobCoreData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${jobCoreData.length} Job Core items`);

    // Seed Work Environment
    console.log('🌱 Seeding Work Environment data...');
    for (let i = 0; i < workEnvironmentData.length; i++) {
      const existing = await workEnvironmentRepository.findOne({
        where: { title: workEnvironmentData[i] },
      });
      if (!existing) {
        await workEnvironmentRepository.save({
          title: workEnvironmentData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${workEnvironmentData.length} Work Environment items`);

    // Seed Shift Type
    console.log('🌱 Seeding Shift Type data...');
    for (let i = 0; i < shiftTypeData.length; i++) {
      const existing = await shiftTypeRepository.findOne({
        where: { title: shiftTypeData[i] },
      });
      if (!existing) {
        await shiftTypeRepository.save({
          title: shiftTypeData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${shiftTypeData.length} Shift Type items`);

    // Seed Location Tenure
    console.log('🌱 Seeding Location Tenure data...');
    for (let i = 0; i < locationTenureData.length; i++) {
      const existing = await locationTenureRepository.findOne({
        where: { title: locationTenureData[i] },
      });
      if (!existing) {
        await locationTenureRepository.save({
          title: locationTenureData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${locationTenureData.length} Location Tenure items`);

    // Seed Same Role Count
    console.log('🌱 Seeding Same Role Count data...');
    for (let i = 0; i < sameRoleCountData.length; i++) {
      const existing = await sameRoleCountRepository.findOne({
        where: { title: sameRoleCountData[i] },
      });
      if (!existing) {
        await sameRoleCountRepository.save({
          title: sameRoleCountData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${sameRoleCountData.length} Same Role Count items`);

    // Seed Time To Start Working
    console.log('🌱 Seeding Time To Start Working data...');
    for (let i = 0; i < timeToStartWorkingData.length; i++) {
      const existing = await timeToStartWorkingRepository.findOne({
        where: { title: timeToStartWorkingData[i] },
      });
      if (!existing) {
        await timeToStartWorkingRepository.save({
          title: timeToStartWorkingData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${timeToStartWorkingData.length} Time To Start Working items`);

    // Seed License Required
    console.log('🌱 Seeding License Required data...');
    for (let i = 0; i < licenseRequiredData.length; i++) {
      const existing = await licenseRequiredRepository.findOne({
        where: { title: licenseRequiredData[i] },
      });
      if (!existing) {
        await licenseRequiredRepository.save({
          title: licenseRequiredData[i],
          order: i,
          isHidden: false,
        });
      }
    }
    console.log(`✅ Seeded ${licenseRequiredData.length} License Required items`);

    console.log('✅ All data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the seed script
seedData()
  .then(() => {
    console.log('🎉 Seed script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

