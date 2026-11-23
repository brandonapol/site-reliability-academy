import { hash01 } from '../telemetry/rng'

/** The most outages a month can have. The count is uniform on 0..MAX, so its mean is MAX / 2. */
const MAX_OUTAGES = 4

/**
 * A month's outages, drawn from a key rather than a stream: the same key always gives the same
 * month, so a different choice earlier in a run doesn't reshuffle the luck of a later month at the
 * same level. Averaged over keys, `minutes` is `mean`.
 *
 * The count averages `MAX_OUTAGES / 2`, and each outage's length is uniform between zero and
 * twice `mean / (MAX_OUTAGES / 2)`, so the product averages `mean`.
 */
export function drawOutages(key: string, mean: number): { count: number; minutes: number } {
  const count = Math.floor(hash01(`${key}:count`) * (MAX_OUTAGES + 1))
  const longest = (2 * mean) / (MAX_OUTAGES / 2)
  let minutes = 0
  for (let i = 0; i < count; i++) minutes += hash01(`${key}:outage:${i}`) * longest
  return { count, minutes }
}
