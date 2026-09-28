// En-têtes CORS : seule l'administration peut appeler la fonction depuis un navigateur.

const allowedOrigins = [
  // Production
  /^https:\/\/admin\.declikora\.app$/,
  // Première adresse de production, qui redirige maintenant vers admin.declikora.app
  /^https:\/\/declikora-admin\.vercel\.app$/,
  // Adresses de test créées par Vercel pour chaque demande de fusion
  /^https:\/\/declikora-admin-[a-z0-9-]+-vincent-lo-re\.vercel\.app$/,
  // Serveur de développement
  /^http:\/\/(127\.0\.0\.1|localhost):5173$/,
]

// En-têtes envoyés par supabase-js (liste reprise de « @supabase/supabase-js/cors »).
const allowedHeaders =
  "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage"

export function isAllowedOrigin(origin: string | null): origin is string {
  return origin !== null && allowedOrigins.some((pattern) => pattern.test(origin))
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) {
    return { Vary: "Origin" }
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": allowedHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}
