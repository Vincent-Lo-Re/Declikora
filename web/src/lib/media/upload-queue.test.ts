import { describe, expect, it, vi } from "vitest"

import type { Media } from "@/lib/media/constants"
import { TransferError } from "@/lib/media/transfer"
import type { UploadRunner } from "@/lib/media/upload"
import { UploadQueue } from "@/lib/media/upload-queue"

const media = (id: string, status: Media["status"] = "pending") =>
  ({ id, status, path: `${id}/fichier.pdf` }) as Media

/** Envois simulés : chacun attend qu'on le termine (ou qu'on l'annule). */
function controlledRunner() {
  const pending = new Map<
    string,
    { resolve: (value: Media) => void; reject: (error: unknown) => void }
  >()
  const runner: UploadRunner = (job, { signal, update }) =>
    new Promise((resolve, reject) => {
      job.media ??= media(`ligne-${job.file.name}`)
      update({ stage: "sending", progress: 0.5 })
      signal.addEventListener("abort", () =>
        reject(new TransferError("annule"))
      )
      pending.set(job.file.name, { resolve, reject })
    })
  return { runner, pending }
}

const files = (...names: string[]) =>
  names.map((name) => new File(["x"], name, { type: "application/pdf" }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("file d'envoi", () => {
  it("envoie deux fichiers à la fois, puis le suivant", async () => {
    const { runner, pending } = controlledRunner()
    const queue = new UploadQueue({ runner, discard: vi.fn() })
    queue.add(files("a.pdf", "b.pdf", "c.pdf"))

    expect(queue.getSnapshot().map((item) => item.stage)).toEqual([
      "sending",
      "sending",
      "waiting",
    ])
    pending.get("a.pdf")!.resolve(media("a", "ready"))
    await flush()
    expect(queue.getSnapshot().map((item) => item.stage)).toEqual([
      "done",
      "sending",
      "sending",
    ])
    expect(queue.busy).toBe(true)
  })

  it("annule un envoi et fait effacer sa ligne en attente", async () => {
    const { runner } = controlledRunner()
    const discard = vi.fn(async () => {})
    const queue = new UploadQueue({ runner, discard })
    queue.add(files("a.pdf"))
    const [item] = queue.getSnapshot()

    queue.cancel(item.id)
    await flush()

    expect(queue.getSnapshot()[0].stage).toBe("cancelled")
    expect(discard).toHaveBeenCalledWith("ligne-a.pdf")
    expect(discard).toHaveBeenCalledTimes(1)
  })

  it("affiche l'erreur et permet de réessayer avec la même ligne", async () => {
    const { runner, pending } = controlledRunner()
    const run = vi.fn(runner)
    const queue = new UploadQueue({ runner: run, discard: vi.fn() })
    const settled = vi.fn()
    queue.onSettled(settled)
    queue.add(files("a.pdf"))

    pending.get("a.pdf")!.reject(new TransferError("envoi_interrompu"))
    await flush()
    const [failed] = queue.getSnapshot()
    expect(failed).toMatchObject({ stage: "error", canRetry: true })
    expect(failed.error).toMatch(/interrompu/)
    expect(settled).toHaveBeenCalledTimes(1)

    queue.retry(failed.id)
    expect(run).toHaveBeenCalledTimes(2)
    // Le deuxième essai reprend la ligne déjà créée.
    expect(run.mock.calls[1][0].media?.id).toBe("ligne-a.pdf")
  })

  it("abandonne la ligne d'un envoi en échec qu'on retire de la liste", async () => {
    const { runner, pending } = controlledRunner()
    const discard = vi.fn(async () => {})
    const queue = new UploadQueue({ runner, discard })
    queue.add(files("a.pdf"))
    pending.get("a.pdf")!.reject(new TransferError("envoi_interrompu"))
    await flush()

    queue.clearFinished()

    expect(queue.getSnapshot()).toEqual([])
    expect(discard).toHaveBeenCalledWith("ligne-a.pdf")
  })
})
