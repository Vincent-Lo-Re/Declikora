import { CalendarDays } from "lucide-react"
import { useState, type ComponentProps } from "react"
import { fr } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
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
 * Un jour, écrit à la française (« 25/10/2099 ») ou choisi dans le calendrier. La valeur est le
 * texte saisi : parseDayInput (lib/dates.ts) le lit.
 */
export function DayField({ value, onChange, onBlur, ...props }: FieldProps) {
  const [open, setOpen] = useState(false)
  const selected = dayOf(parseDayInput(value))
  return (
    <div className="flex gap-2">
      <Input
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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
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
    </div>
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
