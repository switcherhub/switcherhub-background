import { SwapRequestEntity } from '../entities/swap-request.entity';
import { SwapComparisonInterface } from '../types/swap-comparison.interface';

export type SwapRequestStatusType = 'new' | 'active' | 'success' | 'failed';

export class SwapRequestResponseDto {
  id: string;
  /** Числовий ID для відображення (наприклад, #123). */
  numericId: number | null;
  resumeAId: string;
  resumeBId: string;
  managerAId: string | null;
  managerBId: string | null;
  createdById: string | null;
  status: SwapRequestStatusType;
  description: string | null;
  score: number | null;
  comparison: SwapComparisonInterface | null;
  // ... інші поля з SwapRequestEntity
  [key: string]: any;
}
