import { Injectable, OnModuleInit } from '@nestjs/common';
import { VacancyService } from './vacancy.service';
import { VacancyCreateDto } from '../dto/vacancy-create.dto';
import { faker, th } from '@faker-js/faker';
import { JobTypeService } from 'src/job-type/services/job-type.service';
import { IndustryService } from 'src/industry/services/industry.service';
import { EducationService } from 'src/education/services/education.service';
import { JobTypeEntity } from 'src/job-type/entities/job-type.entity';
import { IndustryEntity } from 'src/industry/entities/industry.entity';
import { EducationEntity } from 'src/education/entities/education.entity';
import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { CompanyService } from 'src/company/services/company.service';
import { PerkService } from 'src/perk/services/perk.service';
import { WorkExpirianceService } from 'src/work-expiriance/services/work-expiriance.service';
import { CompanyEntity } from 'src/company/entities/company.entity';
import { PerkEntity } from 'src/perk/entities/perk.entity';
import { WorkExpirianceEntity } from 'src/work-expiriance/entities/work-expiriance.entity';
import { BenefitEntity } from 'src/benefit/entities/benefit.entity';
import { BenefitService } from 'src/benefit/services/benefit.service';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

@Injectable()
export class VacancyMockService implements OnModuleInit {
  constructor(
    private readonly resumeService: VacancyService,
    private readonly jobTypeService: JobTypeService,
    private readonly industryService: IndustryService,
    private readonly comanyService: CompanyService,
    private readonly perkService: PerkService,
    private readonly workExpirianceService: WorkExpirianceService,
    private readonly benefitService: BenefitService,
    private readonly educationService: EducationService,
  ) {}

  jobTypes: JobTypeEntity[] = [];
  industries: IndustryEntity[] = [];
  companies: CompanyEntity[] = [];
  perks: PerkEntity[] = [];
  benefits: BenefitEntity[] = [];
  workExpirienses: WorkExpirianceEntity[] = [];
  educations: EducationEntity[] = [];

  async onModuleInit() {
    this.jobTypes = await this.jobTypeService.findAll();
    this.industries = await this.industryService.findAll();
    this.companies = await this.comanyService.findAll();
    this.workExpirienses = await this.workExpirianceService.findAll();
    this.perks = await this.perkService.findAll();
    this.benefits = await this.benefitService.findAll();
    this.educations = await this.educationService.findAll();
  }

  async generateMockResumes(count: number): Promise<VacancyCreateDto[]> {
    const resumes = [];
    for (let i = 0; i < count; i++) {
      const resume = await this.generateMock();

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

  async generateMock(): Promise<VacancyCreateDto> {
    const jobTypeId =
      this.jobTypes[Math.floor(Math.random() * this.jobTypes.length)]?.id;
    const industryId =
      this.industries[Math.floor(Math.random() * this.industries.length)]?.id;
    const educationId =
      this.educations[Math.floor(Math.random() * this.educations.length)]?.id;

    const workExprienceId =
      this.workExpirienses[
        Math.floor(Math.random() * this.workExpirienses.length)
      ]?.id;

    const companyId =
      this.companies[Math.floor(Math.random() * this.companies.length)]?.id;

    const perkId =
      this.perks[Math.floor(Math.random() * this.perks.length)]?.id;
    const benefitId =
      this.benefits[Math.floor(Math.random() * this.benefits.length)]?.id;
    const userRole =
      Math.random() > 0.5 ? UserRoleEnum.CANDIDATE : UserRoleEnum.SWITCHER;
    const coords = faker.location.nearbyGPSCoordinate({
      origin: [38.267408, -86.625181],
      radius: 100,
    });

    let location = await this.getLocationByCoordinates(coords[0], coords[1]);
    if (userRole === UserRoleEnum.SWITCHER) {
      const coords = faker.location.nearbyGPSCoordinate({
        origin: [38.267408, -86.625181],
        radius: 100,
      });

      location = await this.getLocationByCoordinates(coords[0], coords[1]);
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

    const mocked: VacancyCreateDto = {
      salaryType: faker.helpers.arrayElement([
        SalaryTypeEnum.EXACTLY,
        SalaryTypeEnum.RANGE,
        SalaryTypeEnum.NONE,
      ]),
      isPremium: false,
      parserId: null,
      perks: [
        {
          id: perkId,
          title: '',
          order: 0,
          isHidden: false,
          createdAt: undefined,
          updatedAt: undefined,
          deletedAt: undefined,
        },
      ],
      benefits: [
        {
          id: benefitId,
          title: '',
          order: 0,
          isHidden: false,
          createdAt: undefined,
          updatedAt: undefined,
          deletedAt: undefined,
        },
      ],
      workExpirienceId: workExprienceId,
      companyId: companyId,
      educationId: educationId,
      deletedAt: deletedDate,
      noteDeletion: noteDeletion,
      user: null,
      contactEmail: faker.internet.email(),
      contactPhone: faker.phone.number({
        style: 'international',
      }),
      salaryPeriod: SalaryPeriodEnum.HOURLY,
      minSalaryRange: faker.number.int({ min: 3, max: 30, multipleOf: 1 }),
      maxSalaryRange: faker.number.int({ min: 35, max: 50, multipleOf: 1 }),
      departament: faker.commerce.department(),

      allowChat: faker.datatype.boolean(),
      expirationDate: faker.date.future(),
      location: location,

      jobTypes: [
        {
          id: jobTypeId,
        },
      ],
      industryId,

      industry: undefined,

      isApproved: faker.datatype.boolean(0.5),

      title: faker.person.jobTitle(),
      isHidden: false,
      id: undefined,
      order: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      showedContacts: undefined,
      views: undefined,
      chatsStarted: undefined,
      reviews: undefined,
      description: faker.lorem.lines(),

      responsibilities: faker.lorem.lines(),
      requirements: faker.lorem.lines(),
      applicationLink: faker.internet.url(),
      contactPerson: faker.person.fullName(),
      company: undefined,
      workExpirience: undefined,
      education: undefined,
    };

    return mocked;
  }
}
