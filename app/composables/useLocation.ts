import type { Location, CreateLocationInput, UpdateLocationInput } from '~~/shared/types'

const { useList, useOne, create, update, remove } = createResourceComposable<CreateLocationInput, UpdateLocationInput, Location>(
  '/api/locations',
  { parentQueryParam: 'bookId' },
)

export const useLocations = (bookId: MaybeRef<string>) => useList(bookId)
export const useLocation = (id: MaybeRef<string>) => useOne(id)
export const createLocation = (data: CreateLocationInput) => create(data)
export const updateLocation = (id: string, data: UpdateLocationInput) => update(id, data)
export const deleteLocation = (id: string) => remove(id)
