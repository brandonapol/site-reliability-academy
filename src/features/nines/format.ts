/** "$370k", "−$220k", "$1.2M": rounded so nobody mistakes Inkwell's made-up figures for data. */
export function money(dollars: number): string {
  const sign = dollars < 0 ? '−' : ''
  const abs = Math.abs(dollars)
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
  return `${sign}$${Math.round(abs)}`
}

/** "260 min", "43.2 min", "26 s". */
export function minutes(value: number): string {
  if (value < 1) return `${Math.round(value * 60)} s`
  if (value < 100) return `${value.toFixed(1)} min`
  return `${Math.round(value).toLocaleString('en-US')} min`
}

/** "9,000". You can't have a fraction of a failed visit. */
export function count(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

/** "99.9%", "99.99%": as many decimals as the target needs, and no more. */
export function target(fraction: number): string {
  return `${Number((fraction * 100).toFixed(3))}%`
}

/** "99.9986%": an availability actually delivered, with enough digits to show it isn't 100%. */
export function delivered(fraction: number): string {
  return `${(Math.floor(fraction * 1_000_000) / 10_000).toFixed(4)}%`
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}
