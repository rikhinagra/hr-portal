'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Employee, PerformanceReview } from '@/types';

type ReviewRow = PerformanceReview & {
  employee: Pick<Employee, 'id' | 'name' | 'employee_code' | 'department' | 'reporting_manager_email'> | null;
  reviewer: Pick<Employee, 'id' | 'name'> | null;
};

interface PerformanceReviewsClientProps {
  employee: Employee;
  initialReviews: ReviewRow[];
  reviewableEmployees: { id: string; name: string; employee_code: string }[];
}

const RATING_FIELDS = [
  { key: 'rating_quality_timeliness', label: 'Quality & Timeliness of Work' },
  { key: 'rating_ownership_accountability', label: 'Ownership & Accountability' },
  { key: 'rating_communication_collaboration', label: 'Communication & Team Collaboration' },
  { key: 'rating_role_specific_skills', label: 'Role-Specific Skills & Competence' },
  { key: 'rating_initiative_proactiveness', label: 'Initiative & Proactiveness' },
  { key: 'rating_punctuality_conduct', label: 'Punctuality & Professional Conduct' },
] as const;

type RatingKey = typeof RATING_FIELDS[number]['key'];

const emptyRatings: Record<RatingKey, number> = {
  rating_quality_timeliness: 3,
  rating_ownership_accountability: 3,
  rating_communication_collaboration: 3,
  rating_role_specific_skills: 3,
  rating_initiative_proactiveness: 3,
  rating_punctuality_conduct: 3,
};

function formatMonth(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function PerformanceReviewsClient({ employee, initialReviews, reviewableEmployees }: PerformanceReviewsClientProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewingReview, setViewingReview] = useState<ReviewRow | null>(null);

  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [reviewMonth, setReviewMonth] = useState('');
  const [ratings, setRatings] = useState<Record<RatingKey, number>>(emptyRatings);
  const [keyAchievements, setKeyAchievements] = useState('');
  const [keyStrengths, setKeyStrengths] = useState('');
  const [developmentAreas, setDevelopmentAreas] = useState('');
  const [notableChallenges, setNotableChallenges] = useState('');
  const [managersRemarks, setManagersRemarks] = useState('');
  const [overallRating, setOverallRating] = useState('');

  const isAdmin = employee.role === 'admin';
  const isAdminOrHr = isAdmin || employee.role === 'hr';
  const isManager = employee.role === 'manager';
  const canReview = isAdminOrHr || isManager;

  const suggestedAverage = (
    RATING_FIELDS.reduce((sum, f) => sum + ratings[f.key], 0) / RATING_FIELDS.length
  ).toFixed(1);

  const resetForm = () => {
    setEditingId(null);
    setTargetEmployeeId('');
    setReviewMonth('');
    setRatings(emptyRatings);
    setKeyAchievements(''); setKeyStrengths(''); setDevelopmentAreas(''); setNotableChallenges('');
    setManagersRemarks(''); setOverallRating('');
  };

  const openEdit = (r: ReviewRow) => {
    setEditingId(r.id);
    setTargetEmployeeId(r.employee_id);
    setReviewMonth(r.review_month.slice(0, 7));
    setRatings({
      rating_quality_timeliness: r.rating_quality_timeliness,
      rating_ownership_accountability: r.rating_ownership_accountability,
      rating_communication_collaboration: r.rating_communication_collaboration,
      rating_role_specific_skills: r.rating_role_specific_skills,
      rating_initiative_proactiveness: r.rating_initiative_proactiveness,
      rating_punctuality_conduct: r.rating_punctuality_conduct,
    });
    setKeyAchievements(r.key_achievements ?? '');
    setKeyStrengths(r.key_strengths ?? '');
    setDevelopmentAreas(r.development_areas ?? '');
    setNotableChallenges(r.notable_challenges ?? '');
    setManagersRemarks(r.managers_remarks ?? '');
    setOverallRating(String(r.overall_rating));
    setShowForm(true);
  };

  const canEditReview = (r: ReviewRow) => {
    if (isAdminOrHr) return true;
    if (isManager) return r.employee?.reporting_manager_email === employee.email;
    return false;
  };

  const submitReview = async () => {
    if (!editingId && !targetEmployeeId) {
      toast.error('Missing Field', { description: 'Please select an employee.' }); return;
    }
    if (!reviewMonth) {
      toast.error('Missing Field', { description: 'Please select a review month.' }); return;
    }
    const overall = Number(overallRating);
    if (!overallRating || isNaN(overall) || overall < 1 || overall > 5) {
      toast.error('Invalid Overall Rating', { description: 'Overall rating must be between 1 and 5.' }); return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employee_id: targetEmployeeId,
        review_month: `${reviewMonth}-01`,
        ...ratings,
        key_achievements: keyAchievements, key_strengths: keyStrengths,
        development_areas: developmentAreas, notable_challenges: notableChallenges,
        managers_remarks: managersRemarks,
        overall_rating: overall,
      };

      const res = editingId
        ? await fetch(`/api/performance-reviews/${editingId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          })
        : await fetch('/api/performance-reviews', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editingId) {
        setReviews(reviews.map(r => r.id === editingId ? data.review : r));
        toast.success('Review Updated');
      } else {
        setReviews([data.review, ...reviews]);
        toast.success('Review Submitted');
      }
      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      toast.error('Error', { description: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading text-2xl">Performance Reviews</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {canReview ? 'Submit and track monthly performance reviews' : 'View your performance review history'}
          </p>
        </div>
        {canReview && reviewableEmployees.length > 0 && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: '#c8985e', color: '#0f1a2e' }}>
            + Add Review
          </button>
        )}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#0f1a2e' }}>
                  {['Employee', 'Review Month', 'Overall Rating', 'Reviewed By', 'Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-white whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {reviews.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">No performance reviews yet.</td></tr>
                ) : reviews.map(r => (
                  <tr key={r.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{r.employee?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{formatMonth(r.review_month)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: '#c8985e' }}>{r.overall_rating} / 5</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.reviewer?.name ?? 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setViewingReview(r)}
                          className="px-3 py-1 rounded text-xs font-semibold"
                          style={{ background: 'rgba(58,123,213,0.1)', color: '#3a7bd5' }}>
                          View
                        </button>
                        {canEditReview(r) && (
                          <button onClick={() => openEdit(r)}
                            className="px-3 py-1 rounded text-xs font-semibold"
                            style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {reviews.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No performance reviews yet.</CardContent></Card>
        ) : reviews.map(r => (
          <Card key={r.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-foreground text-sm">{r.employee?.name ?? 'Unknown'}</div>
                <span className="text-sm font-semibold" style={{ color: '#c8985e' }}>{r.overall_rating} / 5</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">{formatMonth(r.review_month)}</div>
              <div className="text-xs text-muted-foreground mb-3">Reviewed by: <span className="text-foreground font-semibold">{r.reviewer?.name ?? 'Unknown'}</span></div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => setViewingReview(r)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: 'rgba(58,123,213,0.1)', color: '#3a7bd5' }}>
                  View
                </button>
                {canEditReview(r) && (
                  <button onClick={() => openEdit(r)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(200,152,94,0.1)', color: '#c8985e' }}>
                    Edit
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit Review Modal */}
      {showForm && canReview && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl bg-card text-foreground border my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                {editingId ? 'Edit Performance Review' : 'Add Performance Review'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Employee</label>
                  {editingId ? (
                    <div className="w-full px-3 py-2.5 border rounded-lg text-sm bg-muted text-foreground">
                      {reviews.find(r => r.id === editingId)?.employee?.name}
                    </div>
                  ) : (
                    <div className="relative">
                      <select value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)}
                        className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                        <option value="">Select employee</option>
                        {reviewableEmployees.map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Review Month</label>
                  <input type="month" value={reviewMonth} onChange={e => setReviewMonth(e.target.value)}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none" />
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ratings (1 – Needs Improvement to 5 – Outstanding)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {RATING_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-muted-foreground mb-1.5">{f.label}</label>
                      <div className="relative">
                        <select value={ratings[f.key]} onChange={e => setRatings({ ...ratings, [f.key]: Number(e.target.value) })}
                          className="w-full pl-3 pr-9 py-2.5 border rounded-lg text-sm bg-background text-foreground appearance-none">
                          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Key Achievements & Contributions</label>
                <textarea value={keyAchievements} onChange={e => setKeyAchievements(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Key Strengths Demonstrated</label>
                <textarea value={keyStrengths} onChange={e => setKeyStrengths(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Development Areas</label>
                <textarea value={developmentAreas} onChange={e => setDevelopmentAreas(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Notable Challenges / Concerns</label>
                <textarea value={notableChallenges} onChange={e => setNotableChallenges(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Manager's Remarks</label>
                <textarea value={managersRemarks} onChange={e => setManagersRemarks(e.target.value)} rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground resize-y" />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">
                  Overall Performance Rating (1–5) — <span style={{ color: '#c8985e' }}>Suggested: {suggestedAverage}</span>
                </label>
                <input type="text" inputMode="decimal" value={overallRating}
                  onChange={e => {
                    const raw = e.target.value;
                    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
                    setOverallRating(raw);
                  }}
                  placeholder={suggestedAverage}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background text-foreground outline-none" />
              </div>

              <button onClick={submitReview} disabled={submitting}
                className="w-full py-3 rounded-lg font-semibold text-sm"
                style={{ background: submitting ? '#ccc' : '#c8985e', color: '#0f1a2e' }}>
                {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Read-only View Modal */}
      {viewingReview && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="rounded-2xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl bg-card text-foreground border my-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-playfair), serif' }}>
                {viewingReview.employee?.name ?? 'Unknown'}'s Performance Review
              </h3>
              <button onClick={() => setViewingReview(null)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="text-xs text-muted-foreground mb-6">
              {formatMonth(viewingReview.review_month)} · Reviewed by {viewingReview.reviewer?.name ?? 'Unknown'}
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Ratings</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {RATING_FIELDS.map(f => (
                    <div key={f.key} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(200,152,94,0.06)' }}>
                      <span className="text-xs text-muted-foreground">{f.label}</span>
                      <span className="text-sm font-semibold" style={{ color: '#c8985e' }}>{viewingReview[f.key]} / 5</span>
                    </div>
                  ))}
                </div>
              </div>

              {[
                { label: 'Key Achievements & Contributions', value: viewingReview.key_achievements },
                { label: 'Key Strengths Demonstrated', value: viewingReview.key_strengths },
                { label: 'Development Areas', value: viewingReview.development_areas },
                { label: 'Notable Challenges / Concerns', value: viewingReview.notable_challenges },
                { label: "Manager's Remarks", value: viewingReview.managers_remarks },
              ].map(section => (
                <div key={section.label}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{section.label}</div>
                  <p className="text-sm text-foreground" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {section.value?.trim() ? section.value : <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
              ))}

              <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: 'rgba(200,152,94,0.1)' }}>
                <span className="text-sm font-semibold text-foreground">Overall Performance Rating</span>
                <span className="text-xl font-bold" style={{ color: '#c8985e' }}>{viewingReview.overall_rating} / 5</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
