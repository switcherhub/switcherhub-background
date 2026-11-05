import { RoleSupportStatusEnum } from '../types/role-support-status.enum';

/** Category keys are stable IDs (spec §3.1) — never translated, never shown raw. */
export const ROLE_CATEGORIES: { key: string; titleEn: string; order: number }[] =
  [
    { key: 'retail_customer_service', titleEn: 'Retail & Customer Service', order: 1 },
    { key: 'food_hospitality', titleEn: 'Food & Hospitality', order: 2 },
    { key: 'warehouse_production', titleEn: 'Warehouse & Production', order: 3 },
    { key: 'cleaning_maintenance', titleEn: 'Cleaning & Maintenance', order: 4 },
    { key: 'office_support', titleEn: 'Office & Support', order: 5 },
    { key: 'delivery_driving', titleEn: 'Delivery & Driving', order: 6 },
    { key: 'security', titleEn: 'Security', order: 7 },
    { key: 'other', titleEn: 'Other', order: 99 },
  ];

export interface RoleSeed {
  key: string;
  titleEn: string;
  categoryKey: string;
  aliases?: string[];
  variants?: string[];
  supportStatus?: RoleSupportStatusEnum;
}

/**
 * Canonical roles from spec §3.3. Grouping several source titles into one role does
 * NOT make them always interchangeable — the hard matching rules (spec §6) still apply.
 * `variants` drives the single clarifying question for ambiguous titles (spec §3.2.5).
 */
export const ROLES: RoleSeed[] = [
  // retail_customer_service
  { key: 'cashier', titleEn: 'Cashier', categoryKey: 'retail_customer_service', aliases: ['checkout', 'till'] },
  { key: 'retail_sales_associate', titleEn: 'Retail Associate', categoryKey: 'retail_customer_service', aliases: ['sales associate', 'front end associate', 'store associate'] },
  { key: 'customer_service_associate', titleEn: 'Customer Service Associate', categoryKey: 'retail_customer_service', aliases: ['customer service', 'csr'], variants: ['In-person service', 'Phone support'] },
  { key: 'grocery_clerk', titleEn: 'Grocery Clerk', categoryKey: 'retail_customer_service', aliases: ['grocery', 'deli clerk', 'bakery clerk'], variants: ['Deli', 'Bakery', 'General grocery'] },
  { key: 'stocker', titleEn: 'Stocker (Retail)', categoryKey: 'retail_customer_service', aliases: ['stock clerk', 'shelf stocker'] },

  // food_hospitality
  { key: 'line_cook', titleEn: 'Line Cook', categoryKey: 'food_hospitality', aliases: ['cook', 'grill cook'] },
  { key: 'food_prep_worker', titleEn: 'Food Prep Worker', categoryKey: 'food_hospitality', aliases: ['prep cook', 'food preparation'] },
  { key: 'dishwasher', titleEn: 'Dishwasher', categoryKey: 'food_hospitality', aliases: ['kitchen porter'] },
  { key: 'hotel_porter', titleEn: 'Hotel Service Staff (Porter / Bell / Attendant)', categoryKey: 'food_hospitality', aliases: ['bell attendant', 'bellhop', 'hotel attendant', 'porter'], variants: ['Porter', 'Bell attendant', 'Room attendant'] },

  // warehouse_production
  { key: 'warehouse_associate', titleEn: 'Warehouse Associate', categoryKey: 'warehouse_production', aliases: ['warehouse worker'], variants: ['Picking', 'Packing', 'Receiving', 'Mixed'] },
  { key: 'picker_packer', titleEn: 'Picker / Packer', categoryKey: 'warehouse_production', aliases: ['order picker', 'packer'], variants: ['Picking', 'Packing', 'Both'] },
  { key: 'warehouse_stock_associate', titleEn: 'Stock Associate (Warehouse)', categoryKey: 'warehouse_production', aliases: ['inventory associate'] },
  { key: 'loader_unloader', titleEn: 'Loader / Unloader', categoryKey: 'warehouse_production', aliases: ['loader', 'unloader', 'dock worker'] },
  { key: 'forklift_operator', titleEn: 'Forklift Operator (Entry-level)', categoryKey: 'warehouse_production', aliases: ['forklift driver'] },
  { key: 'production_worker', titleEn: 'Production Worker', categoryKey: 'warehouse_production', aliases: ['factory worker'] },
  { key: 'assembly_worker', titleEn: 'Assembly Worker', categoryKey: 'warehouse_production', aliases: ['assembler'] },
  { key: 'machine_operator', titleEn: 'Machine Operator (Entry-level)', categoryKey: 'warehouse_production', aliases: ['machine operator'] },
  { key: 'packaging_worker', titleEn: 'Packaging Worker', categoryKey: 'warehouse_production', aliases: ['packaging'] },

  // cleaning_maintenance
  { key: 'cleaner_janitor', titleEn: 'Cleaner / Janitor', categoryKey: 'cleaning_maintenance', aliases: ['janitor', 'custodial staff', 'custodian', 'cleaner'] },
  { key: 'laundry_worker', titleEn: 'Laundry Worker (Commercial / Hotel)', categoryKey: 'cleaning_maintenance', aliases: ['laundry attendant'] },
  { key: 'maintenance_worker', titleEn: 'Maintenance Worker (General)', categoryKey: 'cleaning_maintenance', aliases: ['maintenance', 'handyman'] },
  { key: 'facilities_assistant', titleEn: 'Facilities Assistant', categoryKey: 'cleaning_maintenance', aliases: ['facilities'] },
  { key: 'housekeeper', titleEn: 'Housekeeping Staff (Hotels)', categoryKey: 'cleaning_maintenance', aliases: ['housekeeping', 'room cleaner'] },
  { key: 'grounds_worker', titleEn: 'Landscaper / Grounds Worker', categoryKey: 'cleaning_maintenance', aliases: ['landscaper', 'groundskeeper', 'outdoor maintenance'], variants: ['Grounds care', 'Repair / maintenance'] },
  { key: 'car_wash_attendant', titleEn: 'Car Wash Attendant', categoryKey: 'cleaning_maintenance', aliases: ['car wash'] },

  // office_support
  { key: 'office_assistant', titleEn: 'Office Assistant', categoryKey: 'office_support', aliases: ['administrative assistant', 'admin assistant'] },
  { key: 'data_entry_clerk', titleEn: 'Data Entry Clerk', categoryKey: 'office_support', aliases: ['data entry'] },
  { key: 'call_center_agent', titleEn: 'Call Center Agent', categoryKey: 'office_support', aliases: ['call center', 'contact center agent'], variants: ['Inbound', 'Outbound', 'Mixed'] },

  // delivery_driving
  { key: 'delivery_driver', titleEn: 'Delivery Driver (Non-CDL)', categoryKey: 'delivery_driving', aliases: ['courier', 'route driver', 'driver'], variants: ['On foot', 'By car', 'Employer vehicle', 'Own vehicle'] },

  // security
  { key: 'security_guard', titleEn: 'Security Guard', categoryKey: 'security', aliases: ['guard', 'security officer'] },
  { key: 'loss_prevention_associate', titleEn: 'Loss Prevention Associate', categoryKey: 'security', aliases: ['loss prevention', 'asset protection'] },

  // other / special handling
  { key: 'general_laborer', titleEn: 'General Laborer', categoryKey: 'other', aliases: ['laborer', 'general labor'] },
  {
    key: 'pharmacy_technician',
    titleEn: 'Pharmacy Technician',
    categoryKey: 'other',
    aliases: ['pharmacy tech'],
    supportStatus: RoleSupportStatusEnum.UNSUPPORTED_FOR_MATCHING,
  },
];
