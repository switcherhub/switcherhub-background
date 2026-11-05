import { CompanyInterface } from 'src/company/types/company.interface';
import { FileInterface } from 'src/file-manager/file/file.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { convertSalary } from 'src/salary/convertSalary';
import { SalaryPeriodEnum } from 'src/salary/salary.enum';
import { getEnumValues } from 'src/utils/getEnumValues';
import { ViewEntity, ViewColumn, AfterLoad } from 'typeorm';

@ViewEntity({
  name: 'search_resume_vacancy_vie',
  expression: `  

  
  -- ========== Resume ==========
  SELECT 
    r."id",
    r."order",
    COALESCE(r."firstName", '') AS "title",
    NULL AS "desiredPosition",
    r."userId",
    r."firstName",
    NULL AS "lastName",
    r."isHidden",
    r."createdAt",
    r."updatedAt",
    r."deletedAt",
    NULL AS "contactPerson",
    NULL AS "contactEmail",
    NULL AS "contactPhone",
    r."salaryHourly",
    r."hoursPerMonth",
    r."isApproved",
    NULL AS "industryId",
    NULL AS "educationId",
    NULL AS "workExpirienceId",
    r."location",
    r."locationPoint",
    r."locationCity",
    r."locationArea",
    r."locationHome",
    r."lat",
    r."lng",
    NULL AS "isPremium",
    NULL AS "companyId",
    COALESCE(
      (SELECT json_agg(row_to_json(jt)) FROM (SELECT id, title FROM job_types WHERE id = r."jobTypeId") jt),
      '[]'::json
    ) AS "jobTypes",
    NULL AS "perks",
    NULL AS "benefits",
    'resume' AS "type"
  FROM resume r
  
  -- UNION ALL
  
  -- -- ========== Vacancy ==========
  -- SELECT 
  --   v."id",
  --   v."order",
  --   v."title",
  --   NULL AS "desiredPosition",
  --   v."userId",
  --   NULL AS "firstName",
  --   NULL AS "lastName",
  --   v."isHidden",
  --   v."createdAt",
  --   v."updatedAt",
  --   v."deletedAt",
  --   v."contactPerson",
  --   v."contactEmail",
  --   v."contactPhone",
  --   v."salaryHourly",
  --   v."isApproved",
  --   v."industryId",
  --   v."educationId",
  --   v."workExpirienceId",
  --   v."location",
  --   v."locationPoint",
  --   v."locationCity",
  --   v."locationArea",
  --   NULL AS "locationHome",
  --   v."lat",
  --   v."lng",
  --   v."isPremium",
  --   v."companyId",
  --   COALESCE(
  --     (
  --       SELECT json_agg(row_to_json(jt))
  --       FROM (
  --         SELECT jt.id, jt.title
  --         FROM vacancy_job_types_job_types rel
  --         JOIN job_types jt ON jt.id = rel."jobTypesId"
  --         WHERE rel."vacancyId" = v.id
  --       ) jt
  --     ),
  --     '[]'::json
  --   ) AS "jobTypes",
  --   COALESCE(
  --     (
  --       SELECT json_agg(row_to_json(p))
  --       FROM (
  --         SELECT p.id, p.title
  --         FROM vacancy_perks_perk rel
  --         JOIN perk p ON p.id = rel."perkId"
  --         WHERE rel."vacancyId" = v.id
  --       ) p
  --     ),
  --     '[]'::json
  --   ) AS "perks",
  --   COALESCE(
  --     (
  --       SELECT json_agg(row_to_json(b))
  --       FROM (
  --         SELECT b.id, b.title
  --         FROM vacancy_benefits_benefit rel
  --         JOIN benefit b ON b.id = rel."benefitId"
  --         WHERE rel."vacancyId" = v.id
  --       ) b
  --     ),
  --     '[]'::json
  --   ) AS "benefits",
  --   'vacancy' AS "type"
  -- FROM vacancy v
    `,
})
export class SearchResumeVacancyView extends ParameterBaseEntity {
  @ViewColumn() id: string;
  @ViewColumn() order: number;
  @ViewColumn() title: string;
  @ViewColumn() desiredPosition: string | null;
  @ViewColumn() userId: string;
  @ViewColumn() firstName: string | null;
  @ViewColumn() workExpirienceId: string | null;
  @ViewColumn() salaryHourly: number | null;
  @ViewColumn() hoursPerMonth: number | null;
  @ViewColumn() lastName: string | null;
  @ViewColumn() isHidden: boolean;
  @ViewColumn() createdAt: Date;
  @ViewColumn() updatedAt: Date;
  @ViewColumn() deletedAt: Date;
  @ViewColumn() contactPerson: string | null;
  @ViewColumn() contactEmail: string | null;
  @ViewColumn() contactPhone: string | null;  
  @ViewColumn() isApproved: boolean;
  @ViewColumn() industryId: string | null;
  @ViewColumn() educationId: string | null;
  @ViewColumn() location: LocationInterface | null;
  @ViewColumn() locationHome: LocationInterface | null;
  @ViewColumn() locationCity: string | null;
  @ViewColumn() locationArea: string | null;
  @ViewColumn() lat: number | null;
  @ViewColumn() lng: number | null;
  @ViewColumn()
  locationPoint: {
    type: 'Point';
    coordinates: [number, number];
  } | null;

  @ViewColumn() isPremium: boolean | null;
  @ViewColumn() companyId: string | null;
  company: CompanyInterface | null | any;
  companyLogo: FileInterface | null | any;
  @ViewColumn() jobTypes: string | null;
  @ViewColumn() perks: string | null;
  @ViewColumn() benefits: string | null;

  @ViewColumn() type: 'resume' | 'vacancy';

}
