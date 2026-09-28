// Modèles de blocs (étape 6) : lecture directe de la base locale, pour vérifier ce que
// l'interface ne montre pas (la forme exacte d'un brouillon enregistré).

import postgres from "postgres"

import { localSupabase } from "./local-supabase.ts"

/** Les blocs de premier niveau du brouillon enregistré d'un contenu. */
export async function readDraftBlocks(
  contentId: string
): Promise<{ id: string; type: string; templateId?: string }[]> {
  const sql = postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
  try {
    const [row] = await sql<
      { blocks: { id: string; type: string; templateId?: string }[] }[]
    >`select draft -> 'blocks' as blocks from public.contents where id = ${contentId}`
    if (!row) throw new Error(`Contenu ${contentId} introuvable`)
    return row.blocks
  } finally {
    await sql.end()
  }
}
