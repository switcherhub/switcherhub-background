import { IsNotEmpty, IsUUID } from 'class-validator';

export class PerkIdDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
