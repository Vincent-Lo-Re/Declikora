import { cn } from "cn"
import {
  ALargeSmall,
  BatteryFull,
  Bookmark,
  ChevronLeft,
  Eye,
  Focus,
  Lock,
  Maximize,
  MoveVertical,
  Moon,
  Pencil,
  Share,
  Signal,
  Sun,
  UserCheck,
  UserX,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { StaticBlock } from "@/blocks/components/static-block"
import { AndroidLogo, AppleLogo } from "@/components/brand-icons"
import type { Block, Draft } from "@/blocks/types"
import { CoverPreview } from "@/components/editor/presentation"
import { Kbd } from "@/components/ui/kbd"
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
  fullScreenScale,
  previewFits,
  showsFullScreen,
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
  focus,
  children,
}: {
  preview: PreviewSettings
  onPreviewChange: (preview: PreviewSettings) => void
  // Concentration (⌘ . ou Ctrl + .) : sous Édition et Lecture, dans la barre de l'aperçu.
  focus: FocusTool
  // La barre de mise en forme : cachée en Lecture, sa place gardée (le téléphone ne bouge pas).
  toolbar: ReactNode
  // Messages au-dessus du téléphone (brouillon trop lourd, échec d'enregistrement).
  notices: ReactNode
  // En Lecture : la barre du haut de l'app, au-dessus de ce qui défile.
  appBar?: ReactNode
  children: ReactNode
}) {
  // Écran entier (Lecture) : la hauteur disponible pour le téléphone, relue quand la fenêtre change.
  const frame = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState<number | null>(null)
  const full = showsFullScreen(preview)
  useEffect(() => {
    const element = frame.current
    if (!full || !element) return
    const observer = new ResizeObserver(() =>
      setAvailable(element.clientHeight)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [full])
  const scale =
    full && available !== null
      ? fullScreenScale(preview.device, available)
      : null
  return (
    // Centré sans rien cacher : trop étroit, l'aperçu défile au lieu de déborder des deux côtés.
    <div className="flex min-h-0 flex-1 justify-center-safe gap-4 px-3 py-4 wide:gap-9 wide:px-4">
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
          ref={frame}
          className="flex min-h-0 w-full flex-1 flex-col items-center"
        >
          <div
            role="region"
            aria-label={labels.screen[preview.device]}
            className="blocks-device"
            data-device={preview.device}
            data-blocks-theme={preview.theme}
            data-large-text={preview.largeText || undefined}
            data-fit={scale !== null ? "full" : undefined}
            // eslint-disable-next-line no-restricted-syntax -- réduction tirée d'une mesure (hauteur de la fenêtre)
            style={
              scale !== null
                ? ({ "--blocks-device-scale": scale } as CSSProperties)
                : undefined
            }
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
      </div>
      <PreviewTools
        preview={preview}
        onChange={onPreviewChange}
        scale={scale}
        focus={focus}
      />
    </div>
  )
}

// Une icône Lucide, ou l'un des deux logos de marque (iPhone, Android).
type Icon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>
type Choice<T extends string> = Record<T, { label: string; icon: Icon }>

const deviceChoices: Choice<(typeof devices)[number]> = {
  ios: { label: labels.device.ios, icon: AppleLogo },
  android: { label: labels.device.android, icon: AndroidLogo },
}
const modeChoices: Choice<(typeof previewModes)[number]> = {
  edit: { label: labels.mode.edit, icon: Pencil },
  read: { label: labels.mode.read, icon: Eye },
}
const themeChoices: Choice<(typeof previewThemes)[number]> = {
  light: { label: labels.theme.light, icon: Sun },
  dark: { label: labels.theme.dark, icon: Moon },
}
const fitChoices: Choice<(typeof previewFits)[number]> = {
  adjust: { label: labels.fit.adjust, icon: MoveVertical },
  full: { label: labels.fit.full, icon: Maximize },
}
const readerChoices: Choice<(typeof previewReaders)[number]> = {
  subscriber: { label: labels.reader.subscriber, icon: UserCheck },
  visitor: { label: labels.reader.visitor, icon: UserX },
}

type FocusTool = {
  on: boolean
  // Le raccourci écrit (« ⌘ . ») et pour les lecteurs d'écran (« Meta+. »).
  shortcut: string
  keys: string
  onToggle: () => void
}

/** La barre verticale à droite du téléphone : une icône par choix, son sens dans l'infobulle. */
function PreviewTools({
  preview,
  onChange,
  scale,
  focus,
}: {
  preview: PreviewSettings
  onChange: (preview: PreviewSettings) => void
  // La réduction de l'écran entier, s'il est montré.
  scale: number | null
  focus: FocusTool
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
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              aria-label={texts.editor.focusMode.label}
              aria-keyshortcuts={focus.keys}
              pressed={focus.on}
              onPressedChange={focus.onToggle}
            />
          }
        >
          <Focus />
        </TooltipTrigger>
        <TooltipContent side="left">
          {texts.editor.focusMode.label} <Kbd>{focus.shortcut}</Kbd>
        </TooltipContent>
      </Tooltip>
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
          <Separator className="my-1 w-5" />
          <ToolGroup
            label={labels.fit.label}
            values={previewFits}
            choices={fitChoices}
            value={preview.fit}
            onChange={(fit) => onChange({ ...preview, fit })}
          />
          {scale !== null && (
            <span
              aria-label={labels.fit.scaleLabel(Math.round(scale * 100))}
              className="pb-1 text-xs text-muted-foreground tabular-nums"
            >
              {labels.fit.scale(Math.round(scale * 100))}
            </span>
          )}
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
