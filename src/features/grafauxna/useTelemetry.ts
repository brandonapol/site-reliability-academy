import { useMemo } from 'react'

import { createTelemetry, type Scenario } from '@sra/engine/telemetry'
import { versionAt, versionBehaviour } from '@sra/engine/cluster'
import { useGame } from '../../store'

const SEED = 6

/**
 * Live telemetry for whatever the cluster is actually running. The incident content's scenarios
 * (#31) are always layered in: each one is gated on a version's behaviour flag, so they only show
 * up while that version runs — billing@2.4.1's coupon errors appear the moment it deploys in
 * Ch 9 and go away when it's rolled back, with no chapter having to switch anything on.
 */
export function useTelemetry() {
  const cluster = useGame((s) => s.game.cluster)
  const impact = useGame((s) => s.config.incident?.impact)
  const scenario = useMemo<Scenario>(
    () => ({
      id: 'live',
      events: Object.values(impact ?? {}).flatMap((model) => model.scenario.events),
    }),
    [impact]
  )
  return useMemo(
    () =>
      createTelemetry(SEED, scenario, {
        versionAt: (app, t) => versionAt(cluster, app, t),
        behaviour: (app, version) => versionBehaviour(cluster.config, app, version),
      }),
    [cluster, scenario]
  )
}
