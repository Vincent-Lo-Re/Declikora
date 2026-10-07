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
  /** Les 6 chiffres saisis : la connexion part sans attendre le clic. */
  onComplete?: () => void
}

/**
 * Saisie d'un code à 6 chiffres (reçu par e-mail ou donné par l'app du téléphone), sur toute la
 * largeur du formulaire : six cases égales, un peu plus hautes que les champs. Rempli, il appelle
 * onComplete.
 */
export function CodeInput({ invalid, ...props }: CodeInputProps) {
  return (
    <InputOTP
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-invalid={invalid}
      containerClassName="w-full"
      {...props}
    >
      <InputOTPGroup className="w-full">
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            aria-invalid={invalid}
            className="h-12 flex-1 text-lg"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
