import { useQuery } from "@tanstack/react-query"
import { TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { STORAGE_ALERT_BYTES, STORAGE_QUOTA_BYTES } from "@/lib/media/constants"
import { formatBytes } from "@/lib/media/format"
import { storageRead } from "@/lib/reads"
import { texts } from "@/texts"

/** Place occupée par les fichiers (1 Go dans l'offre gratuite), avec une alerte à 800 Mo. */
export function StorageUsage() {
  const storage = useQuery(storageRead())
  if (storage.data === undefined) return null
  const used = storage.data
  const usedText = formatBytes(used)
  const valueText = texts.media.storage.value(
    usedText,
    formatBytes(STORAGE_QUOTA_BYTES)
  )

  return (
    <div className="space-y-3">
      <Progress
        value={Math.min(100, (used / STORAGE_QUOTA_BYTES) * 100)}
        className="w-64"
        getAriaValueText={() => valueText}
      >
        <ProgressLabel>{texts.media.storage.label}</ProgressLabel>
        <ProgressValue>{() => valueText}</ProgressValue>
      </Progress>
      {used >= STORAGE_ALERT_BYTES && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>{texts.media.storage.alertTitle}</AlertTitle>
          <AlertDescription>
            {texts.media.storage.alert(usedText)}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
