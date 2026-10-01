import { cn } from "cn"
import {
  ALargeSmall,
  Apple,
  BatteryFull,
  Bookmark,
  ChevronLeft,
  Eye,
  Lock,
  Moon,
  Pencil,
  Share,
  Signal,
  Smartphone,
  Sun,
  UserCheck,
  UserX,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { StaticBlock } from "@/blocks/components/static-block"
import type { Block, Draft } from "@/blocks/types"
import { CoverPreview } from "@/components/editor/presentation"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  chosenValue,
  devices,
  previewModes,
  previewReaders,
  previewThemes,
  type PreviewSettings,
} from "@/lib/editor/preview"
import { texts } from "@/texts"

const labels = texts.editor.preview

/**
 * L'aperçu de l'éditeur du Fil (ADMIN § 4) : la barre de mise en forme à gauche, le téléphone,
 * et à droite la barre de l'aperçu. Le téléphone tient dans la hauteur de la fenêtre ; l'article
 * défile dedans.
 */
export function FeedPreview({
  preview,
  onPreviewChange,
  toolbar,
  notices,
  appBar,
  children,
}: {
  preview: PreviewSettings
  onPreviewChange: (preview: PreviewSettings) => void
  // La barre de mise en forme : cachée en Lecture, sa place gardée (le téléphone ne bouge pas).
  toolbar: ReactNode
  // Messages au-dessus du téléphone (brouillon trop lourd, échec d'enregistrement).
  notices: ReactNode
  // En Lecture : la barre du haut de l'app, au-dessus de ce qui défile.
  appBar?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 justify-center gap-9 px-4 py-4">
      <div
        className={cn(
          "shrink-0 self-start",
          preview.mode === "read" && "invisible"
        )}
      >
        {toolbar}
      </div>
      <div className="flex min-h-0 flex-col items-center gap-3">
        {notices}
        <div
          role="region"
          aria-label={labels.screen[preview.device]}
          className="blocks-device"
          data-device={preview.device}
          data-blocks-theme={preview.theme}
          data-large-text={preview.largeText || undefined}
        >
          <div className="blocks-screen">
            <div aria-hidden className="blocks-status">
              <span>{labels.time[preview.device]}</span>
              <span className="blocks-camera" />
              <span className="blocks-status-icons">
                <Signal />
                <Wifi />
                <BatteryFull />
              </span>
            </div>
            {appBar}
            <div className="blocks-screen-scroll">{children}</div>
            <div aria-hidden className="blocks-home" />
          </div>
        </div>
      </div>
      <PreviewTools preview={preview} onChange={onPreviewChange} />
    </div>
  )
}

type Choice<T extends string> = Record<T, { label: string; icon: LucideIcon }>

const deviceChoices: Choice<(typeof devices)[number]> = {
  ios: { label: labels.device.ios, icon: Apple },
  android: { label: labels.device.android, icon: Smartphone },
}
const modeChoices: Choice<(typeof previewModes)[number]> = {
  edit: { label: labels.mode.edit, icon: Pencil },
  read: { label: labels.mode.read, icon: Eye },
}
const themeChoices: Choice<(typeof previewThemes)[number]> = {
  light: { label: labels.theme.light, icon: Sun },
  dark: { label: labels.theme.dark, icon: Moon },
}
const readerChoices: Choice<(typeof previewReaders)[number]> = {
  subscriber: { label: labels.reader.subscriber, icon: UserCheck },
  visitor: { label: labels.reader.visitor, icon: UserX },
}

/** La barre verticale à droite du téléphone : une icône par choix, son sens dans l'infobulle. */
function PreviewTools({
  preview,
  onChange,
}: {
  preview: PreviewSettings
  onChange: (preview: PreviewSettings) => void
}) {
  return (
    <div
      role="toolbar"
      aria-label={labels.tools}
      aria-orientation="vertical"
      className="flex shrink-0 flex-col items-center gap-1 self-start rounded-lg border bg-background p-1 shadow-xs"
    >
      <ToolGroup
        label={labels.device.label}
        values={devices}
        choices={deviceChoices}
        value={preview.device}
        onChange={(device) => onChange({ ...preview, device })}
      />
      <Separator className="my-1 w-5" />
      <ToolGroup
        label={labels.mode.label}
        values={previewModes}
        choices={modeChoices}
        value={preview.mode}
        onChange={(mode) => onChange({ ...preview, mode })}
      />
      <Separator className="my-1 w-5" />
      <ToolGroup
        label={labels.theme.label}
        values={previewThemes}
        choices={themeChoices}
        value={preview.theme}
        onChange={(theme) => onChange({ ...preview, theme })}
      />
      <Separator className="my-1 w-5" />
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              aria-label={labels.largeText}
              pressed={preview.largeText}
              onPressedChange={(largeText) =>
                onChange({ ...preview, largeText })
              }
            />
          }
        >
          <ALargeSmall />
        </TooltipTrigger>
        <TooltipContent side="left">{labels.largeText}</TooltipContent>
      </Tooltip>
      {preview.mode === "read" && (
        <>
          <Separator className="my-1 w-5" />
          <ToolGroup
            label={labels.reader.label}
            values={previewReaders}
            choices={readerChoices}
            value={preview.reader}
            onChange={(reader) => onChange({ ...preview, reader })}
          />
        </>
      )}
    </div>
  )
}

function ToolGroup<T extends string>({
  label,
  values,
  choices,
  value,
  onChange,
}: {
  label: string
  values: readonly T[]
  choices: Choice<T>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <ToggleGroup
      aria-label={label}
      orientation="vertical"
      className="flex-col"
      value={[value]}
      onValueChange={(next: string[]) => {
        const chosen = chosenValue(values, next)
        if (chosen) onChange(chosen)
      }}
    >
      {values.map((candidate) => {
        const { label: itemLabel, icon: Icon } = choices[candidate]
        return (
          <Tooltip key={candidate}>
            <TooltipTrigger
              render={
                <ToggleGroupItem value={candidate} aria-label={itemLabel} />
              }
            >
              <Icon />
            </TooltipTrigger>
            <TooltipContent side="left">{itemLabel}</TooltipContent>
          </Tooltip>
        )
      })}
    </ToggleGroup>
  )
}

/** En Lecture : la barre du haut de l'app (provisoire), sans action. */
export function ReadAppBar({ section }: { section: string }) {
  return (
    <div aria-hidden className="blocks-appbar">
      <ChevronLeft />
      <span className="flex-1">{section}</span>
      <Bookmark />
      <Share />
    </div>
  )
}

/**
 * En Lecture : l'article comme dans l'app, sans outils. Réservé et lu par une personne sans la
 * formule, il ne montre pas ses blocs (l'app ne les reçoit pas) : seulement l'image, le titre et
 * l'invitation à prendre la formule.
 */
export function ReadView({
  draft,
  title,
  cover,
  meta,
  locked,
  resolve,
}: {
  draft: Draft
  title: string
  cover: BlockMedia
  // Catégorie et temps de lecture, sous le titre.
  meta: string
  // `false` : tout se lit ; sinon le nom de la formule (ou `null` s'il n'est pas encore lu).
  locked: string | null | false
  // Le bloc d'un modèle partagé, tel qu'il est aujourd'hui.
  resolve: (block: Block) => Block | null
}) {
  return (
    <article className="blocks-phone blocks-read">
      <CoverPreview
        media={cover}
        editable={false}
        onChoose={() => undefined}
        onSelect={() => undefined}
      />
      <h1 className="blocks-title">{title}</h1>
      <p className="blocks-meta">{meta}</p>
      {locked !== false ? (
        <div className="blocks-locked">
          <Lock aria-hidden className="size-6" />
          <p className="blocks-locked-title">{labels.locked.title}</p>
          <p className="blocks-locked-text">
            {locked ? labels.locked.text(locked) : labels.locked.textUnknown}
          </p>
          <span className="blocks-locked-action">{labels.locked.action}</span>
        </div>
      ) : (
        <div className="blocks-list">
          {draft.blocks.map((block) => {
            const shown = block.type === "linked" ? resolve(block) : block
            return shown ? <StaticBlock key={block.id} block={shown} /> : null
          })}
        </div>
      )}
    </article>
  )
}
