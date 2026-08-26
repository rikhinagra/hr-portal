import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: reviewer } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!reviewer) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isAdminOrHr = reviewer.role === 'admin' || reviewer.role === 'hr';
    const isManager = reviewer.role === 'manager';

    if (!isAdminOrHr && !isManager) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id, review_month,
      rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
      rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
      key_achievements, key_strengths, development_areas, notable_challenges,
      managers_remarks, overall_rating,
    } = body;

    const ratings = [
      rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
      rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
    ];

    if (!employee_id || !review_month || ratings.some(r => r === undefined || r === null) || overall_rating === undefined || overall_rating === null) {
      return NextResponse.json({ error: 'All ratings and review month are required.' }, { status: 400 });
    }

    if (ratings.some(r => r < 1 || r > 5) || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json({ error: 'Ratings must be between 1 and 5.' }, { status: 400 });
    }

    if (employee_id === reviewer.id) {
      return NextResponse.json({ error: 'You cannot submit a review for yourself.' }, { status: 403 });
    }

    const { data: targetEmployee } = await serviceClient
      .from('employees').select('role, reporting_manager_email').eq('id', employee_id).single();

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
    }

    // Admins are never reviewable, regardless of who is submitting
    if (targetEmployee.role === 'admin') {
      return NextResponse.json({ error: 'Admins cannot be reviewed.' }, { status: 403 });
    }

    // Manager can only review their own direct reports
    if (isManager && targetEmployee.reporting_manager_email !== reviewer.email) {
      return NextResponse.json({ error: 'Access denied. You can only review your direct reports.' }, { status: 403 });
    }

    const { data: review, error: insertError } = await serviceClient
      .from('performance_reviews')
      .insert({
        employee_id, reviewed_by: reviewer.id, review_month,
        rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
        rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
        key_achievements, key_strengths, development_areas, notable_challenges,
        managers_remarks, overall_rating,
      })
      .select('*, employee:employee_id(id, name, employee_code, department, reporting_manager_email), reviewer:reviewed_by(id, name)')
      .single();

    if (insertError) throw insertError;

    await serviceClient.from('activity_log').insert({
      action: 'performance_review_submitted',
      description: `${reviewer.name} submitted a performance review for ${review.employee?.name ?? 'Unknown'} (${review_month})`,
      performed_by: reviewer.id,
      target_employee_id: employee_id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, review });
  } catch (err) {
    console.error('Performance review POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
