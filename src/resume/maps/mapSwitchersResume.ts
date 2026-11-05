import { getDistanceKm } from 'src/location/getDistanceKm';
import { ResumeEntity } from '../entities/resume.entity';
import { SearchResumeVacancyView } from 'src/search/entities/search.entity';

export function mapSwitchersResume(
  data: ResumeEntity[],
  lat?: number,
  lng?: number,
  hlat?: number,
  hlng?: number,
  radius?: number,
) {
  if (!lat || !lng || !hlat || !hlng || !radius) {
    return data;
  }

  return data.map((resume) => {
    try {
      const distanceToSwitcherWork = getDistanceKm(
        hlat,
        hlng,
        resume.location.lat,
        resume.location.lng,
      );

      const distanceSwitcherToWork = getDistanceKm(
        resume.locationHome.lat,
        resume.locationHome.lng,
        lat,
        lng,
      );

      return {
        ...resume,
        distanceToSwitcherWork,
        distanceSwitcherToWork,
      };
    } catch (e) {
      return {
        ...resume,
        distanceToSwitcherWork: 100000,
        distanceSwitcherToWork: 100000,
      };
    }
  });
}

export function mapSearchView(
  data: SearchResumeVacancyView[],
  lat?: number,
  lng?: number,
  hlat?: number,
  hlng?: number,
  radius?: number,
) {
  return data.map((resume) => {
    const company = resume?.company
      ? {
          id: resume?.company?.id,
          name: resume?.company?.name,
          logo: null,
        }
      : null;

    if (company) {
      company.logo = resume.company?.logo
        ? {
            path: resume.company?.logo?.path,
            url: new URL(resume.company.logo.path, process.env.FILE_BASE_URL)
              .href,
          }
        : null;
    }

    return {
      ...resume,
      company,
    };
  });

  if (!hlat || !hlng || !radius) {
    return data;
  }

  radius = radius * 111319.9;

  return data
    .filter((resume) => {
      if (lat && lng && hlat && hlng && radius && resume.type == 'resume') {
        return resume.locationHome && resume.location;
      } else {
        return !!resume.location;
      }
    })
    .map((resume) => {
      try {
        const distanceToSwitcherWork = getDistanceKm(
          hlat,
          hlng,
          resume?.location?.lat,
          resume?.location?.lng,
        );

        const distanceSwitcherToWork = getDistanceKm(
          resume?.locationHome?.lat,
          resume?.locationHome?.lng,
          lat,
          lng,
        );

        return {
          ...resume,
          distanceToSwitcherWork,
          distanceSwitcherToWork,
        };
      } catch (e) {
        console.log('Error in mapSearchView', e);
        return {
          ...resume,
          distanceToSwitcherWork: 100000,
          distanceSwitcherToWork: 100000,
        };
      }
    })
    .filter((resume) => {
      if (lat && lng && hlat && hlng && radius && resume.type == 'resume') {
        return resume.distanceSwitcherToWork <= radius;
      }
      return true;
    })
    .map((resume) => {
      if (resume.company) {
        resume.company = {
          id: resume.company.id,
          name: resume.company.name,
          isHidden: resume.company.isHidden,
          isApproved: resume.company.isApproved,
        };

        if (resume.companyLogo) {
          const baseUrl = process.env.FILE_BASE_URL || '';

          resume.company.logo = {
            path: resume.companyLogo.path,
            url: new URL(resume.companyLogo.path, baseUrl).href,
          };

          delete resume.companyLogo;
        }
      }

      return {
        ...resume,
      };
    });
}
