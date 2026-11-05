// import {
//   BadRequestException,
//   ForbiddenException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';

// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { ResumeEntity } from '../entities/resume.entity';
// import { ParameterBaseService } from 'src/parameter/services/parameter.service';
// import { TypeOrmSelectService } from 'src/typeorm-select/typeorm-select.service';
// import { ResumeCreateDto } from '../dto/resume-create.dto';
// import { convertSalary } from 'src/salary/convertSalary';
// import { SalaryPeriodEnum } from 'src/salary/salary.enum';
// import { FilterResponseInterface } from 'src/utils/filter-response.interface';
// import { IFilterQuery } from 'typeorm-dynamic-filters';
// import { getEnumValues } from 'src/utils/getEnumValues';
// import { DeleteResult } from 'src/utils/types/delete-result';
// import { isUUID } from 'class-validator';

// @Injectable()
// export class ResumeHistoryService {
//   constructor(
//     @InjectRepository(ResumeEntity)
//     private readonly repository: Repository<ResumeEntity>,
//     genericSearch: TypeOrmSelectService<ResumeEntity>,
//   ) {
//     super(repository, genericSearch);
//   }

//   async findHistory(): Promise<ResumeEntity[]> {}
// }
