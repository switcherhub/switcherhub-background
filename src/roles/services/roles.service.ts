import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import { RoleCategoryEntity } from '../entities/role-category.entity';
import { ROLE_CATEGORIES, ROLES } from '../data/taxonomy.seed';
import {
  RoleSupportStatusEnum,
  TAXONOMY_VERSION,
} from '../types/role-support-status.enum';
import { ResumeEntity } from 'src/resume/entities/resume.entity';

export interface RoleSearchResult {
  roleId: string;
  title: string;
  categoryId: string;
  supportStatus: RoleSupportStatusEnum;
  requiresClarification: boolean;
  variants: string[];
}

/** Lowercase, collapse whitespace — used for case/space-insensitive search (spec §3.2.2). */
function normalize(value: string): string {
  return (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(RoleCategoryEntity)
    private readonly categoryRepo: Repository<RoleCategoryEntity>,
    @InjectRepository(ResumeEntity)
    private readonly resumeRepo: Repository<ResumeEntity>,
  ) {}

  /**
   * Migrate existing resumes to the new taxonomy (spec §13). Unambiguous legacy
   * titles map automatically; ambiguous/unknown are marked `rolePendingReview`.
   * Dry-run reports counts without writing. Idempotent (skips already-set roleKey).
   */
  async migrateResumeTaxonomy(dryRun = true): Promise<{
    dryRun: boolean;
    total: number;
    alreadySet: number;
    mapped: number;
    pending: number;
    taxonomyVersion: string;
    unresolvedSamples: string[];
  }> {
    const resumes = await this.resumeRepo.find({ relations: ['jobCore'] });
    let alreadySet = 0;
    let mapped = 0;
    let pending = 0;
    const unresolvedSamples: string[] = [];

    for (const r of resumes) {
      if (r.roleKey) {
        alreadySet++;
        continue;
      }
      const title = (r.jobCore as { title?: string } | null)?.title ?? '';
      const role = await this.resolveRoleByTitle(title);
      if (role) {
        mapped++;
        if (!dryRun) {
          r.roleKey = role.key;
          r.categoryKey = role.categoryKey;
          r.taxonomyVersion = TAXONOMY_VERSION;
          r.rolePendingReview = false;
          await this.resumeRepo.save(r);
        }
      } else {
        pending++;
        if (title && unresolvedSamples.length < 10) {
          unresolvedSamples.push(title);
        }
        if (!dryRun) {
          r.rolePendingReview = true;
          r.taxonomyVersion = TAXONOMY_VERSION;
          await this.resumeRepo.save(r);
        }
      }
    }

    return {
      dryRun,
      total: resumes.length,
      alreadySet,
      mapped,
      pending,
      taxonomyVersion: TAXONOMY_VERSION,
      unresolvedSamples,
    };
  }

  /** Map a legacy job title to a single role (exact title or alias). Else null (ambiguous). */
  private async resolveRoleByTitle(title: string): Promise<RoleEntity | null> {
    const q = normalize(title);
    if (!q) return null;
    const all = await this.roleRepo.find({ where: { isHidden: false } });
    const exact = all.filter(
      (r) => normalize(r.titleEn) === q || (r.aliases ?? []).includes(q),
    );
    return exact.length === 1 ? exact[0] : null;
  }

  /** Idempotently seed canonical categories/roles. Safe to run every boot (upsert by key). */
  async onModuleInit(): Promise<void> {
    for (const c of ROLE_CATEGORIES) {
      const existing = await this.categoryRepo.findOne({ where: { key: c.key } });
      if (!existing) {
        await this.categoryRepo.save(
          this.categoryRepo.create({ key: c.key, titleEn: c.titleEn, order: c.order }),
        );
      }
    }
    for (const r of ROLES) {
      const existing = await this.roleRepo.findOne({ where: { key: r.key } });
      if (!existing) {
        await this.roleRepo.save(
          this.roleRepo.create({
            key: r.key,
            titleEn: r.titleEn,
            categoryKey: r.categoryKey,
            aliases: (r.aliases ?? []).map(normalize),
            variants: r.variants ?? [],
            supportStatus: r.supportStatus ?? RoleSupportStatusEnum.SUPPORTED,
          }),
        );
      }
    }
    this.logger.log(
      `Taxonomy ready: ${ROLE_CATEGORIES.length} categories, ${ROLES.length} roles.`,
    );
  }

  /** Category derived from a role key (never asked on the main path, spec §3.2.1). */
  async deriveCategory(roleKey: string): Promise<string | null> {
    const role = await this.roleRepo.findOne({ where: { key: roleKey } });
    return role?.categoryKey ?? null;
  }

  /**
   * Search roles by canonical title + aliases. Returns at most 5 (spec §3.2.3).
   * Ranks exact-title, then title-prefix, then alias/substring matches.
   */
  async search(query: string, limit = 5): Promise<RoleSearchResult[]> {
    const q = normalize(query);
    if (!q) return [];

    const all = await this.roleRepo.find({ where: { isHidden: false } });

    const scored = all
      .map((role) => {
        const title = normalize(role.titleEn);
        const aliases = role.aliases ?? [];
        let score = -1;
        if (title === q) score = 100;
        else if (title.startsWith(q)) score = 80;
        else if (aliases.some((a) => a === q)) score = 70;
        else if (title.includes(q)) score = 50;
        else if (aliases.some((a) => a.includes(q))) score = 40;
        return { role, score };
      })
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(({ role }) => ({
      roleId: role.key,
      title: role.titleEn,
      categoryId: role.categoryKey,
      supportStatus: role.supportStatus,
      requiresClarification: (role.variants?.length ?? 0) > 0,
      variants: role.variants ?? [],
    }));
  }
}
