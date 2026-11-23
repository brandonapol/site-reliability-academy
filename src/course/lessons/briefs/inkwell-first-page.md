### The one thing

A page should wake a human only when customers are hurting and someone has to act now. Everything
else is a ticket or a dashboard, and an alert that never reaches anyone is no alert at all.

### Hook

On January 31, 2017, after hours of fighting database load late into the night, a GitLab engineer
ran a delete meant for the standby database on the primary. The team turned to the backups and found
they had been failing for some time: the failure emails had been rejected by the receiving mail
server, so nobody knew. About six hours of customer data was lost for good. The alarm existed. Why
did nobody hear it?
[GitLab's postmortem](https://about.gitlab.com/blog/2017/02/10/postmortem-of-database-outage-of-january-31/)

### Beats

1. **Page, ticket or dashboard.** A page has to earn 3am: customers are hurting now, and a human
   can do something about it. Slower but not broken is a ticket for the morning. A blip that
   cleared on its own belongs on a dashboard.
   _Diagram:_ three bins (page, ticket, dashboard) with example alerts sorted into each.
2. **Two ways alerting fails.** A pager that cries wolf trains people to ignore it, and then the
   real one gets missed. An alert that goes nowhere, like GitLab's rejected emails, fails silently.
   Both are reliability bugs, and both are fixed by treating alerts as something you test and prune.
   _Diagram:_ on one side a phone buried under dozens of pages; on the other, an alert arrow ending
   in a void.
3. **Alert on the budget, not on every error.** Last week you set an SLO and its error budget. Page
   when the budget is burning much too fast, checked over a long window and a short one, and you
   catch real outages early while staying quiet on blips.
   ([SRE Workbook, "Alerting on SLOs"](https://sre.google/workbook/alerting-on-slos/).)
   _Diagram:_ the budget draining over a week; a blip barely dents it, an outage drops it steeply
   and crosses the page line.
4. **Your first page, and the dragon.** When paged: notice, stop the bleeding, then explain. Ask
   what changed. Risky work on things that remember, like a database, happens on a quiet weekday
   morning with people around, by tested automation, not improvised by one tired person at night.
   The GitLab postmortem doesn't blame the engineer, and neither should you: the system let one
   command do that much damage.
   _Diagram:_ an incident timeline with three marks (noticed, mitigated, explained), and the gap
   between each one labeled.

### Handoff

You're about to run last week's errors through three alert rules and pick the one you'd sleep
under. After that, the pager is yours.
