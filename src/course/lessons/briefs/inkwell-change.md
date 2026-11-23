### The one thing

A change reaches production by one path: written down, reviewed, tested, then made true by a
machine. That path makes change safe, and the tests on it only catch what someone thought to
check.

### Hook

On July 2, 2019, a Cloudflare engineer shipped a minor firewall rule change. It was reviewed, the
test suite went green, and the pipeline deployed it automatically, to every server worldwide within
seconds. One regular expression in it pinned every CPU handling web traffic, and sites behind
Cloudflare returned errors for 27 minutes. The tests passed. So what was missing?
[Cloudflare's write-up](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/)

### Beats

1. **Most outages start with a change.** Systems that nobody touches tend to keep running. New
   code, new config and new rules are where the risk comes in, which is why the path a change
   takes deserves as much care as the change.
   _Diagram:_ a timeline of a quiet service with spikes of trouble, each one right after a deploy
   marker.
2. **One source of truth.** The wish lives in a repository. A change is a proposal that gets
   reviewed and merged, and a robot makes the cluster match what was merged. A change made by hand
   on the cluster is a sticky note: the robot peels it off. That's GitOps, and it means you can
   always answer "what's running, and who changed it?"
   _Diagram:_ repository, then sync, then cluster, with a sticky note on the cluster being peeled
   away.
3. **Tests are a net with holes.** Automated tests click through the product the way a customer
   would and fail in plain words, before customers see the bug. Cloudflare's suite checked that
   rules blocked the right requests; it had no way to notice a rule eating all the CPU. When a test
   fails, read it: deleting or skipping it just makes the hole bigger.
   _Diagram:_ a net under a tightrope, one bug falling through a gap labeled "nobody checked for
   this."
4. **How far a change goes before you know.** Cloudflare's software went out in stages: staff
   first, then a few customers, then everyone. Their rule changes skipped the stages, by design,
   for speed. A rolling update does the same thing on a small scale, a few new copies at a time.
   The question is always how much breaks before you notice.
   _Diagram:_ rings widening from "us" to "a few customers" to "everyone," next to one arrow that
   jumps straight to "everyone."

### Handoff

Alex has a change ready, and the robots are about to fail it. Your job isn't to make the red go
away. It's to read what the red is telling you.
