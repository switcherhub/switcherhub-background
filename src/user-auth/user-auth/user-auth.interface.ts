import { UserEntity } from 'src/users/entities/user.entity';

export interface UserAuthInterface {
  id: string;

  email: string;
  password: string;
  refreshToken: string;

  user: UserEntity;
}
