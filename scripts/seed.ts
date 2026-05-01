/**
 * Seed Script — Run with: npx tsx scripts/seed.ts
 * Requires .env.local to be populated with real Supabase credentials.
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_EMPLOYEES = [
  { code: 'AC001', dob: '1990-01-15', name: 'Rikhi Singh', role: 'admin', dept: 'Leadership', designation: 'Business Head', email: 'rikhi@aadhcode.com', joinDate: '2020-01-01' },
  { code: 'AC002', dob: '1992-03-22', name: 'Aditya Sharma', role: 'admin', dept: 'Leadership', designation: 'Co-Founder', email: 'aditya@aadhcode.com', joinDate: '2020-01-01' },
  { code: 'AC003', dob: '1993-07-14', name: 'Simrandeep Kaur', role: 'admin', dept: 'Leadership', designation: 'CEO & Owner', email: 'simrandeep@aadhcode.com', joinDate: '2020-01-01' },
  { code: 'AC004', dob: '1995-11-30', name: 'Srijna Bhasin', role: 'hr', dept: 'HR', designation: 'HR Head', email: 'srijna@aadhcode.com', joinDate: '2021-04-01' },
  { code: 'IT001', dob: '1994-05-18', name: 'Taranjyot Kour', role: 'it', dept: 'IT', designation: 'IT Admin', email: 'taranjyot@aadhcode.com', joinDate: '2021-08-01' },
  { code: 'AC005', dob: '1997-02-10', name: 'Rahul Verma', role: 'employee', dept: 'Engineering', designation: 'Full Stack Developer', email: 'rahul@aadhcode.com', joinDate: '2022-01-10' },
  { code: 'AC006', dob: '1998-08-25', name: 'Ananya Gupta', role: 'employee', dept: 'Design', designation: 'UI/UX Designer', email: 'ananya@aadhcode.com', joinDate: '2022-03-15' },
  { code: 'AC007', dob: '1996-12-05', name: 'Karan Mehta', role: 'employee', dept: 'Engineering', designation: 'Backend Developer', email: 'karan@aadhcode.com', joinDate: '2023-01-01' },
  { code: 'AC008', dob: '1999-04-19', name: 'Priya Nair', role: 'employee', dept: 'Business Dev', designation: 'BD Executive', email: 'priya@aadhcode.com', joinDate: '2023-06-01' },
  { code: 'AC009', dob: '1995-09-03', name: 'Arjun Bhatia', role: 'employee', dept: 'QA', designation: 'QA Engineer', email: 'arjun@aadhcode.com', joinDate: '2024-01-15' },
];

async function seed() {
  console.log('🌱 Starting seed...\n');

  for (const emp of SEED_EMPLOYEES) {
    const authEmail = `${emp.code.toLowerCase()}@portal.internal`;
    const authPassword = emp.dob;

    console.log(`Processing ${emp.code} — ${emp.name}...`);

    // 1. Check if employee already exists in DB
    const { data: existing } = await supabase
      .from('employees')
      .select('id, auth_user_id')
      .eq('employee_code', emp.code)
      .single();

    let authUserId: string | null = existing?.auth_user_id ?? null;

    // 2. Create auth user if not linked
    if (!authUserId) {
      // Check if auth user exists
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingAuthUser = userList?.users?.find(u => u.email === authEmail);

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: authEmail,
          password: authPassword,
          email_confirm: true,
        });

        if (createErr) {
          console.error(`  ❌ Auth user creation failed: ${createErr.message}`);
          continue;
        }
        authUserId = newUser.user.id;
        console.log(`  ✅ Auth user created`);
      }
    }

    // 3. Upsert employee record
    const { error: upsertErr } = await supabase
      .from('employees')
      .upsert({
        employee_code: emp.code,
        dob: emp.dob,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.dept,
        designation: emp.designation,
        join_date: emp.joinDate,
        leave_balance_earned: 12,
        leave_balance_sick: 7,
        is_active: true,
        auth_user_id: authUserId,
      }, { onConflict: 'employee_code' });

    if (upsertErr) {
      console.error(`  ❌ Employee upsert failed: ${upsertErr.message}`);
    } else {
      console.log(`  ✅ Employee record upserted`);
    }
  }

  // Seed policies
  console.log('\n📋 Seeding policies...');
  const policies = [
    { name: 'Employee Onboarding Checklist', category: 'Onboarding', file_name: 'Employee_Onboarding_Checklist.pdf' },
    { name: 'Hiring Requirement Collection Document', category: 'Recruitment', file_name: 'Hiring_Requirement_Collection_Document.pdf' },
    { name: 'Leave Application Policy', category: 'Leave', file_name: 'Leave_Application_Policy.pdf' },
    { name: 'Work From Home Policy', category: 'WFH', file_name: 'WORK_FROM_HOME_POLICY.pdf' },
    { name: 'Employee Handbook v1.0', category: 'Handbook', file_name: 'EMPLOYEE_HANDBOOK.pdf' },
    { name: 'Data Security & Confidentiality Policy', category: 'Security', file_name: 'Data_Security_Policy.pdf' },
    { name: 'Zero Tolerance Policy', category: 'Conduct', file_name: 'Zero_Tolerance_Policy.pdf' },
  ];

  for (const policy of policies) {
    const { error } = await supabase.from('policies').upsert(policy, { onConflict: 'name' });
    if (error) console.error(`  ❌ Policy failed: ${policy.name} — ${error.message}`);
    else console.log(`  ✅ Policy: ${policy.name}`);
  }

  console.log('\n✅ Seed complete!');
  console.log('\nDemo accounts:');
  console.log('  AC001 / 1990-01-15 (Admin)');
  console.log('  AC004 / 1995-11-30 (HR)');
  console.log('  AC005 / 1997-02-10 (Employee)');
  console.log('  IT001 / 1994-05-18 (IT)');
}

seed().catch(console.error);
