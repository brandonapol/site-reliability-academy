### The one thing

You don't keep a copy of an app alive by hand. You write down how many you want, spread them across
machines, and let something keep that true, so one machine dying is a non-event.

### Hook

In April 2011 a routine network change in one Amazon data center region left about 13% of the
storage volumes in one zone stuck, and for some customers the trouble lasted days. Amazon's own
write-up notes that many customers who had built their apps to run in more than one zone saw no
significant impact at all. Same outage, two very different days. What did the second group do
differently?
[AWS's summary of the April 2011 event](https://aws.amazon.com/message/65648/)

### Beats

1. **What SRE is.** Someone has to own whether the service works for the people who use it, and
   do that with engineering rather than heroics. That is the job, and this course is the job in
   miniature. ([SRE book, ch. 1](https://sre.google/sre-book/introduction/), to read later.)
   _Diagram:_ customers on the left, the service in the middle, the SRE team watching the arrow
   between them.
2. **Boxes and copies.** An app runs as identical, disposable copies spread across several
   machines. Lose a machine and the copies on the others keep serving. The jargon comes after the
   picture: a copy is a pod, a box is a node, all the boxes are a cluster.
   _Diagram:_ three boxes with copies spread across them; one box crossed out, the app still up.
3. **Say what you want, not how.** Starting a copy by hand is an eight-step recipe you'd have to
   repeat forever. Writing "keep three copies running" is an order form: you state the result, and
   a loop compares what you asked for with what exists and fixes the difference. That is a
   thermostat, and engineers call it declarative.
   _Diagram:_ the thermostat loop: wish, compare, act, look again.
4. **What turns them back on, and what it can't save.** Because the wish doesn't change when a copy
   crashes, a replacement appears and nobody gets paged at 3am. Two limits. Self-healing isn't
   free: in the 2011 outage, a huge number of stuck volumes all tried to re-copy their data at once
   and the rush itself swamped the zone. And some things remember: a database isn't a disposable
   copy, so it gets more care, not less.
   _Diagram:_ a copy fading out and a new one fading in; beside it, the database drawn as a dragon.

### Handoff

It's your first day at Inkwell. Before anyone gives you the word for it, you'll watch a copy die and
come back. Notice what you didn't have to do.
