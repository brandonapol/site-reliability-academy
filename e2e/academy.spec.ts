import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('from the course map into a lesson, into the game, and back', async ({ page }) => {
  await page.goto('./#/course/practitioner')
  await expect(page.getByRole('heading', { level: 1, name: 'Practitioner' })).toBeVisible()

  await page.getByRole('link', { name: 'Boxes, and what turns them back on' }).click()
  await expect(page).toHaveURL(/#\/lesson\/inkwell-boxes\?track=practitioner$/)

  // Into the game, which starts at the lesson's first chapter.
  await page.getByRole('link', { name: 'Play this lesson' }).click()
  await expect(page).toHaveURL(/play\.html\?lesson=inkwell-boxes&track=practitioner/)
  const bar = page.getByRole('navigation', { name: 'Lesson' })
  await expect(bar).toContainText('Boxes, and what turns them back on')
  await expect(page.getByRole('complementary', { name: 'Instructions' })).toBeVisible()
  await expect(page.getByRole('tab', { name: /Flack/ })).toHaveAttribute('aria-selected', 'true')

  // The layout fits under the bar: no page scroll.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight
  )
  expect(scrolls).toBe(false)

  // And back again.
  await bar.getByRole('link', { name: '← Back to lesson' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Boxes, and what turns them back on' })
  ).toBeVisible()
})

test('progress survives a reload, and Continue finds the last lesson', async ({ page }) => {
  await page.goto('./#/lesson/inkwell-change?track=practitioner')
  await page.getByRole('button', { name: 'Mark lesson complete' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: /Completed/ })).toBeVisible()

  await page.goto('./#/course/practitioner')
  await expect(page.getByRole('link', { name: 'Continue' })).toHaveAttribute(
    'href',
    '#/lesson/inkwell-change?track=practitioner'
  )
})

test('academy pages have no axe violations', async ({ page }) => {
  for (const route of [
    '#/course/practitioner',
    '#/course/everyone',
    '#/lesson/inkwell-first-page',
    '#/progress',
  ]) {
    await page.goto(`./${route}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, route).toEqual([])
  }
})

test('the course pages work at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('./#/course/everyone')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Reliability for Everyone' })
  ).toBeVisible()
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(overflows).toBe(false)
})
