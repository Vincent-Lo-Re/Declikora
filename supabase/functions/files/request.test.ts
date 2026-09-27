import { assertEquals } from "@std/assert"
import { memberToken, parseMode } from "./request.ts"

Deno.test("mode : « kick » par défaut, liste fermée", () => {
  assertEquals(parseMode(undefined), "kick")
  assertEquals(parseMode({}), "kick")
  assertEquals(parseMode({ mode: "kick" }), "kick")
  assertEquals(parseMode({ mode: "audit" }), "audit")
  assertEquals(parseMode({ mode: "clean" }), "clean")
  assertEquals(parseMode({ mode: "tout" }), null)
  assertEquals(parseMode([]), null)
  assertEquals(parseMode("kick"), null)
})

Deno.test("jeton de membre : un JWT, jamais une clé sb_", () => {
  assertEquals(memberToken(null), null)
  assertEquals(memberToken("Bearer sb_publishable_abc"), null)
  assertEquals(memberToken("Basic abc.def.ghi"), null)
  assertEquals(memberToken("Bearer abc.def.ghi"), "abc.def.ghi")
  assertEquals(memberToken("bearer   abc.def.ghi"), "abc.def.ghi")
})
