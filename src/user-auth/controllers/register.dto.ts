import { UserRoleEnum } from 'src/users/interfaces/user-role.enum';

export interface RegisterDto {
  email: string;
  password: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  /** Тип акаунту. Якщо не передано — буде switcher */
  activeRole?: UserRoleEnum;
}
