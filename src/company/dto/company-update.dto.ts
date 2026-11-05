import { ParameterUpdateDto } from 'src/parameter/dto/parameter-update.dto';
import { CompanyInterface } from '../types/company.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { FileInterface } from 'src/file-manager/file/file.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { Type } from 'class-transformer';
import { FileDto } from 'src/file-manager/file/file.dto';
import { LocationDto } from 'src/location/dto/location.dto';
import { IsValidPhoneNumber } from 'src/app/validators/phone';

export class CompanyUpdateDto
  extends ParameterUpdateDto
  implements CompanyInterface
{
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsOptional()
  registrationNumber: string | null;

  @IsString()
  @IsOptional()
  contactPerson: string;

  @IsEmail()
  @IsOptional()
  contactEmail: string;

  @IsValidPhoneNumber()
  @IsOptional()
  contactPhone: string;

  @IsString()
  @IsOptional()
  establishmentYear: string | null;

  @IsString()
  @IsOptional()
  website: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  socialNetworks: string[];

  @IsString()
  @IsOptional()
  description: string | null;

  @ValidateNested()
  @Type(() => FileDto)
  logo: FileInterface;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  @IsOptional()
  photos: FileInterface[];

  @IsUUID()
  @IsOptional()
  industryId: string;

  @IsUUID()
  @IsOptional()
  companyTypeId: string;

  @IsUUID()
  @IsOptional()
  employeeNumberId: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationInterface | null;

  @IsOptional()
  @IsBoolean()
  isHidden: boolean;

  @IsTrulyEmpty()
  @IsEmpty()
  isApproved: boolean;

  @IsTrulyEmpty()
  @IsEmpty()
  user: UserInterface | null;

  industry: undefined;
  companyType: undefined;
  employeeNumber: undefined;
}
