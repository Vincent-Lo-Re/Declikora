import { REGEXP_ONLY_DIGITS } from "input-otp"

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type CodeInputProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
  disabled?: boolean
  autoFocus?: boolean
}

/** Saisie d'un code à 6 chiffres (reçu par e-mail ou donné par l'app du téléphone). */
export function CodeInput({ invalid, ...props }: CodeInputProps) {
  return (
    <InputOTP
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-invalid={invalid}
      {...props}
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            aria-invalid={invalid}
            className="size-10 text-base"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
