# Runbook: Bad Deploy Rollback

**Severity:** Varies (P1 if critical flows broken, P2 if partial)
**Last updated:** 2026-05-12
**Owner:** Engineering lead / On-call engineer

---

## Symptoms

- New deploy causes errors visible in logs, crash reporting, or user reports
- Error rate spikes immediately after a deployment
- Features that previously worked are now broken
- App crashes on launch (mobile) or shows white screen (web)

---

## Identify What Was Deployed

Before rolling back, confirm which component was deployed and when:

| Component | Deployment Method | How to Check |
|-----------|-------------------|-------------|
| Mobile app (Expo) | EAS Update (OTA) or EAS Build | `eas update:list` or Expo dashboard |
| Admin dashboard (Next.js) | Vercel | Vercel dashboard -> Deployments |
| Marketing site | Vercel | Vercel dashboard -> Deployments |
| Edge functions (Supabase) | `supabase functions deploy` | Supabase dashboard -> Edge Functions |
| Database migrations | `supabase db push` | `supabase migration list` |

---

## Rollback: Mobile App (Expo / EAS Update)

### OTA update rollback

If the bad deploy was an OTA update (EAS Update):

```bash
# List recent updates
eas update:list --branch production --limit 10

# Identify the last known good update ID
# Then republish the previous good update
eas update --branch production --message "Rollback to previous version"
```

Alternatively, roll back by redeploying from the last known good commit:

```bash
git checkout <last-good-commit>
eas update --branch production --message "Rollback: reverting bad deploy"
```

### Native build rollback

If the bad deploy was a new native build (App Store / Play Store):

- **App Store (iOS):** Use App Store Connect to "Remove from Sale" or expedite a hotfix review
- **Google Play:** Use the Play Console to halt the staged rollout or roll back to the previous version
- **Immediate mitigation:** Push an OTA update that reverts the JS bundle while the native rollback propagates

### Verify

1. Open the app on a test device
2. Force-close and reopen to pick up the new OTA update
3. Confirm the previous behavior is restored
4. Check Expo dashboard for update adoption percentage

---

## Rollback: Admin Dashboard / Marketing Site (Vercel)

Vercel supports instant rollback to any previous deployment.

### Steps

1. Go to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the project (admin dashboard or marketing site)
3. Click **Deployments**
4. Find the last known good deployment (the one before the bad deploy)
5. Click the **three-dot menu** on that deployment -> **Promote to Production**
6. Confirm the promotion

### Verify

1. Visit the production URL
2. Hard-refresh (Ctrl+Shift+R) to bypass cache
3. Confirm the site is functioning correctly
4. Check Vercel's function logs for any remaining errors

### Alternative: CLI rollback

```bash
# List recent deployments
vercel ls --limit 10

# Promote a specific deployment to production
vercel promote <deployment-url>
```

---

## Rollback: Supabase Edge Functions

### Redeploy previous version

```bash
# Check out the last known good commit
git checkout <last-good-commit>

# Redeploy the specific function(s) that were changed
supabase functions deploy generate-artifact
supabase functions deploy reality-check
supabase functions deploy workspace-chat
supabase functions deploy revenuecat-webhook
supabase functions deploy stripe-webhook
```

### If you do not know which function broke

```bash
# Check logs for all functions
supabase functions logs --limit 100

# Redeploy ALL functions from the last good commit
supabase functions deploy
```

### Verify

1. Check edge function logs for error rate
2. Test the affected endpoints manually (curl or Postman)
3. Confirm the mobile app and admin dashboard can call the functions successfully

---

## Rollback: Database Migrations

**WARNING:** Database rollbacks are the most dangerous. Migrations that add columns or tables are generally safe to leave in place. Migrations that drop columns, rename tables, or change constraints may require a manual rollback.

### If the migration only added things (safe)

- Leave the migration in place
- Roll back the application code that depends on it
- The unused columns/tables are harmless

### If the migration changed or removed things (dangerous)

1. Write a reverse migration:
   ```sql
   -- Example: re-add a dropped column
   ALTER TABLE projects ADD COLUMN old_column_name TEXT;
   ```
2. Apply it via the SQL Editor in the Supabase dashboard (for speed) or via `supabase db push`
3. Verify data integrity after the reverse migration

### If data was lost

- Check if a Point-in-Time Recovery (PITR) backup is available (Supabase Pro plan)
- Contact Supabase support if PITR is needed
- Restore the specific table(s) from backup, not the entire database

---

## General Rollback Checklist

- [ ] Identify the bad deploy component (mobile, web, edge functions, database)
- [ ] Confirm the last known good version/commit/deployment
- [ ] Execute the rollback using the steps above
- [ ] Verify the rollback resolved the issue
- [ ] Monitor logs and error rates for 15 minutes
- [ ] Communicate the resolution to the team
- [ ] If users were impacted, post an update (see incident-comms-template.md)

---

## Prevention

- [ ] Use staged rollouts for mobile (EAS: percentage-based rollout)
- [ ] Use Vercel preview deployments to test before promoting to production
- [ ] Run the test suite (`pnpm test`) before every deploy
- [ ] Tag every production deploy with the git commit SHA for easy rollback
- [ ] Keep database migrations backward-compatible (additive only where possible)
- [ ] Implement feature flags for risky changes so they can be toggled without a deploy

---

## Post-Incident

- Identify why the bad deploy was not caught in staging/preview
- Add a regression test for the specific failure
- Review the deploy pipeline for missing checks
- Update this runbook with any new learnings
