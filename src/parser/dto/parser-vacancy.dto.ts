export interface ParserVacancy {
  id: number;
  company_id: string;
  brand_company: string;
  type: string[]; // масив UUID-ів
  title: string;
  page_url: string;
  salary_from: number | null;
  salary_to: number | null;
  salary_period: string | null;
  address: string;
  street: string;
  city: string;
  state: string;
  country_code: string;
  zip: string;
  lat: string;
  lng: string;
  job_details: string;
  status: string;
  created_at: string; // ISO дата
  updated_at: string; // ISO дата

  borough: string | null;
  county: string | null;
}
