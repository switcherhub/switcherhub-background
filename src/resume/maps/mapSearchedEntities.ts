import { UserEntity } from 'src/users/entities/user.entity';
import { ResumeEntity } from '../entities/resume.entity';

export function mapSearchedEntities(
  data: ResumeEntity[],
  userId?: string,
): ResumeEntity[] {
  if (!userId) {
    return data;
  }

  return data.map((resume) => {
    // if (resume.usersWhoFavorited) {
    //   resume['isFavorite'] = !!resume.usersWhoFavorited.find(
    //     (v) => v.id == userId,
    //   );
    //   resume['usersWhoFavorited'] = undefined;
    // }

    // if (resume.usersWhoWatched) {
    //   resume['isWatched'] = !!resume.usersWhoWatched.find(
    //     (v) => v.id == userId,
    //   );

    //   resume['usersWhoWatched'] = undefined;
    // }

    // if (resume.usersWhoHidden) {
    //   resume['isBlacklist'] = !!resume.usersWhoHidden.find(
    //     (v) => v.id == userId,
    //   );

    //   resume['usersWhoHidden'] = undefined;
    // }

    return resume;
  });
}

export function mapUserResumeList(data: ResumeEntity[], user: UserEntity) {
  return data.map((resume) => {
    // if (user.favoritesResume) {
    //   resume['isFavorite'] = !!user.favoritesResume.find(
    //     (v) => v.id == resume.id,
    //   );
    // }

    // if (user.watchedResume) {
    //   resume['isWatched'] = !!user.watchedResume.find((v) => v.id == resume.id);
    // }

    // if (user.blacklistResume) {
    //   resume['isBlacklist'] = !!user.blacklistResume.find(
    //     (v) => v.id == resume.id,
    //   );
    // }

    return resume;
  });
}
