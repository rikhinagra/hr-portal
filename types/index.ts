export type EmployeeRole = 'admin' | 'hr' | 'employee' | 'it' | 'manager';
export type LeaveType = 'earned' | 'sick' | 'compoff';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type EquipmentStatus = 'pending' | 'approved' | 'delivered' | 'rejected' | 'assigned';
export type Urgency = 'Low' | 'Normal' | 'High' | 'Critical';
export type ActionType = 'success' | 'info' | 'warning' | 'error';
export type TimesheetStatus = 'pending' | 'approved' | 'rejected';
// The work types, in the groups the Timesheet dropdowns show them in. 'Development' stays first (it is the default).
export const TECHNICAL_WORK_TYPES = [
  'Development', 'Testing /QA', 'Bugfix / Troubleshooting', 'Deploy / Release', 'Research / Analysis', 'Documentation',
] as const;
export const NON_TECHNICAL_WORK_TYPES = [
  'HR Operations', 'Onboarding', 'Payroll', 'Recruiting', 'Interview Scheduling', 'Interview Feedback', 'Screening',
  'Recording', 'Editing', 'Social Media Posting', 'Scripting', 'Growth Marketing', 'Advertising', 'Content Creation',
] as const;
export const GENERAL_WORK_TYPES = [
  'Meeting', 'Client Meeting', 'Training', 'Operations', 'Business Development', 'Others',
] as const;
export const WORK_TYPES = [...TECHNICAL_WORK_TYPES, ...NON_TECHNICAL_WORK_TYPES, ...GENERAL_WORK_TYPES] as const;
export const WORK_TYPE_GROUPS = [
  { label: 'Technical', types: TECHNICAL_WORK_TYPES },
  { label: 'Non-technical', types: NON_TECHNICAL_WORK_TYPES },
  { label: 'General', types: GENERAL_WORK_TYPES },
] as const;
export type WorkType = typeof WORK_TYPES[number];
// Limits for a timesheet entry: longest text (the page stops typing at these; the server refuses longer text)
// and the shortest duration, 0.25 hours = 15 minutes.
export const TIMESHEET_LIMITS = { project: 100, task: 500, link: 300, comment: 300, minHours: 0.25 } as const;

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
  leave_balance_casual: number;
  leave_balance_sick: number;
  leave_balance_compoff: number;
  photo_url: string | null;
  reporting_manager_email: string | null;
  // Who approves this person's timesheet (separate from the reporting manager, who approves leave)
  engineer_manager_email?: string | null;
  // Jira account id, set only for people whose tickets can be picked in the Timesheet ("Add from Jira")
  jira_account_id?: string | null;
  is_active: boolean;
  auth_user_id: string | null;
  created_at: string;
  // New fields
  phone: string | null;
  personal_email: string | null;
  current_address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  employment_type: string | null;
  total_experience: string | null;
  experience_years: number;
  experience_months: number;
  // True for people who approve leave but never take any themselves (e.g. a Director).
  // Treated like Admin for the personal leave screens; missing/false means a normal employee.
  leave_exempt?: boolean;
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

export interface CompOffClaim {
  id: string;
  employee_id: string;
  work_date: string;
  intended_leave_date: string;
  reason: string;
  status: LeaveStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  employee?: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email'> | null;
}

export interface TimesheetEntry {
  id: string;
  employee_id: string;
  date: string;
  project_client: string;
  task_activity: string;
  duration_hours: number;
  ticket_link: string | null;
  comment: string | null;
  work_type: WorkType;
  status: TimesheetStatus;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  employee?: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'email' | 'reporting_manager_email'> | null;
}

export interface EquipmentRequest {
  id: string;
  employee_id: string;
  equipment_type: string;
  specifications: string;
  urgency: Urgency;
  notes: string | null;
  status: EquipmentStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  date_of_issue: string | null;
  device_info: string | null;
  total_value: number | null;
  employee?: Pick<Employee, 'id' | 'name' | 'email' | 'employee_code' | 'department'> | null;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewed_by: string;
  review_month: string;
  rating_quality_timeliness: number;
  rating_ownership_accountability: number;
  rating_communication_collaboration: number;
  rating_role_specific_skills: number;
  rating_initiative_proactiveness: number;
  rating_punctuality_conduct: number;
  key_achievements: string | null;
  key_strengths: string | null;
  development_areas: string | null;
  notable_challenges: string | null;
  managers_remarks: string | null;
  overall_rating: number;
  created_at: string;
  updated_at: string;
  employee?: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'reporting_manager_email'> | null;
  reviewer?: Pick<Employee, 'id' | 'name'> | null;
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
  leave_balance_casual: number;
  leave_balance_sick: number;
  photo_url: string | null;
  reporting_manager_email: string | null;
  auth_user_id: string;
}
