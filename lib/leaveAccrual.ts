const MONTHLY_SICK_ACCRUAL = 7 / 12;
const CASUAL_CAP = 12;
const SICK_CAP = 7;

export interface AccrualState {
  leave_balance_casual: number;
  leave_balance_sick: number;
  probation_hold_casual: number;
  probation_hold_sick: number;
  advance_used_casual: number;
  advance_used_sick: number;
}

// Pure function, no DB access — kept separate from the cron route so the
// accrual/probation/reset logic can be exercised directly with fixed dates.
export function computeMonthlyAccrual(
  joinDate: string,
  current: AccrualState,
  today: Date
): AccrualState {
  let { leave_balance_casual, leave_balance_sick, probation_hold_casual, probation_hold_sick, advance_used_casual, advance_used_sick } = current;

  // No carry-forward: usable balance resets to 0 every Jan 1st.
  // Probation hold and any outstanding advance are tied to employment tenure /
  // a real debt, not the calendar year, so neither is touched by this reset.
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

    // This month's accrual pays down any outstanding advance first (leave already
    // taken ahead of being earned); only the leftover, if any, becomes usable.
    let monthlyCasual = 1;
    if (advance_used_casual > 0) {
      const payoff = Math.min(advance_used_casual, monthlyCasual);
      advance_used_casual -= payoff;
      monthlyCasual -= payoff;
    }
    leave_balance_casual += monthlyCasual;

    let monthlySick = MONTHLY_SICK_ACCRUAL;
    if (advance_used_sick > 0) {
      const payoff = Math.min(advance_used_sick, monthlySick);
      advance_used_sick -= payoff;
      monthlySick -= payoff;
    }
    leave_balance_sick += monthlySick;
  }

  leave_balance_casual = Math.min(leave_balance_casual, CASUAL_CAP);
  leave_balance_sick = Math.min(leave_balance_sick, SICK_CAP);

  return { leave_balance_casual, leave_balance_sick, probation_hold_casual, probation_hold_sick, advance_used_casual, advance_used_sick };
}
