

## Problem Analysis: Credit Report Response Not Showing Properly

### Root Cause Found

The **Payment page (`Payment.tsx`) never calls any bureau edge functions**. Instead, it:

1. Simulates a 2-second delay (line 65)
2. Generates **random mock scores** directly in the browser (lines 68-73)
3. Writes these mock scores directly to the `credit_reports` table (lines 80-102)
4. **Never stores any `raw_<bureau>_data`** — those columns remain `null`
5. Navigates to the Credit Report page

Since `raw_cibil_data`, `raw_experian_data`, `raw_equifax_data`, and `raw_crif_data` are all **null** in the database, the `FullCreditReportView` falls back to the mock template from `mockReportData.ts` — which shows generic placeholder data, not real or even sandbox-generated bureau reports.

**In short: the edge functions you've built and logged are never actually called during the payment/report generation flow.**

### Secondary Issues

| # | Issue | Location |
|---|-------|----------|
| 1 | **Edge functions never invoked** — Payment.tsx generates random scores client-side without calling `fetch-cibil-report`, `fetch-experian-report`, `fetch-equifax-report`, or `fetch-crif-report` | `src/pages/Payment.tsx` lines 55-128 |
| 2 | **CIBIL duplicate sandbox logging** — `logBureauApiCall` is called inside the sandbox block (lines 141-154) AND again after the if/else (lines 327-342), creating 2 log entries per call | `supabase/functions/fetch-cibil-report/index.ts` |
| 3 | **CRIF userId fallback is invalid** — `userId = reportRow?.user_id ?? 'unknown'` will fail on insert since `bureau_api_logs.user_id` is `uuid NOT NULL` | `supabase/functions/fetch-crif-report/index.ts` line 60 |

### Solution

#### 1. Fix `Payment.tsx` — Call Bureau Edge Functions After Payment

Replace the mock score generation with actual calls to the bureau edge functions using the existing `useBureauApi` hook:

```
Payment flow (after payment success):
1. Update transaction status to 'success'
2. Update report_status to 'unlocked'
3. Call fetchMultipleBureaus() with the report's selected_bureaus
4. Wait for all bureau calls to complete
5. Navigate to /report/{reportId}
```

This will:
- Invoke the edge functions (sandbox or production)
- Store `raw_<bureau>_data` in the database
- Log API calls to `bureau_api_logs`
- Let `FullCreditReportView` render actual data (not fallback templates)

#### 2. Fix CIBIL Duplicate Logging

Remove the second `logBureauApiCall` block at lines 327-342 in `fetch-cibil-report/index.ts`. The sandbox logging at lines 141-154 already handles it.

#### 3. Fix CRIF userId Fallback

Change line 60 in `fetch-crif-report/index.ts` from:
```typescript
const userId = reportRow?.user_id ?? 'unknown';
```
to:
```typescript
const userId = reportRow?.user_id ?? null;
```
Then guard all `logBureauApiCall` calls with `if (userId)`.

### Files to Change
| File | Change |
|------|--------|
| `src/pages/Payment.tsx` | Replace mock score generation with `useBureauApi.fetchMultipleBureaus()` calls |
| `supabase/functions/fetch-cibil-report/index.ts` | Remove duplicate sandbox logging (lines 327-342) |
| `supabase/functions/fetch-crif-report/index.ts` | Fix `userId` fallback from `'unknown'` to `null` with guard |

