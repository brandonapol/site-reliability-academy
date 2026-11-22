import { AI_POLICY, type PolicyNotice as Notice } from '../course/policy'

/** The AI policy, in one of its variants (#45). `level` keeps the page's heading order. */
export function PolicyNotice({ notice, level }: { notice: Notice; level: 2 | 3 }) {
  const { title, paragraphs } = AI_POLICY[notice]
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <aside className="policy" aria-label={title}>
      <Heading>{title}</Heading>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </aside>
  )
}
