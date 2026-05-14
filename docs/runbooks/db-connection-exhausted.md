# Runbook: Database Connection Pool Exhausted

**Severity:** P1 (all endpoints affected)
**Last updated:** 2026-05-12
**Owner:** Backend / On-call engineer

---

## Symptoms

- HTTP 500 errors across all API endpoints (not just AI features)
- Edge functions return timeout errors or "connection refused"
- Supabase client calls fail with `remaining connection slots are reserved for superuser connections`
- Admin dashboard fails to load
- Mobile app shows generic error screens on every action
- PostgREST logs show `FATAL: too many connections for role`

---

## Diagnosis

### 1. Check connection count

Open the **Supabase Dashboard**:
1. Go to **Database** -> **Database Settings**
2. Check the active connection count vs. the maximum allowed
3. Or run the following SQL in the SQL Editor:

```sql
-- Current active connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state
ORDER BY count DESC;

-- Connections by application name (identifies source)
SELECT application_name, state, count(*)
FROM pg_stat_activity
GROUP BY application_name, state
ORDER BY count DESC;

-- Long-running idle connections
SELECT pid, usename, application_name, state, state_change, query
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes'
ORDER BY state_change ASC;
```

### 2. Identify the leak source

- **Edge Functions** — each invocation may open a new connection if not using the pooler
- **PostgREST** — should use connection pooling automatically
- **Realtime** — each subscription holds a connection
- **External tools** — migration scripts, Prisma, or direct connections from dev machines

---

## Immediate Response

### Kill idle connections

Run in the Supabase SQL Editor:

```sql
-- Kill connections idle for more than 5 minutes (adjust threshold as needed)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '5 minutes'
  AND pid <> pg_backend_pid();
```

### Scale the connection pool (if on Supabase Pro or higher)

1. Go to **Supabase Dashboard** -> **Database** -> **Connection Pooling**
2. Increase the pool size (default is often 15 for free tier, 50+ for Pro)
3. Ensure **PgBouncer** mode is set to `transaction` (not `session`)

### Verify edge functions use the pooler URL

Edge functions should connect via the Supabase pooler endpoint, NOT the direct database URL:

- Direct: `db.<project-ref>.supabase.co:5432` (limited connections)
- Pooler: `<project-ref>.pooler.supabase.com:6543` (PgBouncer managed)

Check environment variables in edge functions:
- `DATABASE_URL` or `SUPABASE_DB_URL` should point to the pooler
- If using `supabase-js`, this is handled automatically for Data API calls (PostgREST), but direct `pg` or Prisma connections need the pooler URL

### Restart PgBouncer (if stuck)

If PgBouncer itself is unresponsive:

1. Go to **Supabase Dashboard** -> **Database** -> **Connection Pooling**
2. Toggle pooling off and back on (this restarts PgBouncer)
3. Wait 30 seconds and check connection counts again

---

## Recovery

1. Monitor connection counts for 15 minutes after intervention
2. Verify all endpoints return 200 (spot-check: auth, projects list, artifact fetch)
3. Check edge function logs to confirm errors have stopped
4. Review the application_name breakdown from `pg_stat_activity` to confirm no single source is hogging connections

---

## Prevention

### Connection pooling config checklist

- [ ] All edge functions use the pooler URL (port 6543), not the direct URL (port 5432)
- [ ] PgBouncer mode is set to `transaction` (not `session`)
- [ ] Pool size is set appropriately for the plan tier (Pro: 50+, Team: 100+)
- [ ] Edge functions do not hold connections open between requests (no persistent `pg.Pool` outside handler)

### Monitoring

- [ ] Set up an alert when active connections exceed 80% of the pool maximum
- [ ] Add a health-check endpoint that queries `SELECT 1` and returns connection pool stats
- [ ] Monitor `pg_stat_activity` in a dashboard (Grafana, Supabase Observability, or custom)

### Code practices

- [ ] Never use `pg.connect()` without a corresponding `release()` or `end()`
- [ ] Use `supabase-js` for all Data API calls (it goes through PostgREST, not direct DB)
- [ ] Ensure local development and CI/CD pipelines close connections after migrations and seeds
- [ ] Review Realtime subscriptions — each one holds a connection slot

---

## Post-Incident

- Identify which component caused the connection leak
- Add a connection-count smoke test to the CI pipeline
- Update this runbook with the specific root cause and fix
