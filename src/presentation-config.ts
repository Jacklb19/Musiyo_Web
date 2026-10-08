export function parsePresentationConfig(environment: Record<string, string | undefined>) {
  const exhibitionCategory = environment.VITE_EXHIBITION_CATEGORY || 'mascaras'
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(exhibitionCategory)) throw new Error('Invalid exhibition category')
  const tourKey = environment.VITE_TOUR_KEY || 'museum-main'
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(tourKey)) throw new Error('Invalid tour key')
  return { exhibitionCategory, tourKey, featuredLimit: 4 } as const
}

export const presentation = parsePresentationConfig(import.meta.env || {})
