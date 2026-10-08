import { useEffect } from "react"

import { useBrand } from "@/hooks/use-brand-name"
import { applyAdminLanguage } from "@/lib/language"

/**
 * La langue de toute l'admin (Paramètres › Avancé), lue avec l'identité de l'admin : gardée sur ce
 * navigateur pour le prochain chargement ; la page se recharge si elle change et que le membre
 * n'a pas choisi la sienne.
 */
export function useAdminLanguage() {
  const adminLanguage = useBrand()?.language
  useEffect(() => {
    if (adminLanguage) applyAdminLanguage(adminLanguage)
  }, [adminLanguage])
}
