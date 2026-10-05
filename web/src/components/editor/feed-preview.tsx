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
import { Link } from "react-router"

import type { BlockMedia } from "@/blocks/components/context"
import { StaticBlock } from "@/blocks/components/static-block"
import { AndroidLogo, AppleLogo } from "@/components/brand-icons"
import type { Block, Draft } from "@/blocks/types"
import { AudioPreview, CoverPreview } from "@/components/editor/presentation"
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
import type { LockableKind } from "@/lib/editor/profile"
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
  readers = true,
  children,
}: {
  preview: PreviewSettings
  onPreviewChange: (preview: PreviewSettings) => void
  // En Lecture, le choix « abonné / sans la formule » : pas pour un modèle de bloc, qui n'a pas
  // de niveau d'accès.
  readers?: boolean
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
    // Une grille : les messages au-dessus du téléphone, puis la barre de mise en forme, le
    // téléphone et la barre de l'aperçu, ces deux barres alignées sur le début du contenu de
    // l'écran (preview.css). Centré sans rien cacher : trop étroit, l'aperçu défile.
    // data-backdrop : le fond autour du téléphone (un clic remet l'éditeur à son état de base).
    <div
      data-backdrop
      data-device={preview.device}
      className="blocks-preview-layout min-h-0 flex-1 gap-x-4 px-3 py-4 wide:gap-x-9 wide:px-4"
      // eslint-disable-next-line no-restricted-syntax -- réduction tirée d'une mesure (hauteur de la fenêtre)
      style={
        scale !== null
          ? ({ "--blocks-device-scale": scale } as CSSProperties)
          : undefined
      }
    >
      <div
        data-backdrop
        className="blocks-preview-notices mb-3 grid gap-3 empty:hidden"
      >
        {notices}
      </div>
      <div
        className={cn(
          "blocks-preview-toolbar",
          preview.mode === "read" && "invisible"
        )}
      >
        {toolbar}
      </div>
      <div
        ref={frame}
        data-backdrop
        className="blocks-preview-frame flex min-h-0 flex-col items-center"
      >
        <div
          role="region"
          aria-label={labels.screen[preview.device]}
          className="blocks-device"
          data-device={preview.device}
          data-blocks-theme={preview.theme}
          data-large-text={preview.largeText || undefined}
          data-fit={scale !== null ? "full" : undefined}
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
      <div className="blocks-preview-tools">
        <PreviewTools
          preview={preview}
          onChange={onPreviewChange}
          scale={scale}
          focus={focus}
          readers={readers}
        />
      </div>
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
  readers,
}: {
  preview: PreviewSettings
  onChange: (preview: PreviewSettings) => void
  // La réduction de l'écran entier, s'il est montré.
  scale: number | null
  focus: FocusTool
  readers: boolean
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
          {readers && (
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
          <Separator className="my-1 w-5" />
          <ToolGroup
            label={labels.fit.label}
            values={previewFits}
            choices={fitChoices}
            value={preview.fit}
            onChange={(fit) => onChange({ ...preview, fit })}
          />
          {scale !== null && (
            <span className="pb-1 text-xs text-muted-foreground tabular-nums">
              <span aria-hidden>
                {labels.fit.scale(Math.round(scale * 100))}
              </span>
              <span className="sr-only">
                {labels.fit.scaleLabel(Math.round(scale * 100))}
              </span>
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

/**
 * En Lecture : la barre du haut de l'app (provisoire). Sa flèche mène à l'écran du dessus, comme
 * dans l'app (QCM du 04/10/2026) ; sans écran du dessus (méthode, article, page), elle ne fait
 * rien. Le reste n'a pas d'action.
 */
export function ReadAppBar({
  section,
  back,
}: {
  section: string
  // L'écran du dessus : son adresse et son titre.
  back: { to: string; title: string } | null
}) {
  return (
    <div className="blocks-appbar">
      {back ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                to={back.to}
                aria-label={labels.back(back.title)}
                className="blocks-appbar-back"
              />
            }
          >
            <ChevronLeft aria-hidden />
          </TooltipTrigger>
          <TooltipContent>{labels.back(back.title)}</TooltipContent>
        </Tooltip>
      ) : (
        <ChevronLeft aria-hidden />
      )}
      <span aria-hidden className="flex-1">
        {section}
      </span>
      <Bookmark aria-hidden />
      <Share aria-hidden />
    </div>
  )
}

/**
 * En Lecture : l'article, l'épisode ou la page comme dans l'app, sans outils. Réservé et lu par
 * une personne sans la formule, il ne montre ni ses blocs ni son audio (l'app ne les reçoit pas) :
 * seulement l'image, le titre et l'invitation à prendre la formule.
 */
export function ReadView({
  draft,
  title,
  cover,
  audio,
  meta,
  locked,
  resolve,
  children,
  after,
}: {
  draft: Draft
  title: string
  // L'image de présentation ; null pour une sorte sans image (une page).
  cover: BlockMedia | null
  // L'audio d'un épisode, sous le titre ; null pour une sorte sans audio.
  audio: BlockMedia | null
  // Catégorie et temps de lecture (un épisode : la durée de son audio), sous le titre ; null
  // pour une page, qui n'est dans aucune liste.
  meta: string | null
  // `false` : tout se lit ; sinon la sorte du contenu (ses mots) et le nom de la formule (`null`
  // s'il n'est pas encore lu). Un modèle de bloc ne se publie pas : il se lit toujours.
  locked: { kind: LockableKind; level: string | null } | false
  // Le bloc d'un modèle partagé, tel qu'il est aujourd'hui.
  resolve: (block: Block) => Block | null
  // À la place des blocs : le plan d'une méthode.
  children?: ReactNode
  // Sous les blocs, même verrouillés : les leçons d'un chapitre, les exercices d'une leçon, puis
  // « Suivant ».
  after?: ReactNode
}) {
  return (
    <article className="blocks-phone blocks-read">
      {cover && (
        <CoverPreview
          media={cover}
          editable={false}
          onChoose={() => undefined}
          onSelect={() => undefined}
        />
      )}
      <h1 className="blocks-title">{title}</h1>
      {meta !== null && <p className="blocks-meta">{meta}</p>}
      {audio && locked === false && (
        <AudioPreview
          media={audio}
          editable={false}
          onChoose={() => undefined}
          onSelect={() => undefined}
        />
      )}
      {locked !== false ? (
        <div className="blocks-locked">
          <Lock aria-hidden className="size-6" />
          <p className="blocks-locked-title">{labels.locked.title}</p>
          <p className="blocks-locked-text">
            {locked.level
              ? labels.locked.text[locked.kind](locked.level)
              : labels.locked.textUnknown[locked.kind]}
          </p>
          <span className="blocks-locked-action">{labels.locked.action}</span>
        </div>
      ) : (
        (children ?? (
          <div className="blocks-list">
            {draft.blocks.map((block) => {
              const shown = block.type === "linked" ? resolve(block) : block
              // Chaque bloc porte son identifiant : un clic dans le plan y fait défiler.
              return shown ? (
                <StaticBlock
                  key={block.id}
                  block={shown}
                  anchor={block.id}
                  anchorChildren={block.type !== "linked"}
                />
              ) : null
            })}
          </div>
        ))
      )}
      {after}
    </article>
  )
}
