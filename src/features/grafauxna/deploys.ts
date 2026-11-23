import type { VersionChange } from '@sra/engine/cluster'

/** Version changes of `service` inside the chart's range: the deploy markers (#25, #32). */
export function deploysBetween(
  history: VersionChange[],
  service: string,
  from: number,
  to: number
): VersionChange[] {
  const deploys: VersionChange[] = []
  let previous: string | undefined
  for (const change of history) {
    if (change.app !== service) continue
    if (
      change.version !== previous &&
      previous !== undefined &&
      change.at > from &&
      change.at <= to
    ) {
      deploys.push(change)
    }
    previous = change.version
  }
  return deploys
}
