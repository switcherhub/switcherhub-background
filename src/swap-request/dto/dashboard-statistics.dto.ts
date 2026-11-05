export class DashboardStatisticsDto {
  /** Кількість реквестів які очікують якісь дії */
  pending: number;
  /** Загальна кількість активних реквестів (не завершені, не відмінені) */
  active: number;
  /** Кількість завершених угод */
  completed: number;
  /** Середній час обробки завершених угод (у годинах) */
  averageProcessingTimeHours: number;
  /** Середній час обробки у зручному форматі (дні, години) */
  averageProcessingTimeFormatted: string;
}
