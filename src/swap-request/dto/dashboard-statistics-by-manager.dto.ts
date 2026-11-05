export class ManagerInfoDto {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** true, якщо користувача вже видалено з системи */
  isDeleted: boolean;
}

export class DashboardStatisticsByManagerItemDto {
  manager: ManagerInfoDto;
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

export class DashboardStatisticsByManagerDto {
  items: DashboardStatisticsByManagerItemDto[];
}
