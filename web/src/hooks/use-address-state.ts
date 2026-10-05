import { useCallback, useState } from "react"
import { useSearchParams } from "react-router"

/**
 * Un réglage de page gardé dans son adresse (lib/address.ts) : lu à l'arrivée sur la page, puis
 * écrit à chaque changement. L'adresse est remplacée : le retour du navigateur ramène à la page
 * d'avant, pas au réglage d'avant. Les autres paramètres de l'adresse sont gardés. read et write
 * ne changent pas d'un rendu à l'autre (fonctions de lib/address.ts).
 */
export function useAddressState<T>(
  read: (params: URLSearchParams) => T,
  write: (params: URLSearchParams, value: T) => void
): [T, (next: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  // Gardé ici, et non relu dans l'adresse : une recherche tapée ne perd jamais son curseur.
  const [value, setValue] = useState(() => read(searchParams))
  const update = useCallback(
    (next: T) => {
      setValue(next)
      setSearchParams(
        (params) => {
          const copy = new URLSearchParams(params)
          write(copy, next)
          return copy
        },
        { replace: true }
      )
    },
    [setSearchParams, write]
  )
  return [value, update]
}
