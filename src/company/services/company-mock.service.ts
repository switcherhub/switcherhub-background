import { Injectable, OnModuleInit } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyCreateDto } from '../dto/company-create.dto';
import { faker } from '@faker-js/faker';
import { IndustryService } from 'src/industry/services/industry.service';
import { IndustryEntity } from 'src/industry/entities/industry.entity';
import { EmployeeNumberService } from 'src/employee-number/services/employee-number.service';
import { EmployeeNumberEntity } from 'src/employee-number/entities/employee-number.entity';
import { CompanyTypeEntity } from 'src/company-type/entities/company-type.entity';
import { CompanyTypeService } from 'src/company-type/services/company-type.service';

@Injectable()
export class CompanyMockService implements OnModuleInit {
  constructor(
    private readonly resumeService: CompanyService,
    private readonly industryService: IndustryService,
    private readonly companyTypeService: CompanyTypeService,
    private readonly employeeService: EmployeeNumberService,
  ) {}

  industries: IndustryEntity[] = [];
  companyTypes: CompanyTypeEntity[] = [];
  employees: EmployeeNumberEntity[] = [];

  async onModuleInit() {
    this.industries = (await this.industryService.find(1)).data;
    this.companyTypes = (await this.companyTypeService.find(1)).data;
    this.employees = (await this.employeeService.find(1)).data;
  }

  async generateMockResumes(count: number): Promise<CompanyCreateDto[]> {
    const resumes = [];
    for (let i = 0; i < count; i++) {
      const resume = await this.generateMockResume();

      await this.resumeService.create(resume);

      resumes.push(resume);
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

  randomSocialLink = () => {
    const socialNetworks = [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'linkedin.com',
    ];
    return `https://${faker.helpers.arrayElement(socialNetworks)}/${faker.internet.userName()}`;
  };

  async generateMockResume(): Promise<CompanyCreateDto> {
    const industryId =
      this.industries[Math.floor(Math.random() * this.industries.length)]?.id;
    const companyId =
      this.companyTypes[Math.floor(Math.random() * this.companyTypes.length)]
        ?.id;
    const employeeNumberId =
      this.employees[Math.floor(Math.random() * this.employees.length)]?.id;

    const coords = faker.location.nearbyGPSCoordinate({
      origin: [38.267408, -86.625181],
      radius: 100,
    });

    const location = await this.getLocationByCoordinates(coords[0], coords[1]);

    const deletedDate =
      faker.number.int({ min: 1, max: 3 }) == 1 ? faker.date.past() : null;

    const socialNetworks = faker.helpers.arrayElements(
      [faker.internet.url(), faker.internet.url(), faker.internet.url()],
      faker.number.int({ min: 0, max: 2 }),
    );
    const registrationCode = faker.string.numeric(8);

    const r = {
      id: undefined,
      name: faker.company.name(),

      companyTypeId: companyId,
      registrationNumber: registrationCode,

      industryId: industryId,
      contactPerson: faker.person.fullName(),
      contactEmail: faker.internet.email(),
      contactPhone: faker.phone.number({
        style: 'international',
      }),
      location: location,

      employeeNumberId: employeeNumberId,
      establishmentYear: faker.date.past().getFullYear().toString(),
      website: faker.internet.url(),
      socialNetworks: socialNetworks,
      description: faker.lorem.text(),

      isHidden: faker.datatype.boolean(),
      isApproved: faker.datatype.boolean(0.5),

      deletedAt: deletedDate,

      logo: undefined,
      photos: [],

      title: undefined,
      order: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      employeeNumber: undefined,
      companyType: undefined,
      industry: undefined,
      user: undefined,
    };

    return r;
  }
}
