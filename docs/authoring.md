# Authoring guide

How to add to the course. [`curriculum.md`](./curriculum.md) says _what_ each part teaches; this
says _where it goes and how_.

## The shape of the course

```
src/course/
  types.ts           Track → Phase → Unit (a week or module) → Lesson
  practitioner.ts    the 28-week track, phase by phase
  everyone.ts        Reliability for Everyone: nine modules and a capstone
  lessons/phase1.ts  lesson data, one file per phase
  policy.ts          the AI policy text
  validate.ts        checks run by `npm test`
```

Every week and module from the spec is already there. A unit with no lessons shows on the course
map as "Coming soon". Adding content means adding lessons to a unit. You write data only: the
course map, lesson page, progress and navigation all follow from it.

## Adding a lesson

1. Write the lesson in the phase's file under `src/course/lessons/` (create `phase2.ts` and so on
   as needed):

   ```ts
   export const DISK_FULL: Lesson = {
     id: 'linux-disk-full',
     title: "What's eating the disk",
     summary: 'A page says the disk is full. Find out what filled it, and why it keeps filling.',
     brief: '…', // the video brief in Markdown, shown until the video exists
     do: { kind: 'text', summary: 'The mission runs in the terminal below.' },
     check: [
       { id: 'find-largest', text: 'Find the largest files under a directory, in one command' },
       { id: 'deleted-open', text: 'Explain why deleting a log file did not free the space' },
     ],
     keep: { title: 'Runbook entry', description: 'Your notes on a full disk, for the runbook.' },
     reading: [{ title: 'School of SRE: Linux basics', href: 'https://…' }],
   }
   ```

2. Add it to its unit's `lessons` array in `practitioner.ts` or `everyone.ts`.
3. Run `npm test`. The course validator fails on duplicate or malformed IDs, repeated check items,
   or a game chapter that doesn't exist.
4. Run `npm run dev` and open `#/course/practitioner`. The lesson is listed under its week and
   opens at `#/lesson/<id>`.

### IDs are permanent

Progress is saved in each learner's browser, keyed by lesson ID (and by check item ID within a
lesson). **Never change an `id` once a lesson has shipped.** Retitle, reorder and move lessons
freely, but a renamed ID quietly resets every learner's progress on that lesson. IDs are
kebab-case and unique across the whole course. Make them describe the content
(`linux-disk-full`), not its position (`week-5-lesson-2`), because positions change.

### Watch, Do, Check, Keep

Every lesson page has the same four parts:

- **Watch:** about ten minutes of video. Until a video exists, the `brief` is shown instead. Briefs
  follow the template from the video epic (#2): the one thing the viewer should be able to say
  afterwards, an opening hook (usually a real incident, linked), three or four beats with the
  diagram each needs, and the line that hands off to the exercise. **Videos carry concepts,
  stories and judgment. Never tool walkthroughs or the academy's own screens.** Those go in the
  lesson text, where they can be edited when a tool changes.
- **Do:** the interactive part. `kind: 'game'` plays feauxbernetes chapters on `play.html`.
  `kind: 'text'` describes an activity that has no player yet. New kinds (simulations, local labs)
  are added to `LessonDo` in `types.ts` as their epics land.
- **Check:** the "know before moving on" list. Write things a learner can test themselves on
  ("Explain why a copy comes back after you unplug it, without the word 'reconcile'"), not "Understand X".
  Four to six items. At least one should ask _why_.
- **Keep:** the artifact, if the lesson makes one. These add up to the portfolio.

## Adding a game chapter

Game chapters live in `src/content/chapters/` and are listed in `src/content/chapters/index.ts`.
The design notes for the game's world, characters and style are in
[`feauxbernetes-planning.md`](./feauxbernetes-planning.md). A chapter's `id` is what lessons
reference. It isn't always the file name: `07-seeing-inside.ts` holds `ch6-seeing-inside`.
After adding one, put it in a lesson's `do.chapters`. The validator checks that every chapter is
real, and a test checks that Phase 1 plays every chapter exactly once.

The simulation behind the game is `@sra/engine` (`packages/engine`). It stays free of React and
the DOM, and lint enforces that.

## Licensing

| Source | What you may do |
| --- | --- |
| _Site Reliability Engineering_ and _The Site Reliability Workbook_ (sre.google) | **Link only.** Assign chapters as reading. Never quote at length, reproduce or adapt them: they're CC BY-NC-ND. Write original lessons. |
| SRE Classroom: The Art of SLOs, ImageServer, PubSub | **May be adapted, with credit to Google** (CC BY 4.0). Say what was adapted and link the original. |
| Anything marked "check before reuse" in [`curriculum.md`](./curriculum.md) section 9 | Check the license first and record the result in that table before using it. Until then, link only. |

The same applies to images and diagrams: draw your own, or use ones whose license allows it and
credit them.

## Style

- Say why. A wrong answer gets a reason, never a bare "Incorrect".
- Plain words first, the real term second: do the thing, then name the thing.
- Meet systems the way on-call does, from telemetry and the cluster, not from a description of the
  fault.
- Compare a learner only with their own past, never with other learners.

## Checks before a PR

```sh
npm run lint && npm run typecheck && npm test && npm run e2e
```
