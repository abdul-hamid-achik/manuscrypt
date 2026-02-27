export function createResourceComposable<
  TCreate extends Record<string, any>,
  TUpdate extends Record<string, any>,
  TEntity,
>(basePath: string, options: { parentQueryParam?: string } = {}) {
  const { parentQueryParam } = options

  function useList(parentId?: MaybeRef<string>) {
    if (parentQueryParam && parentId !== undefined) {
      return useFetch<TEntity[]>(basePath, {
        query: { [parentQueryParam]: toValue(parentId) },
      })
    }
    return useFetch<TEntity[]>(basePath)
  }

  function useOne(id: MaybeRef<string>) {
    return useFetch<TEntity>(() => `${basePath}/${toValue(id)}`)
  }

  function create(data: TCreate) {
    return $fetch<TEntity>(basePath, { method: 'POST', body: data })
  }

  function update(id: string, data: TUpdate) {
    return $fetch<TEntity>(`${basePath}/${id}`, { method: 'PUT', body: data })
  }

  function remove(id: string) {
    return $fetch(`${basePath}/${id}`, { method: 'DELETE' })
  }

  return { useList, useOne, create, update, remove }
}
