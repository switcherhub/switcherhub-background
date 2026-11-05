import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { LocationInterface } from 'src/location/types/location.interface';

export class LocationDto implements LocationInterface {
  @IsOptional()
  @IsString()
  area: string | null;

  @IsNotEmpty()
  @IsString()
  country: string | null;

  @IsNotEmpty()
  @IsString()
  city: string | null;

  @IsNotEmpty()
  @IsString()
  address: string | null;

  @IsNotEmpty()
  @IsString()
  zipCode: string | null;

  @IsNotEmpty()
  @IsString()
  state: string | null;

  @IsNotEmpty()
  @IsNumber()
  lng: number | null;

  @IsNotEmpty()
  @IsNumber()
  lat: number | null;
}
