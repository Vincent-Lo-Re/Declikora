import { assertEquals } from "@std/assert"
import { corsHeaders, isAllowedOrigin } from "./cors.ts"

Deno.test("origines autorisées", () => {
  for (
    const origin of [
      "https://declikora-admin.vercel.app",
      "https://declikora-admin-git-etape-2-connexion-vincent-lo-re.vercel.app",
      "https://declikora-admin-a1b2c3d4e-vincent-lo-re.vercel.app",
      "http://127.0.0.1:5173",
      "http://localhost:5173",
    ]
  ) {
    assertEquals(isAllowedOrigin(origin), true, origin)
  }
})

Deno.test("origines refusées", () => {
  for (
    const origin of [
      null,
      "",
      "null",
      "http://declikora-admin.vercel.app",
      "https://declikora-admin.vercel.app.pirate.fr",
      "https://pirate.fr/https://declikora-admin.vercel.app",
      "https://declikora-admin-x-autre-equipe.vercel.app",
      "https://declikora-admin-a.b-vincent-lo-re.vercel.app",
      "https://autre-vincent-lo-re.vercel.app",
      "http://127.0.0.1:3000",
      "http://localhost:5173.pirate.fr",
    ]
  ) {
    assertEquals(isAllowedOrigin(origin), false, String(origin))
  }
})

Deno.test("en-têtes", () => {
  const allowed = corsHeaders("http://127.0.0.1:5173")
  assertEquals(allowed["Access-Control-Allow-Origin"], "http://127.0.0.1:5173")
  assertEquals(allowed["Access-Control-Allow-Methods"], "POST, OPTIONS")
  assertEquals(allowed.Vary, "Origin")
  assertEquals(allowed["Access-Control-Allow-Headers"].includes("authorization"), true)
  assertEquals(corsHeaders("https://pirate.fr"), { Vary: "Origin" })
})
