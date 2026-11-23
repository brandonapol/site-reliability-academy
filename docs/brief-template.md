# Video brief template

Every lesson's video is planned from a brief kept next to the lesson, in
`src/course/lessons/briefs/<lesson-id>.md`, and set as the lesson's `brief`. Until the video is
recorded, the lesson page shows the brief in its place, so write it to be read as well as filmed.
The rules are in [`curriculum.md`](./curriculum.md) section 2, "Lesson format: video first".

- **Concepts, stories and judgment only.** No tool walkthroughs and nothing showing the academy's or
  the game's own screens. Those go in the lesson text, where they can be edited.
- **The hook is a real, public incident**, linked to its write-up or postmortem. Check the link
  works. Tell the story in your own words.
- **The Google SRE books are link-only** (CC BY-NC-ND). Link a chapter; never quote it at length.
- **About ten minutes.** Three or four beats. If it needs five, it is probably two videos.
- The brief is shown under the lesson's **Watch** heading, so its own headings start at `###`.

Copy this skeleton:

```md
### The one thing

One sentence the viewer should be able to say afterwards, in their own words.

### Hook

The opening story, two or three sentences: what happened, who it hurt, and the question it leaves
the viewer with. [The public write-up](https://…)

### Beats

1. **First idea.** What is said, in two or three sentences.
   _Diagram:_ the one picture this beat needs.
2. **Second idea.** …
   _Diagram:_ …
3. **Third idea.** …
   _Diagram:_ …

### Handoff

The last line of the video, which sends the viewer into the exercise.
```
