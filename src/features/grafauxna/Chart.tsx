import { useState } from 'react'

import type { SeriesPoint } from '@sra/engine/telemetry'
import styles from './Grafauxna.module.css'

export function Chart({
  title,
  points,
  unit,
  markers = [],
}: {
  title: string
  points: SeriesPoint[]
  unit: string
  /** Fake-clock times to draw a dashed vertical line at, e.g. deploys. */
  markers?: number[]
}) {
  const [table, setTable] = useState(false)
  const values = points.map((point) => point.value)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  const span = max - min || 1
  const last = values.at(-1) ?? 0
  const path = points
    .map((point, index) => {
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * 100
      const y = 40 - ((point.value - min) / span) * 36
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  const first = points[0]?.t ?? 0
  const tSpan = (points.at(-1)?.t ?? 0) - first || 1
  const markerXs = markers.map((t) => ((t - first) / tSpan) * 100).filter((x) => x >= 0 && x <= 100)

  return (
    <section className={styles.chart}>
      <h3>{title}</h3>
      <p className={styles.summary}>
        Now {last.toFixed(1)} {unit}. Range {min.toFixed(1)}–{max.toFixed(1)} {unit}.
      </p>
      <svg viewBox="0 0 100 40" role="img" aria-label={`${title} chart`}>
        {markerXs.map((x) => (
          <line
            key={x}
            x1={x}
            x2={x}
            y1={0}
            y2={40}
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray="1.5 1.5"
            opacity={0.6}
          />
        ))}
        {path && <path d={path} fill="none" stroke="currentColor" strokeWidth="1.2" />}
      </svg>
      <button
        type="button"
        className={styles.tableToggle}
        aria-expanded={table}
        onClick={() => setTable((value) => !value)}
      >
        {table ? 'Hide table' : 'Show as a table'}
      </button>
      {table && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sample</th>
              <th>{unit}</th>
            </tr>
          </thead>
          <tbody>
            {points.slice(-8).map((point, index) => (
              <tr key={point.t}>
                <td>{index + 1}</td>
                <td>{point.value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
