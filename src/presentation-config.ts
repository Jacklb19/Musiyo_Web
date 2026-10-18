export function parsePresentationConfig(environment: Record<string, string | undefined>) {
  const exhibitionCategory = environment.VITE_EXHIBITION_CATEGORY || 'mascaras'
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(exhibitionCategory)) throw new Error('Invalid exhibition category')
  const tourKey = environment.VITE_TOUR_KEY || 'museum-main'
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(tourKey)) throw new Error('Invalid tour key')
  const featuredElementSlug = environment.VITE_FEATURED_ELEMENT_SLUG || 'matachin-mask'
  const introductionSlug = environment.VITE_INTRODUCTION_SLUG || 'nombres-y-significados'
  for (const value of [featuredElementSlug, introductionSlug]) {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(value)) throw new Error('Invalid editorial element slug')
  }
  return { exhibitionCategory, tourKey, featuredElementSlug, introductionSlug, featuredLimit: 4 } as const
}

export const presentation = parsePresentationConfig(import.meta.env || {})
