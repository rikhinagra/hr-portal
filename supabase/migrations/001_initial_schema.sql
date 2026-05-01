-- ═══════════════════════════════════════════════════
-- SACHHSOFT HR PORTAL — Initial Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  dob DATE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'employee', 'it')),
  department TEXT NOT NULL,
  designation TEXT NOT NULL,
  join_date DATE NOT NULL,
  leave_balance_earned INTEGER DEFAULT 12,
  leave_balance_sick INTEGER DEFAULT 7,
  photo_url TEXT,
  reporting_manager_email TEXT,
  is_active BOOLEAN DEFAULT true,
  auth_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('earned', 'sick', 'compoff')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- EQUIPMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS equipment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  equipment_type TEXT NOT NULL,
  specifications TEXT NOT NULL,
  urgency TEXT DEFAULT 'Normal' CHECK (urgency IN ('Low', 'Normal', 'High', 'Critical')),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'delivered', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HANDBOOK ACKNOWLEDGEMENTS TABLE
CREATE TABLE IF NOT EXISTS handbook_acknowledgements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) UNIQUE NOT NULL,
  acknowledged_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- POLICIES TABLE
CREATE TABLE IF NOT EXISTS policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  performed_by UUID REFERENCES employees(id),
  target_employee_id UUID REFERENCES employees(id),
  action_type TEXT CHECK (action_type IN ('success', 'info', 'warning', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE handbook_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Employees: everyone can read (needed for login lookup via service role)
CREATE POLICY "employees_select" ON employees FOR SELECT USING (true);
CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE USING (true);

-- Leave requests
CREATE POLICY "leave_select_own" ON leave_requests FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr'))
);
CREATE POLICY "leave_insert_own" ON leave_requests FOR INSERT WITH CHECK (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
);
CREATE POLICY "leave_update_admin" ON leave_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr'))
);

-- Equipment requests
CREATE POLICY "equipment_select_own" ON equipment_requests FOR SELECT USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr','it'))
);
CREATE POLICY "equipment_insert" ON equipment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "equipment_update" ON equipment_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr','it'))
);

-- Handbook acknowledgements
CREATE POLICY "handbook_ack_own" ON handbook_acknowledgements FOR ALL USING (
  employee_id IN (SELECT id FROM employees WHERE auth_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr'))
);

-- Policies: everyone can read
CREATE POLICY "policies_select" ON policies FOR SELECT USING (true);
CREATE POLICY "policies_manage" ON policies FOR ALL USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr'))
);

-- Activity log: admin/hr only
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM employees WHERE auth_user_id = auth.uid() AND role IN ('admin','hr'))
);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════
-- SEED: 7 DEFAULT POLICIES
-- ═══════════════════════════════════════════════════

INSERT INTO policies (name, category, file_name) VALUES
  ('Employee Onboarding Checklist', 'Onboarding', 'Employee_Onboarding_Checklist.pdf'),
  ('Hiring Requirement Collection Document', 'Recruitment', 'Hiring_Requirement_Collection_Document.pdf'),
  ('Leave Application Policy', 'Leave', 'Leave_Application_Policy.pdf'),
  ('Work From Home Policy', 'WFH', 'WORK_FROM_HOME_POLICY.pdf'),
  ('Employee Handbook v1.0', 'Handbook', 'EMPLOYEE_HANDBOOK.pdf'),
  ('Data Security & Confidentiality Policy', 'Security', 'Data_Security_Policy.pdf'),
  ('Zero Tolerance Policy', 'Conduct', 'Zero_Tolerance_Policy.pdf')
ON CONFLICT DO NOTHING;
