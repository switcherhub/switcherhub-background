import { ParserVacancy } from './parser-vacancy.dto';

export interface ParserResponse {
  status: string;
  data: ParserVacancy[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
