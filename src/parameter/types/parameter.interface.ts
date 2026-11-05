export interface ParameterBaseInterface {
  id: string;
  title: string;
  order: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
