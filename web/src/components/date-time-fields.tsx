import { CalendarDays } from "lucide-react"
import { useState, type ComponentProps } from "react"
import { fr } from "react-day-picker/locale"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  formatDayInput,
  formatTimeInput,
  parseDayInput,
  parseTimeInput,
} from "@/lib/dates"
import { texts } from "@/texts"

const labels = texts.dates

type FieldProps = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string
  onChange: (value: string) => void
}

/** « 2099-10-25 » → le jour du calendrier (minuit, heure de l'ordinateur). */
function dayOf(iso: string | null): Date | undefined {
  if (!iso) return undefined
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** Le jour choisi dans le calendrier → « 2099-10-25 ». */
function isoOf(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Un jour, écrit à la française (« 25/10/2099 ») ou choisi dans le calendrier (le bouton est dans
 * le champ : l'`InputGroup` de shadcn). La valeur est le
 * texte saisi : parseDayInput (lib/dates.ts) le lit.
 */
export function DayField({ value, onChange, onBlur, ...props }: FieldProps) {
  const [open, setOpen] = useState(false)
  const selected = dayOf(parseDayInput(value))
  return (
    <InputGroup>
      <InputGroupInput
        {...props}
        value={value}
        inputMode="numeric"
        autoComplete="off"
        placeholder={labels.dayPlaceholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          // « 5/3/2099 » devient « 05/03/2099 ».
          const iso = parseDayInput(value)
          if (iso) onChange(formatDayInput(iso))
          onBlur?.(event)
        }}
      />
      <InputGroupAddon align="inline-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <InputGroupButton
                size="icon-xs"
                aria-label={labels.pickDay}
                disabled={props.disabled}
              />
            }
          >
            <CalendarDays />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="single"
              locale={fr}
              selected={selected}
              defaultMonth={selected}
              onSelect={(date) => {
                if (!date) return
                onChange(formatDayInput(isoOf(date)))
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  )
}

/**
 * Une heure, écrite à la française : « 08h00 ». « 8h », « 8h05 » ou « 08:05 » sont acceptés, et
 * réécrits « 08h05 » en quittant le champ. La valeur est le texte saisi : parseTimeInput le lit.
 */
export function TimeField({ value, onChange, onBlur, ...props }: FieldProps) {
  return (
    <Input
      {...props}
      value={value}
      autoComplete="off"
      placeholder={labels.timePlaceholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => {
        const time = parseTimeInput(value)
        if (time) onChange(formatTimeInput(time))
        onBlur?.(event)
      }}
    />
  )
}
