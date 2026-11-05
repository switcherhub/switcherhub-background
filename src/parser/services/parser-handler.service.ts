import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ParserService } from './parser.service';
import { ParserWebhookDto } from '../dto/parser-webhook.dto';
import { ParserResponse } from '../dto/parser-response.dto';
import axios from 'axios';
import { VacancyCreateDto } from 'src/vacancy/dto/vacancy-create.dto';
import { LocationInterface } from 'src/location/types/location.interface';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { VacancyService } from 'src/vacancy/services/vacancy.service';
import { VacancyUpdateDto } from 'src/vacancy/dto/vacancy-update.dto';
import { SalaryTypeEnum } from 'src/salary/salary-type.enum';

@Injectable()
export class ParserHandlerService {
  constructor(
    private readonly parserService: ParserService,
    private readonly vacancyService: VacancyService,
  ) {}

  onModuleInit() {
    this.checkForStuckParsers();
  }

  async handleWebhook(body: ParserWebhookDto): Promise<void> {
    const { brands } = body;

    for (const brand of brands) {
      try {
        const { brand: brandName, new: newJobs, inactive } = brand;

        this.importDataByBrand(brandName);
      } catch (error) {
        console.error(`Error processing brand ${brand.brand}:`, error);
      }
    }
  }

  async processParser(id: string) {
    const parser = await this.parserService.findOneOrFail(id);

    if (parser.isProcessing) {
      throw new BadRequestException('Parser is already processing');
    }

    this.importDataByBrand(parser.brand, true);

    return {
      message: 'Parser processing started',
      id: parser.id,
    };
  }

  async importDataByBrand(
    brand: string,
    refreshing: boolean = false,
  ): Promise<any> {
    let addedCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    try {
      console.log(`Importing data for brand: ${brand}`);

      const parser = await this.parserService.findByBrandOrFail(brand);

      parser.isProcessing = true;
      parser.startProcessingAt = new Date();

      if (refreshing) {
        parser.totalParsedCount = 0;
        parser.lastAddedCount = 0;
        parser.lastUpdatedCount = 0;
        parser.lastDeletedCount = 0;
        parser.lastProcessedAt = null;
      }

      await this.parserService.save(parser.id, parser);

      console.log(`Parser found for brand: ${parser.brand}`);

      let page = 0;

      // new vacancies
      while (true) {
        try {
          const vacancies = await this.fetchVacancies(
            brand,
            page,
            refreshing ? 'new-active' : 'new',
            refreshing ? 'jobs' : 'exported-jobs',
          );

          if (!vacancies.data || vacancies.data.length === 0) {
            console.log(`No more vacancies found on page ${page}. Stopping.`);
            break;
          }

          console.log(
            `Processing page ${page}, found ${vacancies.data.length} vacancies.`,
          );

          for (const vacancy of vacancies.data) {
            try {
              console.log(`Processing vacancy: ${vacancy.id}`);

              if (!vacancy.title || !vacancy.page_url) {
                continue;
              }

              const location: LocationInterface = {
                country: vacancy.country_code,
                city: vacancy.city,
                state: vacancy.state,
                address: vacancy.address,
                zipCode: vacancy.zip,
                lng: Number(vacancy.lng),
                lat: Number(vacancy.lat),
                area: vacancy.borough,
              };

              const salaryPeriod = SalaryPeriodEnum.HOURLY;

              let minSalaryRange = null;
              let maxSalaryRange = null;
              let salaryType = SalaryTypeEnum.NONE;

              if (Number(vacancy.salary_from) && Number(vacancy.salary_to)) {
                minSalaryRange = Number(vacancy.salary_from);
                maxSalaryRange = Number(vacancy.salary_to);
                salaryType = SalaryTypeEnum.RANGE;
              } else if (Number(vacancy.salary_from)) {
                minSalaryRange = Number(vacancy.salary_from);
                salaryType = SalaryTypeEnum.EXACTLY;
              }

              const afterMonthDate = new Date();
              afterMonthDate.setMonth(afterMonthDate.getMonth() + 1);

              const createDto: VacancyCreateDto = {
                salaryType,
                parserId: vacancy.id.toString(),
                title: vacancy.title,
                industryId: parser.company.industryId,
                minSalaryRange,
                maxSalaryRange,
                salaryPeriod,
                description: vacancy.job_details
                  ? vacancy.job_details
                  : parser.description || '',
                location,
                applicationLink: vacancy.page_url,
                companyId: parser.company.id,
                departament: null,
                contactPerson: parser.company.contactPerson,
                contactEmail: parser.company.contactEmail,
                contactPhone: parser.company.contactPhone,
                responsibilities: null,
                requirements: null,
                workExpirienceId: null,
                jobTypes: parser.jobTypes,
                perks: parser.perks,
                benefits: parser.benefits,
                educationId: parser.educationId,
                expirationDate: afterMonthDate,
                user: parser.company.user,
                isHidden: false,
                showedContacts: 0,
                views: 0,
                chatsStarted: 0,
                reviews: 0,
                isApproved: true,
                noteDeletion: '',
                industry: undefined,
                company: undefined,
                workExpirience: undefined,
                education: undefined,
                id: undefined,
                order: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                deletedAt: undefined,
                allowChat: false,
                isPremium: false,
              };

              const existingVacancy = await this.vacancyService.findByField(
                'parserId',
                vacancy.id.toString(),
              );

              if (existingVacancy && existingVacancy.length > 0) {
                console.log(
                  `Vacancy ${vacancy.id}, ${existingVacancy[0].id} already exists. Updating...`,
                );
                await this.vacancyService.updateOne(
                  existingVacancy[0].id,
                  createDto as VacancyUpdateDto,
                );
                updatedCount++;
              } else {
                console.log(
                  `Vacancy ${vacancy.id} does not exist. Creating...`,
                );
                this.vacancyService.create(createDto);
                addedCount++;
              }
            } catch (error) {
              console.error(`Error processing vacancy ${vacancy.id}:`, error);
            }
          }

          page++;
        } catch (error) {
          console.error(`Error fetching vacancies for brand ${brand}:`, error);
          break;
        }
      }

      page = 0;
      // inactive vacancies
      while (true && !refreshing) {
        try {
          const vacancies = await this.fetchVacancies(
            brand,
            page,
            'inactive',
            'exported-jobs',
          );

          if (!vacancies.data || vacancies.data.length === 0) {
            console.log(
              `Del No more vacancies found on page ${page}. Stopping.`,
            );
            break;
          }

          console.log(
            `Del Processing page ${page}, found ${vacancies.data.length} vacancies.`,
          );

          for (const vacancy of vacancies.data) {
            try {
              console.log(`Del Processing vacancy: ${vacancy.id}`);
              const existingVacancy = await this.vacancyService.findOneByField(
                'parserId',
                vacancy.id.toString(),
              );

              if (!existingVacancy) {
                console.log(
                  `Vacancy ${vacancy.id} does not exist. Skipping...`,
                );
                continue;
              }

              await this.vacancyService.delete(existingVacancy.id);
              deletedCount++;
            } catch (error) {
              console.error(`Error processing vacancy ${vacancy.id}:`, error);
            }
          }

          page++;
        } catch (error) {
          console.error(`Error fetching vacancies for brand ${brand}:`, error);
          break;
        }
      }
    } catch (error) {
      console.error(`Error importing data for brand ${brand}:`, error);
      throw new BadRequestException(
        `Error importing data for brand ${brand}: ${error.message}`,
      );
    } finally {
      const parser = await this.parserService.findByBrandOrFail(brand);

      parser.isProcessing = false;
      parser.lastProcessedAt = new Date();
      parser.startProcessingAt = null;

      parser.lastAddedCount = addedCount;
      parser.lastUpdatedCount = updatedCount;
      parser.lastDeletedCount = deletedCount;

      parser.totalParsedCount =
        parser.totalParsedCount + addedCount - deletedCount;

      await this.parserService.save(parser.id, parser);
    }
  }

  async fetchVacancies(
    brand: string,
    page: number,
    status: 'new' | 'inactive' | 'new-active',
    jobs: 'exported-jobs' | 'jobs',
    limit: number = 1000,
  ): Promise<ParserResponse> {
    try {
      const result = await axios.get<ParserResponse>(
        `http://161.35.99.0:5000/api/v1/${jobs}/${status}?brand=${brand}&limit=${limit}&offset=${page * limit}`,
        {
          headers: {
            'x-api-key': 'dfgvfsvfsd2544125csa',
          },
        },
      );

      console.log(
        `Fetched ${result.data.data.length} vacancies for brand: ${brand}`,
      );

      return result.data;
    } catch (error) {
      throw new BadRequestException(
        `Error fetching vacancies for brand ${brand}: ${error.message}`,
      );
    }
  }

  async checkForStuckParsers() {
    const parsers = await this.parserService.findAll();
    console.log('Checking for stuck parsers...');
    for (const parser of parsers) {
      if (parser.isProcessing) {
        const currentTime = new Date();
        const processingDuration = Math.abs(
          currentTime.getTime() - parser.startProcessingAt.getTime(),
        );

        if (processingDuration > 20 * 60 * 1000) {
          console.log(
            `Parser ${parser.brand} has been processing for more than 5 minutes. Stopping.`,
          );
          parser.isProcessing = false;
          await this.parserService.save(parser.id, parser);
        }
      }
    }
  }
}
