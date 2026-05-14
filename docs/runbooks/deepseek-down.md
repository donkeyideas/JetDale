# Runbook: DeepSeek API Down

**Severity:** P1 (all AI generation blocked)
**Last updated:** 2026-05-12
**Owner:** Backend / On-call engineer

---

## Symptoms

- AI-powered features fail: artifact generation, reality checks, workspace chat, discovery follow-ups
- Supabase Edge Function logs show 500 errors with `ECONNREFUSED`, `ETIMEDOUT`, or HTTP 5xx from DeepSeek API
- Users report "Something went wrong" errors during generation
- Admin dashboard shows spike in failed `ai_events` rows

---

## Diagnosis

### 1. Check DeepSeek status

- Visit [DeepSeek API status page](https://status.deepseek.com)
- Check their official channels (X/Twitter, Discord) for incident reports

### 2. Confirm it is DeepSeek and not our code

```bash
# Test the API directly from your machine
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'
```

- If the curl fails with a timeout or 5xx, the problem is on DeepSeek's side
- If the curl succeeds, check edge function logs for a different root cause (bad prompt, token limit, auth key rotation)

### 3. Check Supabase Edge Function logs

```bash
supabase functions logs generate-artifact --limit 50
supabase functions logs reality-check --limit 50
supabase functions logs workspace-chat --limit 50
```

Look for:
- Repeated 5xx responses from DeepSeek
- `DEEPSEEK_API_KEY` environment variable missing or expired
- Rate limit errors (HTTP 429)

---

## Immediate Response

### Enable fallback model flag

1. Open the Supabase dashboard -> Edge Functions -> Environment Variables
2. Set `DEEPSEEK_FALLBACK_ENABLED=true`
3. If a fallback model is configured (e.g., another provider), set `FALLBACK_MODEL_PROVIDER` and `FALLBACK_API_KEY`
4. Redeploy affected edge functions:

```bash
supabase functions deploy generate-artifact
supabase functions deploy reality-check
supabase functions deploy workspace-chat
supabase functions deploy discovery-followup
```

### Notify users

- Post an in-app banner via the admin dashboard: **"AI features are temporarily slower than usual. We are working on it."**
- If the outage is expected to last >30 minutes, post on the status page and social channels

### Reduce load

- If the issue is rate limiting (429), temporarily increase the backoff/retry delay in edge functions
- Consider temporarily reducing free-tier AI rate limits to prioritize paying users

---

## Recovery

1. Monitor DeepSeek status page for resolution
2. Test with the curl command above to confirm the API is responding
3. Disable the fallback flag: set `DEEPSEEK_FALLBACK_ENABLED=false`
4. Redeploy edge functions to pick up the config change
5. Monitor edge function logs for 10 minutes to confirm error rate drops to baseline
6. Remove the in-app banner
7. Update the status page / social channels

---

## Prevention

- [ ] Implement automatic fallback detection (circuit breaker pattern) so manual intervention is not needed
- [ ] Add uptime monitoring for the DeepSeek API endpoint (e.g., Checkly, UptimeRobot)
- [ ] Set up PagerDuty / Opsgenie alert when edge function error rate exceeds 5% over 5 minutes
- [ ] Maintain a tested fallback provider configuration that can be activated with a single flag

---

## Post-Incident

- Write a brief post-mortem if the outage lasted >30 minutes
- Review whether fallback activation was fast enough
- Update this runbook with any new learnings
