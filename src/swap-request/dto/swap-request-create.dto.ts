import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEmpty,
  IsNumber,
  IsObject,
  IsString,
} from 'class-validator';
import { SwapRequestInterface } from '../types/swap-request.interface';
import { SwapComparisonInterface } from '../types/swap-comparison.interface';
import { IsTrulyEmpty } from 'src/app/validators/is-truly-empty';

export class SwapRequestCreateDto implements Partial<SwapRequestInterface> {
  @IsNotEmpty()
  @IsUUID()
  resumeAId: string;

  @IsNotEmpty()
  @IsUUID()
  resumeBId: string;

  @IsOptional()
  @IsUUID()
  managerAId?: string | null;

  @IsOptional()
  @IsUUID()
  managerBId?: string | null;

  @IsOptional()
  @IsUUID()
  workspaceAId?: string | null;

  @IsOptional()
  @IsUUID()
  workspaceBId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsNumber()
  score?: number | null;

  @IsOptional()
  @IsObject()
  comparison?: SwapComparisonInterface | null;

  @IsTrulyEmpty()
  @IsEmpty()
  status: never;

  @IsTrulyEmpty()
  @IsEmpty()
  resumeA: never;

  @IsTrulyEmpty()
  @IsEmpty()
  resumeB: never;

  @IsTrulyEmpty()
  @IsEmpty()
  managerA: never;

  @IsTrulyEmpty()
  @IsEmpty()
  managerB: never;
}
