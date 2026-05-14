# Runbook: Incident Communication Template

**Last updated:** 2026-05-12
**Owner:** Engineering lead / Product lead

---

## When to Communicate

Send an incident communication when:

- A user-facing feature is broken for more than 15 minutes
- Payment processing is affected (any duration)
- Data loss or data integrity issues are discovered
- A security incident occurs (any severity)
- Planned maintenance will cause downtime

---

## Communication Channels

| Audience | Channel | When |
|----------|---------|------|
| All users | In-app banner | Immediately when issue is confirmed |
| All users | Status page | Within 15 minutes of confirmation |
| Subscribed users | Email (if outage > 1 hour) | After initial investigation |
| Team / stakeholders | Slack #incidents channel | Immediately |
| Public | Social media (X/Twitter) | For major outages (> 30 min) |

---

## Templates

### Initial Acknowledgment (within 15 minutes)

Use this when you know something is wrong but are still investigating.

**In-app banner:**
> We are investigating an issue affecting [feature name]. Some users may experience [brief symptom]. We are working on a fix and will update shortly.

**Status page:**
> **Investigating** - We are aware of an issue affecting [feature name]. Users may experience [symptom]. Our team is actively investigating. We will provide an update within 30 minutes.

**Slack #incidents:**
> :rotating_light: **INCIDENT OPENED** — [P1/P2] [Brief title]
> **Impact:** [What is broken, who is affected]
> **Status:** Investigating
> **Lead:** @[on-call engineer]
> **Thread:** Use this thread for updates

---

### Status Update (every 30 minutes during active incident)

**Status page:**
> **Update** - We have identified the cause of the [feature name] issue. [Brief explanation without technical jargon]. We are implementing a fix and expect resolution within [estimated time]. [Feature name] may be intermittently available during this time.

**Slack #incidents (thread):**
> :wrench: **UPDATE** — [Time]
> **Root cause:** [Technical summary]
> **Action taken:** [What was done]
> **ETA to resolution:** [Estimate]

---

### Resolution

**In-app banner:**
> The issue affecting [feature name] has been resolved. Everything should be working normally now. Thank you for your patience.

**Status page:**
> **Resolved** - The issue affecting [feature name] has been resolved. The root cause was [brief non-technical explanation]. All services are operating normally. We apologize for the inconvenience.

**Slack #incidents:**
> :white_check_mark: **INCIDENT RESOLVED** — [Time]
> **Duration:** [X hours Y minutes]
> **Root cause:** [Brief summary]
> **Fix:** [What was done]
> **Follow-up:** [Post-mortem scheduled for DATE]

---

### Post-Incident Summary (within 48 hours)

Send this via email to affected users for significant incidents (> 1 hour or payment-related).

**Subject:** What happened with [Jetdale / feature name] on [date]

**Body:**

> Hi [name],
>
> On [date] between [start time] and [end time] UTC, [brief description of what happened].
>
> **What happened**
> [1-2 sentences explaining the issue in plain language. No jargon.]
>
> **What was affected**
> [List of features that were impacted and how users experienced it.]
>
> **Timeline**
> - [HH:MM UTC] — Issue began
> - [HH:MM UTC] — We were alerted and began investigating
> - [HH:MM UTC] — Root cause identified
> - [HH:MM UTC] — Fix deployed
> - [HH:MM UTC] — Full service restored
>
> **What we are doing to prevent this**
> - [Specific action 1]
> - [Specific action 2]
> - [Specific action 3]
>
> We take reliability seriously and apologize for the disruption. If you experienced any issues that are not yet resolved, please contact us at info@donkeyideas.com.
>
> — The Jetdale Team

---

## Dos and Do Nots

### Do

- Communicate early, even if you do not have all the answers yet
- Use plain language (no technical jargon in user-facing comms)
- Provide a realistic timeline, not an optimistic one
- Acknowledge the impact on users
- Follow up with what you are doing to prevent recurrence
- Keep internal and external messaging consistent

### Do Not

- Blame third-party providers by name in user-facing comms (say "an external service" instead)
- Promise it will never happen again (promise specific preventive actions instead)
- Use passive voice to avoid accountability ("errors were encountered" vs. "we experienced errors")
- Wait until the incident is fully resolved before communicating
- Forget to remove the in-app banner after the incident is resolved
- Skip the post-incident summary for significant outages

---

## Escalation Path

| Time Since Incident Start | Action |
|---------------------------|--------|
| 0-5 minutes | On-call engineer investigates |
| 5-15 minutes | Post in #incidents, set in-app banner |
| 15-30 minutes | Update status page, escalate to engineering lead if needed |
| 30-60 minutes | Engineering lead reviews, consider external comms |
| 1+ hour | Product lead involved, send email to affected users if payment-related |
| 4+ hours | Executive team notified, prepare public statement if needed |
