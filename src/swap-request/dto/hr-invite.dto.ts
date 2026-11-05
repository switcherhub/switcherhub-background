import { IsOptional, IsEmail } from 'class-validator';

/**
 * Запрошення ейчара: або по email, або тільки по коду.
 * - Якщо email передано — зберігається та на нього відправляється лист із кодом і посиланням.
 * - Якщо email не передано — генерується лише код; посилання для переходу повертається у відповіді (joinUrl).
 */
export class HrInviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}

