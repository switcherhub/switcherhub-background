import { FilterResponseInterface } from 'src/utils/filter-response.interface';
import { VacancyEntity } from '../entities/vacancy.entity';
import { UserEntity } from 'src/users/entities/user.entity';

export function mapVacanciesToMapData(
  data: FilterResponseInterface<{
    id: string;
    lat: number;
    lng: number;
    isPremium: boolean;
  }>,
  radiusInDegrees: number,
) {
  // console.time('map');
  const d = {
    ...data,
    data: data.data.map((vacancy) => {
      return {
        id: vacancy.id,
        lat: vacancy.lat,
        lng: vacancy.lng,
        isPremium: vacancy.isPremium,
      } as any;
    }),
    // .filter((vacancy) => {
    //   const distance = Math.sqrt(
    //     Math.pow(vacancy.lat - data.data[0].lat, 2) +
    //       Math.pow(vacancy.lng - data.data[0].lng, 2),
    //   );

    //   return distance <= radiusInDegrees;
    // }),
  };

  // console.timeEnd('map');
  return d;
}

export function mapSearchedVacancy(
  data: FilterResponseInterface<VacancyEntity>,
  userId?: string,
): FilterResponseInterface<VacancyEntity> {
  if (!userId) {
    return data;
  }

  return {
    ...data,
    data: data.data.map((vacancy) => {
      // if (vacancy.usersWhoFavorited) {
      //   vacancy['isFavorite'] = !!vacancy.usersWhoFavorited.find(
      //     (v) => v.id == userId,
      //   );
      //   vacancy['usersWhoFavorited'] = undefined;
      // }

      // if (vacancy.usersWhoWatched) {
      //   vacancy['isWatched'] = !!vacancy.usersWhoWatched.find(
      //     (v) => v.id == userId,
      //   );

      //   vacancy['usersWhoWatched'] = undefined;
      // }

      // if (vacancy.usersWhoHidden) {
      //   vacancy['isBlacklist'] = !!vacancy.usersWhoHidden.find(
      //     (v) => v.id == userId,
      //   );

      //   vacancy['usersWhoHidden'] = undefined;
      // }

      return vacancy;
    }),
  };
}

export function mapUserVacancyList(data: VacancyEntity[], user: UserEntity) {
  return data.map((vacancy) => {
    // if (user.favoritesVacancy) {
    //   vacancy['isFavorite'] = !!user.favoritesVacancy.find(
    //     (v) => v.id == vacancy.id,
    //   );
    // }

    // if (user.watchedVacancy) {
    //   vacancy['isWatched'] = !!user.watchedVacancy.find(
    //     (v) => v.id == vacancy.id,
    //   );
    // }

    // if (user.blacklistVacancy) {
    //   vacancy['isBlacklist'] = !!user.blacklistVacancy.find(
    //     (v) => v.id == vacancy.id,
    //   );
    // }

    return vacancy;
  });
}
