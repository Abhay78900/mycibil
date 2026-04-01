

# Razorpay Payment Integration Plan

## What You Need (Requirements)

To integrate Razorpay for real payments, you need to provide **two secrets**:

1. **RAZORPAY_KEY_ID** — Your Razorpay publishable/API Key ID (starts with `rzp_test_` or `rzp_live_`)
2. **RAZORPAY_KEY_SECRET** — Your Razorpay API Key Secret

You can get both from: **Razorpay Dashboard → Settings → API Keys → Generate Key**

> Use `rzp_test_` keys for testing, switch to `rzp_live_` for production.

---

## How It Will Work

```text
User clicks "Pay ₹X"
       │
       ▼
Frontend calls Edge Function: create-razorpay-order
       │  (creates order with real amount on Razorpay servers)
       ▼
Razorpay Checkout modal opens in browser
       │  (user pays via UPI/Card/NetBanking/Wallet)
       ▼
On success, frontend calls Edge Function: verify-razorpay-payment
       │  (server-side HMAC SHA256 signature verification)
       ▼
Payment verified → Report unlocked → Bureau APIs called
```

---

## Implementation Steps

### 1. Add Razorpay Secrets
Store `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as backend secrets (you'll be prompted to enter them).

### 2. Add Razorpay Key ID to Frontend
Store `RAZORPAY_KEY_ID` as a public key in the codebase (it's a publishable key, safe for frontend).

### 3. Create Edge Function: `create-razorpay-order`
- Accepts `amount`, `reportId`, `currency` (INR)
- Calls Razorpay Orders API to create an order server-side
- Returns `order_id` to frontend

### 4. Create Edge Function: `verify-razorpay-payment`
- Accepts `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`
- Verifies signature using HMAC SHA256 with the secret key
- On success: updates transaction status, unlocks report
- Returns verification result

### 5. Update Payment.tsx
- Remove the fake card form entirely
- Load Razorpay checkout script dynamically
- On "Pay" click → call `create-razorpay-order` → open Razorpay modal
- On modal success → call `verify-razorpay-payment` → fetch bureau reports → navigate to report
- Handle modal dismiss/failure gracefully

### 6. Update CheckScore.tsx (minor)
- Ensure the transaction record stores `payment_method: 'razorpay'` and `payment_gateway: 'razorpay'`

---

## What Changes

| File | Change |
|------|--------|
| `supabase/functions/create-razorpay-order/index.ts` | **New** — creates Razorpay order |
| `supabase/functions/verify-razorpay-payment/index.ts` | **New** — verifies payment signature |
| `src/pages/Payment.tsx` | **Replace** fake card form with Razorpay checkout |
| `index.html` | **Add** Razorpay checkout script tag |

