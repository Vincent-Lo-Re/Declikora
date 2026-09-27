import { assertEquals } from "@std/assert"
import { corsHeaders, isAllowedOrigin } from "./cors.ts"

// Les règles elles-mêmes sont testées avec la fonction « equipe » : ici, on vérifie que les deux
// copies sont identiques (hors en-tête de commentaire).
Deno.test("mêmes règles CORS que la fonction equipe", async () => {
  const body = (text: string) => text.slice(text.indexOf("\n\n"))
  assertEquals(
    body(await Deno.readTextFile(new URL("./cors.ts", import.meta.url))),
    body(await Deno.readTextFile(new URL("../equipe/cors.ts", import.meta.url))),
  )
})

Deno.test("l'admin est acceptée, une autre origine non", () => {
  assertEquals(isAllowedOrigin("https://declikora-admin.vercel.app"), true)
  assertEquals(isAllowedOrigin("https://pirate.fr"), false)
  assertEquals(
    corsHeaders("http://127.0.0.1:5173")["Access-Control-Allow-Methods"],
    "POST, OPTIONS",
  )
})
