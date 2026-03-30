

## Fix: Ensure All Bureau Edge Functions Log to `bureau_api_logs` in Sandbox Mode

### Problem
- **CIBIL**: Sandbox mode block (line 135-138) has **no logging at all** — `logBureauApiCall` is never called.
- **Experian & Equifax**: Sandbox logging exists but is guarded by `if (userId)`. If `reportInfo` lookup fails or returns null, the log is silently skipped.

### Changes

#### 1. `supabase/functions/fetch-cibil-report/index.ts`
Add `logBureauApiCall` in the sandbox block (after line 138), matching the pattern used by Experian/Equifax:
```typescript
// After generating mock data
if (userId) {
  await logBureauApiCall(supabase, {
    reportId, userId, partnerId,
    bureauCode: 'cibil', bureauName: 'CIBIL',
    requestPayload, responseJson: rawCibilData,
    responseStatus: 200, isSandbox: true,
    errorMessage: null, processingTimeMs: Date.now() - startTime
  });
}
```

#### 2. All 3 functions: Remove `if (userId)` guard for sandbox logging
Change the guard from `if (userId)` to always log, using a fallback for `userId`:
```typescript
await logBureauApiCall(supabase, {
  ...
  userId: userId || 'unknown',
  ...
});
```
This ensures logs are never silently dropped. The `bureau_api_logs.user_id` column is `NOT NULL`, so we need a value — we'll use the actual userId which should always exist since we look it up from the report record.

Actually, `user_id` is a `uuid NOT NULL` column, so passing `'unknown'` would fail. The safer fix is to keep the guard but log a warning when userId is missing. Since `credit_reports` always has a `user_id`, this should rarely happen.

#### 3. Redeploy all 3 edge functions
- `fetch-cibil-report`
- `fetch-experian-report`
- `fetch-equifax-report`

### Summary of Changes
| File | Change |
|------|--------|
| `fetch-cibil-report/index.ts` | Add `logBureauApiCall` call in sandbox block |
| `fetch-experian-report/index.ts` | No code change needed (already logs in sandbox) |
| `fetch-equifax-report/index.ts` | No code change needed (already logs in sandbox) |
| All 3 functions | Redeploy to ensure latest code is live |

### Technical Note
The root cause of missing logs was specifically the CIBIL function — it was the only one that never called `logBureauApiCall` during sandbox mode. Experian and Equifax already have this call. All three will be redeployed to ensure consistency.

