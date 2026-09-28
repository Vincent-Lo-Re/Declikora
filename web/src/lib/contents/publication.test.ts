import { describe, expect, it } from "vitest"

import { settingsDiff, type ContentSettings } from "@/lib/contents/api"
import {
  publicationStatus,
  SCHEDULE_GRACE_MS,
  scheduleErrorText,
  versionOriginLabel,
} from "@/lib/contents/publication"
import { texts } from "@/texts"

const NOW = Date.parse("2026-09-27T12:00:00Z")

const base = {
  live: null,
  first_published_at: null,
  scheduled_at: null,
  schedule_error: null,
}

describe("état de publication", () => {
  it("brouillon jamais publié, puis retiré de l'app", () => {
    expect(publicationStatus(base, 3, NOW)).toEqual({
      live: "draft",
      schedule: { kind: "none" },
    })
    expect(
      publicationStatus(
        { ...base, first_published_at: "2026-09-01T08:00:00Z" },
        3,
        NOW
      ).live
    ).toBe("withdrawn")
  })

  it("en ligne tant que le brouillon est celui de la version publiée", () => {
    const live = { ...base, live: { draft_rev: 5 } }
    expect(publicationStatus(live, 5, NOW).live).toBe("live")
    // Une révision de plus (enregistrée ici ou ailleurs) : modifié depuis la publication.
    expect(publicationStatus(live, 6, NOW).live).toBe("modified")
    // Une modification pas encore enregistrée compte aussi.
    expect(publicationStatus(live, 5, NOW, true).live).toBe("modified")
  })

  it("programmé, puis en attente quand l'heure est passée ([D31]), ou échoué", () => {
    const at = "2026-09-27T12:30:00Z"
    expect(publicationStatus({ ...base, scheduled_at: at }, 1, NOW)).toEqual({
      live: "draft",
      schedule: { kind: "scheduled", at },
    })
    // Juste après l'heure prévue, la tâche planifiée n'est peut-être pas encore passée.
    expect(
      publicationStatus({ ...base, scheduled_at: at }, 1, Date.parse(at))
        .schedule
    ).toEqual({ kind: "waiting", at, overdue: false })
    expect(
      publicationStatus(
        { ...base, scheduled_at: at },
        1,
        Date.parse(at) + SCHEDULE_GRACE_MS + 1000
      ).schedule
    ).toEqual({ kind: "waiting", at, overdue: true })
    expect(
      publicationStatus(
        { ...base, schedule_error: "brouillon_en_cours_d_ecriture" },
        1,
        NOW
      ).schedule
    ).toEqual({ kind: "failed", code: "brouillon_en_cours_d_ecriture" })
    // Une nouvelle programmation l'emporte sur un ancien échec.
    expect(
      publicationStatus(
        { ...base, scheduled_at: at, schedule_error: "auteur_parti" },
        1,
        NOW
      ).schedule.kind
    ).toBe("scheduled")
  })

  it("dit pourquoi une programmation a échoué, avec les codes de la publication aussi", () => {
    expect(scheduleErrorText("auteur_parti")).toBe(
      texts.publication.scheduleErrors.auteur_parti
    )
    expect(scheduleErrorText("image_sans_fichier")).toBe(
      "une image n'a pas de fichier : choisis-en un, ou supprime le bloc."
    )
    expect(scheduleErrorText("code_inconnu")).toBe(
      texts.publication.scheduleErrors.erreur_inattendue
    )
  })

  it("nomme l'origine d'une version", () => {
    expect(versionOriginLabel("scheduled")).toBe(
      texts.publication.history.origins.scheduled
    )
    expect(versionOriginLabel("autre")).toBe(
      texts.publication.history.origins.manual
    )
  })
})

describe("réglages envoyés avec le brouillon", () => {
  const saved: ContentSettings = {
    accessChosen: false,
    accessLevelId: null,
    slug: null,
    categoryIds: [],
  }

  it("envoie les catégories quand elles changent, dans n'importe quel ordre ([D44])", () => {
    const withTwo = { ...saved, categoryIds: ["b", "a"] }
    expect(settingsDiff(saved, withTwo)).toEqual({ category_ids: ["a", "b"] })
    expect(
      settingsDiff({ ...saved, categoryIds: ["a", "b"] }, withTwo)
    ).toBeNull()
    // Aucune catégorie : la liste vide remplace celle de la base.
    expect(settingsDiff(withTwo, saved)).toEqual({ category_ids: [] })
  })

  it("n'envoie rien quand rien ne change", () => {
    expect(settingsDiff(saved, { ...saved })).toBeNull()
  })

  it("n'envoie le niveau qu'une fois choisi ([D41] : même « Gratuit » le marque choisi)", () => {
    // Pas encore choisi : même null n'est pas envoyé (il vaudrait « Gratuit »).
    expect(settingsDiff(saved, { ...saved, slug: "aide" })).toEqual({
      slug: "aide",
    })
    expect(settingsDiff(saved, { ...saved, accessChosen: true })).toEqual({
      access_level_id: null,
    })
    const chosen = { ...saved, accessChosen: true }
    expect(settingsDiff(chosen, { ...chosen })).toBeNull()
    expect(
      settingsDiff(chosen, { ...chosen, accessLevelId: "formule-1" })
    ).toEqual({ access_level_id: "formule-1" })
  })

  it("envoie l'adresse retirée (null)", () => {
    expect(
      settingsDiff({ ...saved, slug: "aide" }, { ...saved, slug: null })
    ).toEqual({ slug: null })
  })
})
