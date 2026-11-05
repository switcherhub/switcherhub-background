import { ParameterCreateDto } from 'src/parameter/dto/parameter-create.dto';
import { CompanyInterface } from '../types/company.interface';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEmpty,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';
import { LocationInterface } from 'src/location/types/location.interface';
import { FileInterface } from 'src/file-manager/file/file.interface';
import { FileDto } from 'src/file-manager/file/file.dto';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { LocationDto } from 'src/location/dto/location.dto';
import { IsValidPhoneNumber } from 'src/app/validators/phone';

export class CompanyCreateDto
  extends ParameterCreateDto
  implements CompanyInterface
{
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  registrationNumber: string | null;

  @IsOptional()
  @IsString()
  contactPerson: string;

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @IsValidPhoneNumber()
  @IsNotEmpty()
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
  @IsOptional()
  logo: FileInterface;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  @IsOptional()
  photos: FileInterface[];

  @IsUUID()
  @IsNotEmpty()
  industryId: string;

  @IsUUID()
  @IsNotEmpty()
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

  @IsOptional()
  @IsString()
  title: string | null;

  industry: undefined;
  companyType: undefined;
  employeeNumber: undefined;
}
