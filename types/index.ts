export type EmployeeRole = 'admin' | 'hr' | 'employee' | 'it';
export type LeaveType = 'earned' | 'sick';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type EquipmentStatus = 'pending' | 'approved' | 'delivered' | 'rejected';
export type Urgency = 'Low' | 'Normal' | 'High' | 'Critical';
export type ActionType = 'success' | 'info' | 'warning' | 'error';

export interface Employee {
  id: string;
  employee_code: string;
  dob: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  designation: string;
  join_date: string;
  leave_balance_earned: number;
  leave_balance_sick: number;
  photo_url: string | null;
  reporting_manager_email: string | null;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
  // New fields
  phone: string | null;
  personal_email: string | null;
  current_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_label: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  employee?: Employee;
}

export interface EquipmentRequest {
  id: string;
  employee_id: string;
  equipment_type: string;
  specifications: string;
  urgency: Urgency;
  notes: string | null;
  status: EquipmentStatus;
  created_at: string;
  employee?: Employee;
}

export interface HandbookAcknowledgement {
  id: string;
  employee_id: string;
  acknowledged_at: string;
  ip_address: string | null;
}

export interface Policy {
  id: string;
  name: string;
  category: string;
  file_url: string | null;
  file_name: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  description: string;
  performed_by: string | null;
  target_employee_id: string | null;
  action_type: ActionType;
  created_at: string;
  performer?: Employee;
}

export interface SessionUser {
  id: string;
  employee_code: string;
  name: string;
  email: string;
  role: EmployeeRole;
  department: string;
  designation: string;
  join_date: string;
  leave_balance_earned: number;
  leave_balance_sick: number;
  photo_url: string | null;
  reporting_manager_email: string | null;
  auth_user_id: string;
}
