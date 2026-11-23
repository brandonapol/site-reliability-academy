import { useState } from 'react'

import { STATUS_STAGES, statusStageLabel, type StatusStage } from '@sra/engine/incident'
import { useDispatch, useGame } from '../../store'
import styles from './Incident.module.css'
import { useIncident } from './useIncident'

/**
 * Comms' job, as a picker: choose a stage, choose one of three pre-written updates, post it to
 * the status page and the incident channel. Each option has a note on why it's good or not,
 * shown once it's picked — the learner learns what a good update looks like by comparing.
 */
export function StatusComposer() {
  const incident = useIncident()
  const content = useGame((s) => s.config.incident)
  const dispatch = useDispatch()
  const posted = incident?.statusPosts.map((post) => post.stage) ?? []
  const nextStage = STATUS_STAGES.find((stage) => !posted.includes(stage)) ?? 'resolved'
  // Follows the incident to its next stage (someone else may have posted one since this mounted)
  // until the learner picks a stage themselves.
  const [pickedStage, setPickedStage] = useState<StatusStage>()
  const stage = pickedStage ?? nextStage
  const [optionId, setOptionId] = useState<string>()

  if (!incident || incident.phase !== 'open' || !content) return null
  const options = content.statusUpdates[stage]
  const chosen = options.find((option) => option.id === optionId)

  const pickStage = (next: StatusStage) => {
    setPickedStage(next)
    setOptionId(undefined)
  }

  return (
    <form
      className={styles.composer}
      aria-label="Status update"
      onSubmit={(event) => {
        event.preventDefault()
        if (!chosen) return
        // The same `status-option:<id>` Show me highlights, so a step can gate on the pick.
        dispatch({ type: 'clickTarget', targetId: `status-option:${chosen.id}` })
        dispatch({ type: 'incident', command: { kind: 'postStatus', stage, optionId: chosen.id } })
        setOptionId(undefined)
        setPickedStage(undefined)
      }}
    >
      <p className={styles.composerTitle}>Status page update</p>
      <div className={styles.stages} role="radiogroup" aria-label="Stage">
        {STATUS_STAGES.map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="radio"
            aria-checked={candidate === stage}
            className={styles.stage}
            data-posted={posted.includes(candidate) || undefined}
            onClick={() => pickStage(candidate)}
          >
            {statusStageLabel(candidate)}
            {posted.includes(candidate) && <span aria-label="posted"> ✓</span>}
          </button>
        ))}
      </div>
      <fieldset className={styles.options}>
        <legend className={styles.visuallyHidden}>
          Pick an update for {statusStageLabel(stage)}
        </legend>
        {options.map((option) => (
          <label
            key={option.id}
            className={styles.option}
            data-target={`status-option:${option.id}`}
          >
            <input
              type="radio"
              name="status-option"
              value={option.id}
              checked={option.id === optionId}
              onChange={() => setOptionId(option.id)}
            />
            <span>{option.message}</span>
          </label>
        ))}
      </fieldset>
      {chosen && <p className={styles.optionNote}>{chosen.note}</p>}
      <button
        type="submit"
        className={styles.postButton}
        disabled={!chosen}
        data-target="status-post"
      >
        Post to status page
      </button>
    </form>
  )
}
