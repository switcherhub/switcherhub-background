import { LocationInterface } from 'src/location/types/location.interface';

export interface WorkExpirienceJsonInterface {
  companyName: string;
  departament: string | null;
  position: string;
  workLocation: LocationInterface;
  startDate: Date;
  endDate: Date | null;
  currentWork: boolean;
  responsibilities: string | null;
  industryId: string;
  jobTypeIds: string[];
}
