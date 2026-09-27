import * as Sentry from "@sentry/react"
import type { RootOptions } from "react-dom/client"

/**
 * Active l'alerte en cas d'erreur (Sentry), si l'identifiant du projet
 * (VITE_SENTRY_DSN) est renseigné. Sans lui, rien n'est envoyé.
 *
 * Renvoie les options à passer à createRoot pour que les erreurs de React
 * soient signalées.
 */
export function initSentry(): RootOptions {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return {}

  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // Aucune donnée personnelle : ni infos sur la personne, ni cookies,
    // ni en-têtes, ni contenu des requêtes, ni paramètres d'adresse.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
  })

  return {
    onUncaughtError: Sentry.reactErrorHandler((error) => console.error(error)),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  }
}
