### The one thing

"Is it working?" is a number we agree on, measured where the customer feels it. Its target is never
100%: reliability is a feature with a cost, and the failure we allow is a budget we spend on
change.

### Hook

On February 28, 2017, a mistyped input to a routine command removed far more Amazon S3 servers than
intended, and a large slice of the internet broke for hours. For part of that time, Amazon's own
status page couldn't show it, because the tool that updates the status page depended on S3. If the
dashboard can say green while customers can't work, who decides whether it's working?
[AWS's summary of the S3 disruption](https://aws.amazon.com/message/41926/)

### Beats

1. **Seeing inside.** Four questions tell you how a service feels: how slow, how busy, how many
   errors, how full. Engineers call them the golden signals: latency, traffic, errors,
   saturation. ([SRE book, ch. 6](https://sre.google/sre-book/monitoring-distributed-systems/).)
   _Diagram:_ four dials, labeled in plain words first and the real terms underneath.
2. **"Working" is an agreed number.** Pick the number the customer feels, not the one that's easy to
   collect: the share of checkouts that succeed within two seconds, not CPU, not how many copies
   are running. That number is a service level indicator, or SLI, and it should be measured as
   close to the customer as you can get.
   _Diagram:_ a request's path from customer to database, with a measuring point near the customer
   and a crossed-out one on a single box.
3. **Every nine costs more, and 100% is the wrong target.** 99% allows about seven hours of
   checkout failure a month, 99.9% about 43 minutes, 99.99% about four. Each extra nine can cost
   up to a hundred times more than the last, and past a point customers can't tell: their phone and their Wi-Fi
   fail more often than that. A target of 100% would mean never changing anything. Reliability is
   a feature, and like any feature it competes for time with the others. Choosing the target, the
   SLO, is a business decision, not a technical one.
   ([SRE book, ch. 3, "Embracing Risk"](https://sre.google/sre-book/embracing-risk/).)
   _Diagram:_ cost climbing as the nines grow, going nearly vertical toward 100%, with a flat line
   for "what the customer's own connection allows."
4. **The error budget.** 100% minus the SLO is the failure you've agreed to. Spend it on launches
   and experiments. When incidents drain it, slow down until it refills. That shared rule is what
   lets product and SRE stop arguing about opinions. Moving the target to hide the spend breaks it:
   the number has to mean something.
   _Diagram:_ a fuel gauge draining with each incident and refilling over the month, with a "pause
   risky launches" line near empty.

### Handoff

Inkwell's checkout needs a target, and one of the options will be 100%. You know now why you'll turn
it down.
