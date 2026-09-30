const MONTHLY_SICK_ACCRUAL = 7 / 12;
const CASUAL_CAP = 12;
const SICK_CAP = 7;

export interface AccrualState {
  leave_balance_casual: number;
  leave_balance_sick: number;
  probation_hold_casual: number;
  probation_hold_sick: number;
}

// Pure function, no DB access — kept separate from the cron route so the
// accrual/probation/reset logic can be exercised directly with fixed dates.
export function computeMonthlyAccrual(
  joinDate: string,
  current: AccrualState,
  today: Date
): AccrualState {
  let { leave_balance_casual, leave_balance_sick, probation_hold_casual, probation_hold_sick } = current;

  // No carry-forward: usable balance resets to 0 every Jan 1st.
  // Probation hold is tied to employment tenure, not the calendar year, so it is untouched here.
  if (today.getUTCMonth() === 0 && today.getUTCDate() === 1) {
    leave_balance_casual = 0;
    leave_balance_sick = 0;
  }

  const join = new Date(`${joinDate}T00:00:00Z`);
  const probationEnd = new Date(Date.UTC(join.getUTCFullYear(), join.getUTCMonth() + 3, join.getUTCDate()));

  if (today < probationEnd) {
    probation_hold_casual += 1;
    probation_hold_sick += MONTHLY_SICK_ACCRUAL;
  } else {
    // Release any pending hold the moment probation is over, regardless of which
    // month that falls in — works whether the hold came from this cron or from
    // a one-time data migration.
    if (probation_hold_casual > 0 || probation_hold_sick > 0) {
      leave_balance_casual += probation_hold_casual;
      leave_balance_sick += probation_hold_sick;
      probation_hold_casual = 0;
      probation_hold_sick = 0;
    }
    leave_balance_casual += 1;
    leave_balance_sick += MONTHLY_SICK_ACCRUAL;
  }

  leave_balance_casual = Math.min(leave_balance_casual, CASUAL_CAP);
  leave_balance_sick = Math.min(leave_balance_sick, SICK_CAP);

  return { leave_balance_casual, leave_balance_sick, probation_hold_casual, probation_hold_sick };
}
