import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { BenefitInterface } from '../types/benefit.interface';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class BenefitIdDto
  extends ParameterUpdateDto
  implements BenefitInterface
{
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
