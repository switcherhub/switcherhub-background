export interface FilterResponseInterface<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

export interface FilterDto<T> {
  page: number;
  perPage?: number;

  filterBy?: Extract<keyof T, string>[] | string[];
  // filterType?: ('eq' | 'not' | 'in' | 'like' | 'ge' | 'le' | 'btw')[];
  filterType?: string[];
  filterValue?: any[];

  searchFields?: Extract<keyof T, string>[] | string[];
  search?: string;

  orderBy?: Extract<keyof T, string>[] | string[];
  orderType?: ('ASC' | 'DESC')[];

  relations?: string[];
  select?: string[];

  withDeleted?: boolean;
}

export interface SearchFilterInterface {
  searchFields?: string[];
  search?: string;
  withDeleted?: boolean;
  relations?: string[];
  select?: string[];
}
