import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const LESSON = './#/lesson/inkwell-nines?track=practitioner'

async function noAxeViolations(page: Page, what: string) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations, what).toEqual([])
}

async function noSideways(page: Page, what: string) {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(overflows, what).toBe(false)
}

test('the nines game: play six months, then keep an SLO', async ({ page }) => {
  await page.goto(LESSON)
  await expect(page.getByRole('heading', { level: 1, name: 'What each nine costs' })).toBeVisible()
  await noAxeViolations(page, 'lesson page, before playing')

  for (let month = 1; month <= 6; month++) {
    await expect(page.getByRole('heading', { name: `Month ${month} of 6` })).toBeVisible()
    await page.getByRole('button', { name: 'Ship the next feature' }).click()
    await expect(page.getByRole('heading', { name: `Month ${month} report` })).toBeVisible()
  }

  await expect(page.getByRole('heading', { name: 'Morgan’s review' })).toBeFocused()
  await expect(page.getByRole('table', { name: 'Your runs of this game' })).toContainText(
    'This run'
  )
  await noAxeViolations(page, 'lesson page, at the review')

  // 100% isn't an SLO: Kai explains and asks again.
  await page.getByRole('button', { name: '100%', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('100% has none')

  await page.getByRole('button', { name: '99.9%', exact: true }).click()
  const keep = page.getByRole('region', { name: 'Keep' })
  await expect(keep).toContainText('99.9% of checkouts that succeed within 2 seconds, over 30 days')

  // The Keep is saved with course progress, so it survives a reload.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Keep' })).toContainText(
    '99.9% of checkouts that succeed within 2 seconds'
  )
})

test('the nines game: promising 100% visibly costs more than it returns', async ({ page }) => {
  await page.goto(LESSON)
  await page.getByRole('button', { name: 'Promise 100%' }).click()
  await page.getByRole('button', { name: 'Promise 100% anyway' }).click()
  await expect(page.getByRole('button', { name: 'Ship the next feature' })).toBeDisabled()
  for (let month = 2; month <= 6; month++) {
    await page.getByRole('button', { name: 'Keep going' }).click()
  }

  await expect(page.getByText(/Promised 100%\. Delivered 99\.99\d\d%/)).toBeVisible()
  const ledger = page.getByRole('table', { name: 'What each nine cost and saved' })
  await expect(ledger.getByRole('row', { name: /^100%/ })).toContainText(
    'Cost more than it returned'
  )
})

test('the nines game fits a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(LESSON)
  await noSideways(page, 'first month')
  await page.getByRole('button', { name: 'Buy the next nine' }).click()
  await page.getByRole('button', { name: 'Keep going' }).click()
  for (let month = 3; month <= 6; month++) {
    await page.getByRole('button', { name: 'Ship the next feature' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Morgan’s review' })).toBeVisible()
  await noSideways(page, 'review')
})
