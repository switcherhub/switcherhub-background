import { Injectable } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';

@Injectable()
export class ScoringHelperService {
  private readonly SCORING_TYPE = 'scoring-matrix';

  constructor(private readonly configurationService: ConfigurationService) {}

  /**
   * Get scoring by parameter name and IDs
   * Returns 1.0 if IDs are the same, or value from matrix
   * Returns null if not found
   */
  async getScoring(
    parameterName: string,
    valueAId: string,
    valueBId: string,
  ): Promise<number | null> {
    // If same ID, return 1.0 immediately
    if (valueAId === valueBId) {
      return 1.0;
    }

    const config = await this.configurationService.getConfiguration(
      this.SCORING_TYPE,
      parameterName,
    );

    if (!config || !config.matrix) {
      return null;
    }

    // Try both key formats: "id1-id2" and "id2-id1"
    const key1 = `${valueAId}-${valueBId}`;
    const key2 = `${valueBId}-${valueAId}`;

    return config.matrix[key1] ?? config.matrix[key2] ?? null;
  }

  /**
   * Get matrix for parameter name
   */
  async getMatrix(
    parameterName: string,
  ): Promise<Record<string, number> | null> {
    const config = await this.configurationService.getConfiguration(
      this.SCORING_TYPE,
      parameterName,
    );

    return config?.matrix ?? null;
  }

  /**
   * Update scoring value in matrix
   */
  async updateScoring(
    parameterName: string,
    valueAId: string,
    valueBId: string,
    score: number,
  ): Promise<void> {
    if (score < 0 || score > 1) {
      throw new Error('Score must be between 0 and 1');
    }

    const config = await this.configurationService.getConfiguration(
      this.SCORING_TYPE,
      parameterName,
    );

    const matrix = config?.matrix ?? {};
    const key = [valueAId, valueBId].sort().join('-');
    matrix[key] = score;

    await this.configurationService.setConfiguration(
      this.SCORING_TYPE,
      parameterName,
      { matrix },
    );
  }
}
