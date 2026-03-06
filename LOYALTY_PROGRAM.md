# Worker Loyalty Program - Rules and Operations

This document defines how loyalty points are awarded/deducted for workers (painters/staff), how limits work, and how payout is calculated.

## 1) Program Purpose

The loyalty program is used to improve discipline, work quality, and customer experience.

Core objectives:

- Reward responsible and reliable behavior.
- Penalize behavior that causes complaints/rework/delay.
- Keep scoring transparent and auditable.
- Motivate workers via personal points view and leaderboard.

## 2) Point Value and Payout Policy

- **Point value:** `1 point = Rs. 1`
- **Payout cycle:** Loyalty payout is calculated **weekly**.
- **Separation rule:** Loyalty payout is **separate** from main wage payroll.
  - Main wage payroll = attendance units x daily wage - advances.
  - Loyalty payout = weekly net loyalty points x Rs.1.

## 3) Daily Earning Limit

- A worker can **earn at most 100 points per day**.
- Only positive entries (`credit`) count toward this cap.
- If admin tries to add credits beyond the cap, the system rejects the request.

## 4) Entry Types

Each loyalty update is stored as a ledger entry.

### 4.1 Credit

Used when worker performs positively.
Credit is used for measurable positive behavior that improves:
- quality
- speed without rework
- customer satisfaction
- team discipline
- safety and material care

### 4.2 Debit

Used when worker behavior causes business/customer issues.
Debit is used for measurable issues that increase:
- complaints
- delays
- waste
- safety risk
- supervision effort

## 5) Categories (Standardized)

These categories are **universal** and work across all interior services:
painting, tiling, POP, carpentry, waterproofing, polishing, and finishing work.

Admins must always choose a category and add a clear reason/note.

### 5.1 Credit Reasons (Give Points)

- `on_time`: reached site/start area on time.
- `attendance_consistency`: no unplanned absences in the week.
- `quality_work`: clean finish, proper line/level/edge, good workmanship.
- `zero_rework_day`: completed assigned work with no rework on that day.
- `productivity_target_met`: achieved agreed daily target.
- `ahead_of_schedule`: completed milestone before expected time.
- `customer_praise`: direct positive feedback from client/family.
- `site_cleanliness`: maintained clean site during and after work.
- `material_saving`: reduced wastage of paint/tile/adhesive/grout/etc.
- `tool_care`: proper handling and return of tools/equipment.
- `safety_followed`: used PPE and followed safety checks.
- `team_support`: helped team unblock critical work.
- `issue_reporting`: proactively reported site issue before escalation.
- `professional_behavior`: polite and respectful behavior at site.
- `documentation_support`: helped with progress photos/checklist accuracy.

### 5.2 Debit Reasons (Deduct Points)

- `late_arrival`: repeated or major delay in reporting to site.
- `unauthorized_absence`: absent without prior approval.
- `early_leave_without_approval`: left work before time without permission.
- `customer_complaint`: verified customer complaint about behavior/work.
- `rework_needed`: work failed quality check and required rework.
- `damage_to_work`: damaged finished surface or installed material.
- `material_wastage`: avoidable excess use/spillage/breakage.
- `unsafe_practice`: ignored PPE or safety process.
- `site_mess`: left site unclean despite instruction.
- `tool_damage_or_loss`: negligence causing tool damage/loss.
- `instruction_non_compliance`: did not follow supervisor instructions.
- `misconduct`: rude behavior, argument, abusive language.
- `mobile_misuse`: excessive phone use impacting productivity.
- `false_update`: incorrect status/report shared intentionally.
- `delay_caused_to_team`: blocked dependent tasks due to negligence.

### 5.3 Suggested Point Ranges

Use these ranges for consistency (admin discretion allowed):

- Minor positive event: `+2` to `+5`
- Major positive event: `+6` to `+15`
- Minor issue: `-2` to `-5`
- Major issue: `-6` to `-20`

Do not award random points without evidence/observation.
For high-impact events, add note with context.

### 5.4 Guardrails

- Daily earn cap is hard limit: max `+100` credit points/day per worker.
- Debit points are not blocked by daily earn cap.
- Duplicate entries for same issue should be avoided.
- If event is disputed, add factual note and supervisor reference.

## 6) Data and Audit Design

Every update is a new ledger row.

Each row stores:
- Worker
- Date
- Entry type (credit/debit)
- Points
- Category
- Reason
- Optional note
- Admin user id (who made the update)

This design keeps complete history and prevents hidden overwrites.

## 7) Weekly Calculation Logic

For each worker and week:

- `earnedPoints = sum(all credit points)`
- `deductedPoints = sum(all debit points)`
- `netPoints = earnedPoints - deductedPoints`
- `weeklyPayoutRupees = max(0, netPoints) * 1`

Notes:
- If net points are negative, weekly payout is 0 (no negative cash payout).
- Negative points still impact ranking and monthly total.

## 8) Payroll Integration

Monthly payroll summary now includes loyalty metrics in addition to wage metrics.

### Wage section (existing)
- total units
- attendance days
- gross wage
- advances
- net payable

### Loyalty section (new)
- total points (month)
- earned points (month)
- deducted points (month)
- point value in rupees
- weekly payout table

## 9) Worker Dashboard Visibility

Worker dashboard shows:
- Monthly loyalty totals.
- Weekly loyalty payout breakdown.
- Weekly leaderboard rankings.

This keeps workers aware of behavior impact in real-time.

## 10) Admin Workflow

Recommended process:

1. Admin checks daily work quality and punctuality.
2. Admin adds credit/debit points with category + reason.
3. System enforces daily max earn (100 points/day).
4. Weekly loyalty payout is computed automatically.

## 11) API Endpoints

### Loyalty entries
- `POST /api/workers/loyalty`
  - Create credit/debit entry (admin only).
  - Enforces daily credit limit.
- `GET /api/workers/loyalty`
  - Returns loyalty entries with optional filters.
- `POST /api/workers/loyalty/reverse`
  - Reverse wrong loyalty entry (admin only).
  - Requires reversal reason.

### Leaderboard
- `GET /api/workers/loyalty/leaderboard?period=weekly|monthly`

### Weekly payout status
- `POST /api/workers/loyalty/payouts`
  - Mark weekly payout as `paid` or `pending` (admin only).
  - Stores payout status separately from wage payroll.

### Payroll summary (with loyalty)
- `GET /api/workers/payroll/summary?workerId=<id>&month=YYYY-MM`

## 12) Validation Rules

- `points` must be positive whole number in request.
- Entry type must be `credit` or `debit`.
- Worker must be active.
- Category and reason are mandatory.
- Date must be valid.

## 13) Operational Recommendations

- Keep reasons specific and factual.
- Avoid emotional/manual bias.
- Review top and low performers weekly.
- Use leaderboard as motivation, not punishment.

## 14) Future Enhancements (Optional)

- Reward redemption catalog (cash/bonus/gift).
- Auto-points from attendance punctuality.
- Complaint linkage with proof attachments.
- Monthly badges/certificates for top performers.
