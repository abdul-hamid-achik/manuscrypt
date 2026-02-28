import type { Location, CreateLocationInput, UpdateLocationInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateLocationInput, UpdateLocationInput, Location>(
  '/api/locations',
  { parentQueryParam: 'bookId' },
)

export function useLocations(bookId: MaybeRef<string>) { return useList(bookId) }
export function useLocation(id: MaybeRef<string>) { return useOne(id) }
export function createLocation(input: CreateLocationInput) { return create(input) }
export function updateLocation(id: string, input: UpdateLocationInput) { return update(id, input) }
export function deleteLocation(id: string) { return remove(id) }
