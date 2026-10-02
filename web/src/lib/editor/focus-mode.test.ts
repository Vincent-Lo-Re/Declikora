import { describe, expect, it } from "vitest"

import { isApple, isFocusShortcut } from "@/lib/editor/focus-mode"

const key = (fields: Partial<KeyboardEvent>) => ({
  key: ".",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...fields,
})

describe("mode Concentration", () => {
  it("reconnaît un Mac par sa plateforme", () => {
    expect(isApple("MacIntel")).toBe(true)
    expect(isApple("iPad")).toBe(true)
    expect(isApple("Win32")).toBe(false)
    expect(isApple("Linux x86_64")).toBe(false)
  })

  it("⌘ . sur Mac, Ctrl + . ailleurs", () => {
    expect(isFocusShortcut(key({ metaKey: true }), true)).toBe(true)
    expect(isFocusShortcut(key({ ctrlKey: true }), true)).toBe(false)
    expect(isFocusShortcut(key({ ctrlKey: true }), false)).toBe(true)
    expect(isFocusShortcut(key({ metaKey: true }), false)).toBe(false)
    expect(isFocusShortcut(key({ metaKey: true, altKey: true }), true)).toBe(
      false
    )
    expect(isFocusShortcut(key({ key: ",", metaKey: true }), true)).toBe(false)
  })
})
