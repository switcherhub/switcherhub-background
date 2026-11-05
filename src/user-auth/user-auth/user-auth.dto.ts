import { UserEntity } from 'src/users/entities/user.entity';

export interface UserAuthCreateDto {
  email: string;
  password: string;
  user: UserEntity;
  isVerified?: boolean;
}

export interface UserAuthUpdateDto {
  id: string;
  email?: string;
  password?: string;
  refreshToken?: string;
}
