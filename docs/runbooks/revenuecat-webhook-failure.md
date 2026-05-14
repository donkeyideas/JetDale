# Runbook: RevenueCat Webhook Failure

**Severity:** P2 (payments affected, data becomes stale)
**Last updated:** 2026-05-12
**Owner:** Backend / Billing engineer

---

## Symptoms

- Users report they purchased a subscription but still see the free tier
- `subscriptions` table in the database shows stale `status` values (e.g., still `active` after cancellation, or still `free` after purchase)
- RevenueCat dashboard shows successful transactions that are not reflected in Jetdale
- Edge function logs for the webhook endpoint show no recent invocations or show errors
- Admin dashboard KPIs (MRR, active subscribers) stop changing

---

## Diagnosis

### 1. Check RevenueCat webhook delivery

1. Log in to the [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to **Project Settings** -> **Integrations** -> **Webhooks**
3. Check the **Failed Deliveries** tab
4. Look for:
   - HTTP 4xx or 5xx responses from our endpoint
   - Timeout errors
   - DNS resolution failures

### 2. Verify the webhook URL is correct

The webhook URL should be:
```
https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
```

Confirm this matches what is configured in RevenueCat.

### 3. Verify the shared secret

RevenueCat signs webhook payloads with a shared secret. Check that the secret in our edge function environment matches the one in RevenueCat:

1. **RevenueCat:** Project Settings -> Webhooks -> Authorization Header value
2. **Supabase:** Edge Functions -> Environment Variables -> `REVENUECAT_WEBHOOK_SECRET`

If these do not match, all webhooks will be rejected with 401.

### 4. Check edge function logs

```bash
supabase functions logs revenuecat-webhook --limit 50
```

Look for:
- `401 Unauthorized` — shared secret mismatch
- `400 Bad Request` — payload parsing error (RevenueCat schema change?)
- `500 Internal Server Error` — our handler code crashed
- No logs at all — webhook URL is wrong or the function is not deployed

### 5. Check the database

```sql
-- Recent subscription updates (should show recent timestamps)
SELECT id, user_id, plan_tier, status, updated_at
FROM subscriptions
ORDER BY updated_at DESC
LIMIT 20;

-- Check for stuck "trialing" or "past_due" that should have transitioned
SELECT id, user_id, plan_tier, status, updated_at
FROM subscriptions
WHERE status IN ('trialing', 'past_due')
  AND updated_at < NOW() - INTERVAL '24 hours';
```

---

## Immediate Response

### 1. Fix the root cause

- **Secret mismatch:** Update `REVENUECAT_WEBHOOK_SECRET` in Supabase Edge Function env vars and redeploy
- **URL wrong:** Update the webhook URL in RevenueCat dashboard
- **Function not deployed:** Deploy the function:
  ```bash
  supabase functions deploy revenuecat-webhook
  ```
- **Code bug:** Fix the handler, deploy, and test with a manual webhook

### 2. Replay failed webhooks

1. In the RevenueCat dashboard, go to **Webhooks** -> **Failed Deliveries**
2. Select all failed events
3. Click **Retry** to replay them
4. Monitor edge function logs to confirm they are being processed

### 3. Reconcile subscription state

If webhooks were missed for an extended period, reconcile manually:

```bash
# Use RevenueCat's REST API to fetch current subscriber state
curl -X GET "https://api.revenuecat.com/v1/subscribers/<app_user_id>" \
  -H "Authorization: Bearer <REVENUECAT_API_KEY>"
```

For bulk reconciliation, write a script that:
1. Fetches all active subscribers from RevenueCat
2. Compares with the `subscriptions` table
3. Updates any mismatched records

```sql
-- Example manual fix for a specific user
UPDATE subscriptions
SET plan_tier = 'pro',
    status = 'active',
    updated_at = NOW()
WHERE user_id = '<user-uuid>';
```

### 4. Notify affected users (if needed)

If users paid but did not receive access:
- Send a targeted email or in-app notification apologizing for the delay
- Confirm their subscription is now active
- Consider offering a small credit or extended trial as goodwill

---

## Recovery

1. Verify webhook deliveries are succeeding (check RevenueCat dashboard, 200 responses)
2. Confirm new purchases immediately update the `subscriptions` table
3. Spot-check 3-5 recent subscribers to ensure plan tier matches RevenueCat state
4. Verify admin dashboard KPIs are updating again
5. Monitor for 24 hours to catch any recurring failures

---

## Prevention

- [ ] Set up RevenueCat webhook failure alerts (RevenueCat supports email notifications for failed deliveries)
- [ ] Add a daily reconciliation job that compares RevenueCat subscriber state with the database
- [ ] Monitor the `revenuecat-webhook` edge function for error rate spikes
- [ ] Store the raw webhook payload in a `webhook_events` table for audit and replay
- [ ] Add an admin tool to manually trigger subscription reconciliation for a specific user
- [ ] Test webhook delivery after every edge function deployment

---

## Post-Incident

- Determine how many users were affected and for how long
- Verify all affected subscriptions have been reconciled
- Add automated monitoring for webhook delivery health
- Update this runbook with the specific root cause
