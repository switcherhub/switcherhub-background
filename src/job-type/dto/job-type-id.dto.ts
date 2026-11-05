import { IsNotEmpty, IsUUID } from 'class-validator';

export class JobTypeIdDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
