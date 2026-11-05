import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { ResumeCreateDto } from '../dto/resume-create.dto';
import { faker } from '@faker-js/faker';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { JobCoreService } from 'src/job-core/services/job-core.service';
import { JobCoreEntity } from 'src/job-core/entities/job-core.entity';
import { WorkEnvironmentService } from 'src/work-environment/services/work-environment.service';
import { WorkEnvironmentEntity } from 'src/work-environment/entities/work-environment.entity';
import { ShiftTypeService } from 'src/shift-type/services/shift-type.service';
import { ShiftTypeEntity } from 'src/shift-type/entities/shift-type.entity';
import { LocationTenureService } from 'src/location-tenure/services/location-tenure.service';
import { LocationTenureEntity } from 'src/location-tenure/entities/location-tenure.entity';
import { SameRoleCountService } from 'src/same-role-count/services/same-role-count.service';
import { SameRoleCountEntity } from 'src/same-role-count/entities/same-role-count.entity';
import { TimeToStartWorkingService } from 'src/time-to-start-working/services/time-to-start-working.service';
import { TimeToStartWorkingEntity } from 'src/time-to-start-working/entities/time-to-start-working.entity';
import { LicenseRequiredService } from 'src/license-required/services/license-required.service';
import { LicenseRequiredEntity } from 'src/license-required/entities/license-required.entity';
import { JobTypeService } from 'src/job-type/services/job-type.service';
import { JobTypeEntity } from 'src/job-type/entities/job-type.entity';

@Injectable()
export class ResumeMockService implements OnModuleInit {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly jobCoreService: JobCoreService,
    private readonly jobTypeService: JobTypeService,
    private readonly workEnvironmentService: WorkEnvironmentService,
    private readonly shiftTypeService: ShiftTypeService,
    private readonly locationTenureService: LocationTenureService,
    private readonly sameRoleCountService: SameRoleCountService,
    private readonly timeToStartWorkingService: TimeToStartWorkingService,
    private readonly licenseRequiredService: LicenseRequiredService,
  ) {}

  jobCores: JobCoreEntity[] = [];
  jobTypes: JobTypeEntity[] = [];
  workEnvironments: WorkEnvironmentEntity[] = [];
  shiftTypes: ShiftTypeEntity[] = [];
  locationTenures: LocationTenureEntity[] = [];
  sameRoleCounts: SameRoleCountEntity[] = [];
  timeToStartWorkings: TimeToStartWorkingEntity[] = [];
  licenseRequireds: LicenseRequiredEntity[] = [];

  async onModuleInit() {
    this.jobCores = (await this.jobCoreService.find(1)).data;
    this.jobTypes = await this.jobTypeService.findAll();
    this.workEnvironments = (await this.workEnvironmentService.find(1)).data;
    this.shiftTypes = (await this.shiftTypeService.find(1)).data;
    this.locationTenures = (await this.locationTenureService.find(1)).data;
    this.sameRoleCounts = (await this.sameRoleCountService.find(1)).data;
    this.timeToStartWorkings = (
      await this.timeToStartWorkingService.find(1)
    ).data;
    this.licenseRequireds = (await this.licenseRequiredService.find(1)).data;
  }

  async generateMockResumes(count: number): Promise<ResumeCreateDto[]> {
    const resumes = [];
    for (let i = 0; i < count; i++) {
      const resume = await this.generateMockResume();

      const newResume = await this.resumeService.create(resume);

      resumes.push(newResume);
    }
    return resumes;
  }

  async getLocationByCoordinates(lat: number, lon: number) {
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

  async generateMockResume(): Promise<ResumeCreateDto> {
    const jobCoreId =
      this.jobCores[Math.floor(Math.random() * this.jobCores.length)]?.id;
    const jobTypeId =
      this.jobTypes[Math.floor(Math.random() * this.jobTypes.length)]?.id;
    const workEnvironmentId =
      this.workEnvironments[
        Math.floor(Math.random() * this.workEnvironments.length)
      ]?.id;
    const shiftTypeId =
      this.shiftTypes[Math.floor(Math.random() * this.shiftTypes.length)]?.id;
    const locationTenureId =
      this.locationTenures[
        Math.floor(Math.random() * this.locationTenures.length)
      ]?.id;
    const sameRoleCountId =
      this.sameRoleCounts[
        Math.floor(Math.random() * this.sameRoleCounts.length)
      ]?.id;
    const timeToStartWorkingId =
      this.timeToStartWorkings[
        Math.floor(Math.random() * this.timeToStartWorkings.length)
      ]?.id;
    const licenseRequiredId =
      this.licenseRequireds[
        Math.floor(Math.random() * this.licenseRequireds.length)
      ]?.id;

    const userRole =
      Math.random() > 0.5 ? UserRoleEnum.CANDIDATE : UserRoleEnum.SWITCHER;
    let location = undefined;
    let homeLocation = undefined;
    if (userRole === UserRoleEnum.SWITCHER) {
      const coords = faker.location.nearbyGPSCoordinate({
        origin: [38.267408, -86.625181],
        radius: 100,
      });

      location = await this.getLocationByCoordinates(coords[0], coords[1]);

      const homeCoords = faker.location.nearbyGPSCoordinate({
        origin: [location.lat, location.lng],
        radius: 40,
      });

      homeLocation = await this.getLocationByCoordinates(
        homeCoords[0],
        homeCoords[1],
      );
    }

    const noteDeletions = [
      'Found a job',
      'Did not find a job',
      'No longer looking for a job',
      'Using another platform for job search',
      'Privacy concerns',
    ];
    const deletedDate =
      faker.number.int({ min: 1, max: 3 }) == 1 ? faker.date.past() : null;
    const noteDeletion = deletedDate
      ? faker.helpers.arrayElement(noteDeletions)
      : null;

    return {
      deletedAt: null,
      noteDeletion: noteDeletion,
      user: null,
      firstName: faker.person.firstName(),
      salaryHourly: faker.number.int({ min: 3, max: 30, multipleOf: 1 }),
      hoursPerMonth: faker.number.int({ min: 20, max: 160 }),
      allowChat: faker.datatype.boolean(),
      location: location,
      locationHome: homeLocation,
      jobCoreId,
      jobTypeId,
      workEnvironmentId,
      shiftTypeId,
      locationTenureId,
      sameRoleCountId,
      timeToStartWorkingId,
      licenseRequiredId,

      jobCore: undefined,
      jobType: undefined,
      workEnvironment: undefined,
      shiftType: undefined,
      locationTenure: undefined,
      sameRoleCount: undefined,
      timeToStartWorking: undefined,
      licenseRequired: undefined,

      isApproved: faker.datatype.boolean(0.5),
      isActive: true,

      title: '',
      isHidden: faker.datatype.boolean(),
      id: undefined,
      order: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      showedContacts: undefined,
      views: undefined,
      chatsStarted: undefined,
      reviews: undefined,

      // Auto-calculated fields (not in DTO)
      commuteDistanceKm: undefined,
      commuteDurationSeconds: undefined,
    };
  }
}
