import { getSessionEmployee } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import PerformanceReviewsClient from './PerformanceReviewsClient';

export default async function PerformanceReviewsPage() {
  const employee = await getSessionEmployee();
  if (!employee) return null;

  const supabase = createServiceClient();
  const isAdminOrHr = employee.role === 'admin' || employee.role === 'hr';
  const isManager = employee.role === 'manager';

  let teamMemberIds: string[] = [];
  if (isManager) {
    const { data: teamMembers } = await supabase
      .from('employees')
      .select('id')
      .eq('reporting_manager_email', employee.email)
      .eq('is_active', true);
    teamMemberIds = (teamMembers ?? []).map((m: { id: string }) => m.id);
  }

  const reviewsQuery = supabase
    .from('performance_reviews')
    .select('*, employee:employee_id(id, name, employee_code, department, reporting_manager_email), reviewer:reviewed_by(id, name)')
    .order('review_month', { ascending: false });

  if (isAdminOrHr) {
    // no filter — see all
  } else if (isManager) {
    reviewsQuery.in('employee_id', [...teamMemberIds, employee.id]);
  } else {
    reviewsQuery.eq('employee_id', employee.id);
  }

  const { data: reviews } = await reviewsQuery;

  // Managers/HR/Admin need the list of employees they're allowed to review
  let reviewableEmployees: { id: string; name: string; employee_code: string }[] = [];
  if (isAdminOrHr) {
    const { data } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .eq('is_active', true)
      .neq('role', 'admin')
      .neq('id', employee.id)
      .order('name');
    reviewableEmployees = data ?? [];
  } else if (isManager) {
    const { data } = await supabase
      .from('employees')
      .select('id, name, employee_code')
      .eq('reporting_manager_email', employee.email)
      .eq('is_active', true)
      .order('name');
    reviewableEmployees = data ?? [];
  }

  return (
    <PerformanceReviewsClient
      employee={employee}
      initialReviews={reviews ?? []}
      reviewableEmployees={reviewableEmployees}
    />
  );
}
