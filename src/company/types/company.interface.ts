import { CompanyTypeInterface } from './../../company-type/types/company-type.interface';
import { IndustryInterface } from 'src/industry/types/industry.interface';
import { ParameterBaseInterface } from 'src/parameter/types/parameter.interface';
import { LocationInterface } from 'src/location/types/location.interface';
import { FileInterface } from 'src/file-manager/file/file.interface';
import { UserInterface } from 'src/users/interfaces/user.interface';
import { EmployeeNumberInterface } from 'src/employee-number/types/employee-number.interface';

export interface CompanyInterface extends ParameterBaseInterface {
  id: string;
  name: string;
  companyType: CompanyTypeInterface;
  companyTypeId: string | null;
  registrationNumber: string | null;
  industry: IndustryInterface;
  industryId: string | null;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  location: LocationInterface | null;
  employeeNumber: EmployeeNumberInterface | null;
  employeeNumberId: string | null;
  establishmentYear: string | null;
  website: string | null;
  socialNetworks: string[];
  description: string | null;
  logo: FileInterface;
  photos: FileInterface[];
  user: UserInterface | null;
  isHidden: boolean;
  isApproved: boolean;
  deletedAt: Date | null;
}

export type CompanyKey = keyof CompanyInterface;
