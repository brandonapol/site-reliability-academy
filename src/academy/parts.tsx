import type { Tier } from '../course'
import type { LessonStatus } from '../progress/progress'
import { TIER_LABELS } from './links'

const STATUS_LABELS: Record<LessonStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  complete: 'Complete',
}

const STATUS_ICONS: Record<LessonStatus, string> = {
  'not-started': '○',
  'in-progress': '◐',
  complete: '●',
}

/** A progress mark with a text label for screen readers (the icon alone is decorative). */
export function StatusMark({ status }: { status: LessonStatus }) {
  return (
    <span className={`status status-${status}`} title={STATUS_LABELS[status]}>
      <span aria-hidden="true">{STATUS_ICONS[status]}</span>
      <span className="visually-hidden">{STATUS_LABELS[status]}</span>
    </span>
  )
}

export function TierBadges({ tiers }: { tiers: readonly Tier[] }) {
  return (
    <span className="tiers">
      {tiers.map((tier) => (
        <span key={tier} className={`tier tier-${tier}`}>
          {TIER_LABELS[tier]}
        </span>
      ))}
    </span>
  )
}
