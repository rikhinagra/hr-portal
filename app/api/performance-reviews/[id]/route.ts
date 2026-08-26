import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceClient = createServiceClient();
    const { data: editor } = await serviceClient
      .from('employees').select('*').eq('auth_user_id', user.id).single();
    if (!editor) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const isAdminOrHr = editor.role === 'admin' || editor.role === 'hr';
    const isManager = editor.role === 'manager';

    if (!isAdminOrHr && !isManager) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const { data: review } = await serviceClient
      .from('performance_reviews')
      .select('*, employee:employee_id(reporting_manager_email)')
      .eq('id', id)
      .single();

    if (!review) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });

    // Manager can only edit reviews for their own direct reports
    if (isManager) {
      const emp = review.employee as { reporting_manager_email?: string } | null;
      if (emp?.reporting_manager_email !== editor.email) {
        return NextResponse.json({ error: 'Access denied. You can only edit reviews for your direct reports.' }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      review_month,
      rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
      rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
      key_achievements, key_strengths, development_areas, notable_challenges,
      managers_remarks, overall_rating,
    } = body;

    const ratings = [
      rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
      rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
    ];

    if (!review_month || ratings.some(r => r === undefined || r === null) || overall_rating === undefined || overall_rating === null) {
      return NextResponse.json({ error: 'All ratings and review month are required.' }, { status: 400 });
    }

    if (ratings.some(r => r < 1 || r > 5) || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json({ error: 'Ratings must be between 1 and 5.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await serviceClient
      .from('performance_reviews')
      .update({
        review_month,
        rating_quality_timeliness, rating_ownership_accountability, rating_communication_collaboration,
        rating_role_specific_skills, rating_initiative_proactiveness, rating_punctuality_conduct,
        key_achievements, key_strengths, development_areas, notable_challenges,
        managers_remarks, overall_rating,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, employee:employee_id(id, name, employee_code, department, reporting_manager_email), reviewer:reviewed_by(id, name)')
      .single();

    if (updateError) throw updateError;

    await serviceClient.from('activity_log').insert({
      action: 'performance_review_updated',
      description: `${editor.name} updated the performance review for ${updated.employee?.name ?? 'Unknown'} (${review_month})`,
      performed_by: editor.id,
      target_employee_id: updated.employee_id,
      action_type: 'info',
    });

    return NextResponse.json({ success: true, review: updated });
  } catch (err) {
    console.error('Performance review PATCH error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
