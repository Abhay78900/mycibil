export type LeadStatus = 
  | 'new' 
  | 'contacted' 
  | 'interested' 
  | 'follow_up_scheduled' 
  | 'converted' 
  | 'not_interested' 
  | 'rejected';

export type InvestmentCapacity = 
  | 'below_50k' 
  | '50k_to_1lakh' 
  | '1lakh_to_5lakh' 
  | 'above_5lakh';

export type InterestedServices = 
  | 'credit_score_check' 
  | 'loan' 
  | 'both';

export interface PartnerLead {
  id: string;
  full_name: string;
  mobile: string;
  email: string;
  city: string;
  state: string;
  business_name: string | null;
  finance_experience: boolean;
  current_occupation: string;
  investment_capacity: InvestmentCapacity;
  interested_services: InterestedServices;
  message: string | null;
  consent_given: boolean;
  status: LeadStatus;
  assigned_admin_id: string | null;
  follow_up_date: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivityLog {
  id: string;
  lead_id: string;
  admin_id: string | null;
  action: string;
  old_status: LeadStatus | null;
  new_status: LeadStatus | null;
  notes: string | null;
  created_at: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  follow_up_scheduled: 'Follow-up Scheduled',
  converted: 'Converted to Partner',
  not_interested: 'Not Interested',
  rejected: 'Rejected'
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  interested: 'bg-purple-100 text-purple-800',
  follow_up_scheduled: 'bg-orange-100 text-orange-800',
  converted: 'bg-green-100 text-green-800',
  not_interested: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800'
};

export const INVESTMENT_CAPACITY_LABELS: Record<InvestmentCapacity, string> = {
  below_50k: 'Below ₹50,000',
  '50k_to_1lakh': '₹50,000 - ₹1 Lakh',
  '1lakh_to_5lakh': '₹1 Lakh - ₹5 Lakh',
  above_5lakh: 'Above ₹5 Lakh'
};

export const INTERESTED_SERVICES_LABELS: Record<InterestedServices, string> = {
  credit_score_check: 'Credit Score Check',
  loan: 'Loan Services',
  both: 'Both'
};

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];
