import type { SelectionConfirmed, Tour } from './contracts.ts'

export function isAvailableSelection(tour: Tour, pointKey: string | null, elementSlug: string | null): boolean {
  if (!pointKey) return false
  return tour.rooms.some((room) => room.points.some((point) => point.key === pointKey
    && (!elementSlug || point.elements.some((element) => element.slug === elementSlug))))
}

export function confirmedSelection(tour: Tour, message: SelectionConfirmed): URLSearchParams | null {
  const { tour_key, point_key, element_slug } = message.data
  if (tour_key !== tour.tour.key || !isAvailableSelection(tour, point_key, element_slug ?? null)) return null
  const next = new URLSearchParams({ tour: tour_key, point: point_key })
  if (element_slug) next.set('element', element_slug)
  return next
}
