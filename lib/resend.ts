import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

const navy = '#0f1a2e';
const gold = '#c8985e';

function emailWrapper(body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0ede8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
  <div style="background:${navy};padding:28px 32px">
    <div style="font-size:.65rem;letter-spacing:3px;color:${gold};text-transform:uppercase">AadhCode Solutions Pvt. Ltd.</div>
    <div style="font-size:1.3rem;color:#fff;margin-top:4px;font-weight:600">SACHHSOFT — Employee Portal</div>
  </div>
  <div style="padding:32px">${body}</div>
  <div style="background:#f5f0ea;padding:20px 32px;text-align:center;font-size:.75rem;color:#8a8a8a">
    © 2026 AadhCode Solutions Pvt. Ltd. | Brand SACHHSOFT<br>
    <em>Confidential | For Internal Use Only</em>
  </div>
</div></body></html>`;
}

export async function sendLeaveRequestEmail({
  employeeName, department, leaveType, startDate, endDate, days, reason, toEmails, ccEmails = [], isHrApplying = false,
}: {
  employeeName: string; department: string; leaveType: string;
  startDate: string; endDate: string; days: number; reason: string;
  toEmails: string[]; ccEmails?: string[]; isHrApplying?: boolean;
}) {
  const body = `
    <h2 style="color:${navy};font-size:1.2rem;margin-bottom:8px">${isHrApplying ? 'HR Leave Request' : 'Leave Request Submitted'}</h2>
    <div style="width:40px;height:2px;background:${gold};margin-bottom:24px"></div>
    ${isHrApplying ? `<p style="font-size:.85rem;color:#5a5a5a;margin-bottom:16px">An HR team member has submitted a leave request and requires your approval.</p>` : ''}
    <table style="width:100%;font-size:.9rem;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#8a8a8a;width:140px">Employee</td><td style="padding:8px 0;font-weight:600">${employeeName}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Department</td><td style="padding:8px 0">${department}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Leave Type</td><td style="padding:8px 0;text-transform:capitalize">${leaveType}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Start Date</td><td style="padding:8px 0">${startDate}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">End Date</td><td style="padding:8px 0">${endDate}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Total Days</td><td style="padding:8px 0;font-weight:700;color:${navy}">${days} day(s)</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Reason</td><td style="padding:8px 0">${reason}</td></tr>
    </table>
    <div style="margin-top:24px;padding:16px;background:rgba(200,152,94,.1);border-radius:8px;border-left:4px solid ${gold};font-size:.85rem;color:#5a5a5a">
      Please review this request and approve or reject it in the HR Portal.
    </div>`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: toEmails,
    cc: ccEmails.length > 0 ? ccEmails : undefined,
    subject: isHrApplying
      ? `[HR Leave Request] ${employeeName} — ${leaveType} — ${days} day(s)`
      : `Leave Request — ${employeeName} — ${leaveType} — ${days} day(s)`,
    html: emailWrapper(body),
  });
}

export async function sendLeaveStatusEmail({
  employeeEmail, employeeName, status, startDate, endDate,
}: {
  employeeEmail: string; employeeName: string; status: 'approved' | 'rejected'; startDate: string; endDate: string;
}) {
  const isApproved = status === 'approved';
  const body = `
    <h2 style="color:${navy};font-size:1.2rem;margin-bottom:8px">
      ${isApproved ? 'Leave Approved' : 'Leave Not Approved'}
    </h2>
    <div style="width:40px;height:2px;background:${gold};margin-bottom:24px"></div>
    <p style="font-size:.9rem;color:#5a5a5a">Dear ${employeeName},</p>
    <p style="font-size:.9rem;color:#5a5a5a">
      Your leave request from <strong>${startDate}</strong> to <strong>${endDate}</strong> has been <strong>${status}</strong>.
    </p>
    ${isApproved
      ? `<div style="margin-top:20px;padding:16px;background:#f0f7ee;border-radius:8px;border-left:4px solid #2e7d32;font-size:.85rem;color:#2e7d32">Your leave has been approved and recorded in the HR system.</div>`
      : `<div style="margin-top:20px;padding:16px;background:#fdf0f0;border-radius:8px;border-left:4px solid #b33a3a;font-size:.85rem;color:#b33a3a">Your leave request was not approved. Please contact HR for more details.</div>`}`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: employeeEmail,
    subject: `${isApproved ? '✅' : '❌'} Leave ${isApproved ? 'Approved' : 'Not Approved'} — ${startDate} to ${endDate}`,
    html: emailWrapper(body),
  });
}

export async function sendHandbookAckEmail({
  employeeName, employeeCode, acknowledgedAt,
}: {
  employeeName: string; employeeCode: string; acknowledgedAt: string;
}) {
  const body = `
    <h2 style="color:${navy};font-size:1.2rem;margin-bottom:8px">Handbook Acknowledged</h2>
    <div style="width:40px;height:2px;background:${gold};margin-bottom:24px"></div>
    <table style="width:100%;font-size:.9rem;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#8a8a8a;width:140px">Employee</td><td style="padding:8px 0;font-weight:600">${employeeName}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Employee Code</td><td style="padding:8px 0">${employeeCode}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Acknowledged At</td><td style="padding:8px 0">${new Date(acknowledgedAt).toLocaleString('en-IN')}</td></tr>
    </table>
    <div style="margin-top:24px;padding:16px;background:#f0f7ee;border-radius:8px;border-left:4px solid #2e7d32;font-size:.85rem;color:#2e7d32">
      The employee has confirmed they have read and understood the SACHHSOFT Employee Handbook.
    </div>`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_HR_DESK!,
    subject: `📖 Handbook Acknowledged — ${employeeName} (${employeeCode})`,
    html: emailWrapper(body),
  });
}

export async function sendEquipmentRequestEmail({
  employeeName, employeeCode, equipmentType, specifications, urgency, notes,
}: {
  employeeName: string; employeeCode: string; equipmentType: string;
  specifications: string; urgency: string; notes?: string | null;
}) {
  const urgencyColors: Record<string, string> = { Critical: '#b33a3a', High: '#e67e22', Normal: '#3a7bd5', Low: '#2e7d32' };
  const uc = urgencyColors[urgency] ?? '#3a7bd5';
  const body = `
    <h2 style="color:${navy};font-size:1.2rem;margin-bottom:8px">Equipment Request</h2>
    <div style="width:40px;height:2px;background:${gold};margin-bottom:24px"></div>
    <table style="width:100%;font-size:.9rem;border-collapse:collapse">
      <tr><td style="padding:8px 0;color:#8a8a8a;width:160px">Requested By</td><td style="padding:8px 0;font-weight:600">${employeeName} (${employeeCode})</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Equipment Type</td><td style="padding:8px 0">${equipmentType}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Specifications</td><td style="padding:8px 0">${specifications}</td></tr>
      <tr><td style="padding:8px 0;color:#8a8a8a">Urgency</td><td style="padding:8px 0"><span style="color:${uc};font-weight:700">${urgency}</span></td></tr>
      ${notes ? `<tr><td style="padding:8px 0;color:#8a8a8a">Notes</td><td style="padding:8px 0">${notes}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px;padding:16px;background:rgba(200,152,94,.1);border-radius:8px;border-left:4px solid ${gold};font-size:.85rem;color:#5a5a5a">
      Please review this request and process it in the equipment management system.
    </div>`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: process.env.EMAIL_IT_ADMIN!,
    subject: `🖥️ Equipment Request — ${equipmentType} — ${urgency} — ${employeeName}`,
    html: emailWrapper(body),
  });
}

export async function sendOnboardingWelcomeEmail({
  newHireName, designation, department, personalEmail, workEmail, employeeCode, dob,
}: {
  newHireName: string; designation: string; department: string;
  personalEmail: string; workEmail: string; employeeCode: string; dob: string;
}) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://portal.sachhsoft.com';
  const body = `
    <h2 style="color:${navy};font-size:1.2rem;margin-bottom:8px">Welcome to SACHHSOFT, ${newHireName}!</h2>
    <div style="width:40px;height:2px;background:${gold};margin-bottom:24px"></div>
    <p style="font-size:.9rem;color:#5a5a5a;margin-bottom:20px">
      We are thrilled to have you join the SACHHSOFT family as <strong>${designation}</strong> in the <strong>${department}</strong> team. Your official onboarding has been completed. Here are your details:
    </p>

    <div style="background:#f5f0ea;border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <div style="font-size:.7rem;letter-spacing:2px;color:${gold};text-transform:uppercase;margin-bottom:12px">Your Official Details</div>
      <table style="width:100%;font-size:.9rem;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#8a8a8a;width:160px">Employee Code</td><td style="padding:7px 0;font-weight:700;color:${navy};font-family:monospace">${employeeCode}</td></tr>
        <tr><td style="padding:7px 0;color:#8a8a8a">Work Email</td><td style="padding:7px 0;font-weight:600"><a href="mailto:${workEmail}" style="color:#2563eb;text-decoration:none">${workEmail}</a></td></tr>
        <tr><td style="padding:7px 0;color:#8a8a8a">Designation</td><td style="padding:7px 0">${designation}</td></tr>
        <tr><td style="padding:7px 0;color:#8a8a8a">Department</td><td style="padding:7px 0">${department}</td></tr>
      </table>
    </div>

    <div style="background:#fff8f0;border:1px solid ${gold};border-radius:10px;padding:20px 24px;margin-bottom:24px">
      <div style="font-size:.7rem;letter-spacing:2px;color:${gold};text-transform:uppercase;margin-bottom:12px">HR Portal Login</div>
      <p style="font-size:.85rem;color:#5a5a5a;margin-bottom:12px">You can access your Employee Handbook, Company Policies, Leave Management, and more on the SACHHSOFT HR Portal.</p>
      <table style="width:100%;font-size:.9rem;border-collapse:collapse">
        <tr><td style="padding:7px 0;color:#8a8a8a;width:160px">Portal Link</td><td style="padding:7px 0"><a href="${portalUrl}" style="color:${gold};font-weight:600">${portalUrl}</a></td></tr>
        <tr><td style="padding:7px 0;color:#8a8a8a">Login ID</td><td style="padding:7px 0;font-family:monospace;font-weight:600">${employeeCode}</td></tr>
        <tr><td style="padding:7px 0;color:#8a8a8a">Date of Birth</td><td style="padding:7px 0;font-family:monospace;white-space:nowrap">${dob} <span style="font-size:.75rem;color:#8a8a8a">(Used as your portal login password — keep this confidential)</span></td></tr>
      </table>
    </div>

    <div style="margin-top:20px;padding:16px;background:rgba(200,152,94,.08);border-radius:8px;border-left:4px solid ${gold};font-size:.85rem;color:#5a5a5a">
      <strong>Action Required:</strong> Please log in to the HR Portal to read and acknowledge the Employee Handbook and Company Policies.
    </div>

    <p style="font-size:.85rem;color:#8a8a8a;margin-top:24px">If you have any questions, please reach out to your HR team. We look forward to working with you!</p>
  `;

  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: personalEmail,
    cc: process.env.EMAIL_HR_DESK,
    subject: `🎉 Welcome to SACHHSOFT, ${newHireName}! Your onboarding details inside.`,
    html: emailWrapper(body),
  });
}
