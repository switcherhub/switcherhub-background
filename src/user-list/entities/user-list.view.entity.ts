import { ParameterBaseEntity } from 'src/parameter/entities/parameter.entity';
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'user_list_view',
  expression: `
  -- SELECT
  -- ul."id",
  -- ul."type",
  -- ul."userId",
  -- ul."entityType",
  -- ul."entityId",
  -- ul."deletedAt",
  -- v."title",
  -- v."title" as "name",
  -- NULL AS "desiredPosition",
  -- NULL AS "firstName",
  -- NULL AS "lastName",
  -- v."location",
  -- v."salaryHourly",
  -- (
  --   SELECT json_agg(json_build_object('id', j."id", 'title', j."title"))
  --   FROM job_types j
  --   JOIN vacancy_job_types_job_types rj ON j.id = rj."jobTypesId"
  --   WHERE rj."vacancyId" = v.id
  -- ) AS "jobTypes",
  -- (
  --   SELECT json_build_object(
  --     'isHidden', c."isHidden",
  --     'name', c."name",
  --     'isApproved', c."isApproved",
  --     'logo', (
  --       SELECT json_build_object(
  --         'path', l."path",
  --         'url', CONCAT('${process.env.FILE_BASE_URL}', l."path")
  --       )
  --       FROM files l
  --       WHERE l."id" = c."logoId"
  --     )
  --   )
  --   FROM company c
  --   WHERE c."id" = v."companyId"
  -- ) AS "company",
  -- v."industryId",
  -- v."salaryHourly",
  -- v."createdAt",
  -- v."contactPerson",
  -- v."contactEmail",
  -- v."contactPhone",
  -- v."isPremium",
  -- ul."createdAt" as "userListCreatedAt"
  -- FROM user_list ul
  -- JOIN vacancy v ON ul."entityType" = 'vacancy' AND ul."entityId" = v.id
  -- LEFT JOIN company c ON v."companyId" = c.id

  -- UNION ALL

SELECT
  ul."id",
  ul."type",
  ul."userId",
  ul."entityType",
  ul."entityId",
  ul."deletedAt",
  COALESCE(r."firstName", '') as "title",
  COALESCE(r."firstName", '') as "name",
  NULL AS "desiredPosition",
  r."firstName",
  NULL AS "lastName",
  r."location",
  r."salaryHourly",
  r."hoursPerMonth",
  COALESCE(
    (SELECT json_agg(row_to_json(jt)) FROM (SELECT id, title FROM job_types WHERE id = r."jobTypeId") jt),
    '[]'::json
  ) AS "jobTypes",  
  NULL AS "company",
  NULL AS "industryId",
  r."createdAt",
  NULL AS "contactPerson",
  NULL AS "contactEmail",
  NULL AS "contactPhone",
  NULL AS "isPremium",
  ul."createdAt" as "userListCreatedAt"
FROM user_list ul
JOIN resume r ON ul."entityType" = 'resume' AND ul."entityId" = r.id

UNION ALL

SELECT
  ul."id",
  ul."type",
  ul."userId",
  ul."entityType",
  ul."entityId",
  ul."deletedAt",
  c."name" as "title",
  c."name",
  NULL AS "desiredPosition",
  NULL AS "firstName",
  NULL AS "lastName",
  c."location",
  NULL AS "salaryHourly",
  NULL AS "hoursPerMonth",
  NULL AS "jobTypes",
  NULL AS "company",
  c."industryId", 
  c."createdAt",
  c."contactPerson",
  c."contactEmail",
  c."contactPhone",
  NULL as "isPremium",
  ul."createdAt" as "userListCreatedAt"
FROM user_list ul
JOIN company c ON ul."entityType" = 'company' AND ul."entityId" = c.id
    `,
})
export class UserListViewEntity extends ParameterBaseEntity {
  @ViewColumn() id: string;
  @ViewColumn() userId: string;
  @ViewColumn() type: string;
  @ViewColumn() entityType: string;
  @ViewColumn() entityId: string;
  @ViewColumn() title: string;
  @ViewColumn() desiredPosition: string | null;
  @ViewColumn() firstName: string | null;
  @ViewColumn() lastName: string | null;
  @ViewColumn() name: string;
  @ViewColumn() location: any;
  @ViewColumn() salaryHourly: number | null;
  @ViewColumn() hoursPerMonth: number | null;
  @ViewColumn() industryId: string | null;
  @ViewColumn() contactPerson: string | null;
  @ViewColumn() contactEmail: string | null;
  @ViewColumn() contactPhone: string | null;
  @ViewColumn() jobTypes: any[] | null;
  @ViewColumn() company: any;
  @ViewColumn() isPremium: boolean | null;
  @ViewColumn() createdAt: Date;
  @ViewColumn() deletedAt: Date;
  @ViewColumn() userListCreatedAt: Date;

}
