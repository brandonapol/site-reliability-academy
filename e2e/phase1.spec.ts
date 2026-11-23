import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Phase 1 end to end (#22): a learner with an empty browser starts at the landing page and plays
 * weeks 1–4, ending holding the pager with an incident scorecard. Every game step is played through
 * the real UI the way a stuck learner would: press "Show me" and click what it highlights. That
 * keeps the test tied to what a learner can actually reach, not to the engine's internals; the
 * engine's own golden-path tests (src/content/chapters) pin each chapter's logic.
 */

// About a minute in practice; the margin is for a slow CI runner.
test.setTimeout(4 * 60_000)

const instructions = (page: Page) => page.getByRole('complementary', { name: 'Instructions' })

/** Clicks "Play this lesson" on the lesson page, with `?fast=1` so scripted delays don't drag. */
async function playLesson(page: Page) {
  const href = await page.getByRole('link', { name: 'Play this lesson' }).getAttribute('href')
  expect(href).toBeTruthy()
  await page.goto(`${href}&fast=1`)
  await expect(page.getByRole('navigation', { name: 'Lesson' })).toBeVisible()
}

/** Clicks, or reports that something covered the element for two seconds. */
async function clicked(locator: Locator): Promise<boolean> {
  return locator.click({ timeout: 2_000 }).then(
    () => true,
    () => false
  )
}

/** Something is covering the page: close it the way a learner would. */
async function closeWhatCovers(page: Page) {
  const close = page.locator('[data-target="close-overlay"]').first()
  if (await close.isVisible()) await clicked(close)
  else await page.keyboard.press('Escape')
}

/** "Open inkwell.example/pricing, apply the coupon SAVE10, and click Pay." */
async function applyCoupon(page: Page) {
  await instructions(page).getByRole('link', { name: 'inkwell.example/pricing' }).click()
  await page.getByRole('textbox', { name: 'Coupon code' }).fill('SAVE10')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
}

/** Show me opens the wish editor; the edit is the learner's, as its "Do this" says (#65). */
async function openWishEditor(page: Page) {
  await expect(page.getByRole('heading', { name: 'Wish editor' })).toBeVisible()
}

/**
 * The few steps where Show me can't do it all, because the learner has to type or pick something
 * first, as the step's text asks. Keyed by step title; each runs once before the target is
 * clicked.
 */
const STEP_INPUTS: Record<string, (page: Page) => Promise<void>> = {
  'See it like a customer': applyCoupon,
  'Try checkout again': applyCoupon,
  'Bump web to 2.0': async (page) => {
    await openWishEditor(page)
    await page.getByRole('combobox', { name: 'App' }).selectOption('web')
    await page.getByRole('combobox', { name: 'Version' }).selectOption('2.0')
  },
  'Ask GitNub for more copies': async (page) => {
    await openWishEditor(page)
    await page.getByRole('combobox', { name: 'App' }).selectOption('web')
    const more = page.getByRole('button', { name: 'More copies' })
    const count = more.locator('xpath=preceding-sibling::span[1]')
    for (let i = 0; i < 10 && (await count.textContent()) !== '6'; i++) await more.click()
    await expect(count).toHaveText('6')
  },
}

/**
 * Plays the open lesson's chapters until the lesson bar says they're done. Each pass does the one
 * thing the screen asks for: keep going past a finished chapter, type a name, or follow "Show me".
 * Steps that wait on the fake clock just get time.
 */
async function playChapters(page: Page) {
  const done = page.getByRole('navigation', { name: 'Lesson' }).getByRole('status')
  const panel = instructions(page)
  const stepTitle = panel.getByRole('heading', { level: 2 }).first()
  // "Show me" is offered once per step, so remember which element it pointed at (its
  // `data-target`) and keep clicking that until the step moves on.
  let pending: { step: string; target: string } | undefined
  const inputDone = new Set<string>()
  for (let pass = 0; pass < 600; pass++) {
    if (await done.isVisible()) return

    const keepGoing = panel.getByRole('region', { name: 'Chapter complete' })
    if (await keepGoing.isVisible()) {
      await keepGoing.getByRole('button', { name: 'Keep going' }).click()
      continue
    }

    const name = panel.getByRole('textbox', { name: 'Your name' })
    if (await name.isVisible()) {
      await name.fill('Ada')
      await panel.getByRole('button', { name: 'That’s me' }).click()
      continue
    }

    const step = (await stepTitle.textContent()) ?? ''
    if (pending && pending.step !== step) pending = undefined

    if (!pending) {
      // The Show me button, or the solution it revealed, names the element to click.
      const showMe = panel.getByRole('button', { name: 'Show me' })
      const named = panel.locator('[data-show-me-target]').first()
      const target = (await named.isVisible())
        ? await named.getAttribute('data-show-me-target')
        : null
      if (target) pending = { step, target }
      // Show me also switches to the tab or view that holds the target. An overlay (the page,
      // the order form) can cover it, and then the target is usually in the overlay itself.
      if (await showMe.isVisible()) await clicked(showMe)
    }

    if (STEP_INPUTS[step] && !inputDone.has(step)) {
      inputDone.add(step)
      await STEP_INPUTS[step](page)
    }

    if (pending) {
      const target = page.locator(`[data-target="${pending.target}"]:visible`).first()
      if (await target.isVisible()) {
        if (!(await clicked(target))) await closeWhatCovers(page)
        // Some targets are a card you select, then confirm: the Ops Console's wishes, and the
        // status updates in the incident channel.
        const makeItSo = target.getByRole('button', { name: 'Make it so' })
        if (await makeItSo.isVisible()) await clicked(makeItSo)
        if (pending.target.startsWith('status-option:')) {
          const post = page.getByRole('button', { name: 'Post to status page' })
          if (await post.isVisible()) await clicked(post)
        }
        await page.waitForTimeout(100)
        continue
      }
    }
    await page.waitForTimeout(250)
  }
  throw new Error(`Stuck on step "${await stepTitle.textContent()}" (target ${pending?.target})`)
}

const WEEKS = [
  { id: 'inkwell-boxes', title: 'Boxes, and what turns them back on' },
  { id: 'inkwell-change', title: 'How a change reaches production' },
  { id: 'inkwell-measure', title: 'Seeing inside, and how good is good enough' },
  { id: 'inkwell-nines', title: 'What each nine costs' },
  { id: 'inkwell-first-page', title: 'Alerts, and your first page' },
] as const

const lessonHeading = (page: Page, title: string) =>
  page.getByRole('heading', { level: 1, name: title })

/**
 * A week boundary: back on the lesson page, reload, and check the academy still knows where the
 * learner is (the course map's Continue points here), then move on with the lesson's Next link.
 */
async function finishLesson(page: Page, title: string, next?: string) {
  await page
    .getByRole('navigation', { name: 'Lesson' })
    .getByRole('link', { name: '← Back to lesson' })
    .click()
  await expect(lessonHeading(page, title)).toBeVisible()
  await page.reload()
  await expect(lessonHeading(page, title)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue' })).toHaveAttribute(
    'href',
    new RegExp(`#/lesson/${WEEKS.find((week) => week.title === title)?.id}\\b`)
  )
  if (!next) return
  await page
    .getByRole('navigation', { name: 'Lessons' })
    .getByRole('link', { name: `${next} →` })
    .click()
  await expect(lessonHeading(page, next)).toBeVisible()
}

/** The nines lesson has no game page: the boundary checks happen on the lesson page itself. */
async function finishLessonPage(page: Page, title: string, next: string) {
  await page.reload()
  await expect(lessonHeading(page, title)).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Lessons' })
    .getByRole('link', { name: `${next} →` })
    .click()
  await expect(lessonHeading(page, next)).toBeVisible()
}

/** Inside the game: a reload lands on the same step. */
async function reloadResumes(page: Page) {
  const step = instructions(page).getByRole('heading', { level: 2 }).first()
  const before = await step.textContent()
  await page.reload()
  await expect(step).toHaveText(before ?? '')
}

/** Week 3's nines game: ship every month, then keep a 99.9% SLO. */
async function playNines(page: Page) {
  for (let month = 1; month <= 6; month++) {
    await page.getByRole('button', { name: 'Ship the next feature' }).click()
    await expect(page.getByRole('heading', { name: `Month ${month} report` })).toBeVisible()
  }
  await page.getByRole('button', { name: '99.9%', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Keep' })).toContainText('99.9%')
}

test('Phase 1: a new learner plays weeks 1–4 and ends holding the pager', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'Start week 1' }).click()
  await expect(lessonHeading(page, WEEKS[0].title)).toBeVisible()

  // Week 1.
  await playLesson(page)
  await reloadResumes(page)
  await playChapters(page)
  await finishLesson(page, WEEKS[0].title, WEEKS[1].title)

  // Week 2.
  await playLesson(page)
  await reloadResumes(page)
  await playChapters(page)
  await finishLesson(page, WEEKS[1].title, WEEKS[2].title)

  // Week 3: the measuring chapters, then the nines game on the lesson page.
  await playLesson(page)
  await reloadResumes(page)
  await playChapters(page)
  await finishLesson(page, WEEKS[2].title, WEEKS[3].title)
  await playNines(page)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Keep' })).toContainText('99.9%')
  await finishLessonPage(page, WEEKS[3].title, WEEKS[4].title)

  // Week 4: alerts, the first page, then the traffic and database chapters.
  await playLesson(page)
  await reloadResumes(page)
  await playChapters(page)

  // Holding the pager: the resolved incident's scorecard is in PagerDoody.
  await page.getByRole('tab', { name: /PagerDoody/ }).click()
  await expect(page.getByRole('region', { name: 'Scorecard' })).toBeVisible()
  await finishLesson(page, WEEKS[4].title)
})
