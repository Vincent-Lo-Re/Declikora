import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UserPlus } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { language } from "@/lib/language"
import { inviteSchema } from "@/lib/schemas"
import { callTeam, teamQueryKey, type TeamRole } from "@/lib/team"
import { texts } from "@/texts"

const roleItems: { value: TeamRole; label: string }[] = [
  { value: "editor", label: texts.roles.editor },
  { value: "admin", label: texts.roles.admin },
]

const emptyForm = { email: "", full_name: "", role: "editor" as TeamRole }

/** Inviter un membre : e-mail, nom, rôle. La fonction « equipe » envoie l'e-mail. */
export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: emptyForm,
  })
  const { errors } = form.formState

  const invite = useMutation({
    mutationFn: (values: typeof emptyForm) =>
      callTeam({ action: "invite", ...values, language }),
    onSuccess: (_, values) => {
      toast.success(texts.team.invited(values.email))
      setOpen(false)
      form.reset(emptyForm)
    },
    onError: (error) => {
      form.setError("root", { message: error.message })
      checkAccess(error)
    },
    // Même en cas d'échec, la liste est relue : elle montre l'état réel de l'équipe
    // (par exemple une réponse perdue alors que l'invitation est partie).
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamQueryKey }),
  })

  const onSubmit = form.handleSubmit((values) => invite.mutate(values))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) form.reset(emptyForm)
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlus />
        {texts.team.invite}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{texts.team.invite}</DialogTitle>
            <DialogDescription>
              {texts.team.inviteDescription}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-email">
                    {texts.team.email}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="invite-email"
                    type="email"
                    autoComplete="off"
                    placeholder={texts.team.emailPlaceholder}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-name">
                    {texts.team.name}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="invite-name"
                    autoComplete="off"
                    placeholder={texts.team.namePlaceholder}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="invite-role">
                    {texts.team.role}
                  </FieldLabel>
                  <Select
                    items={roleItems}
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) field.onChange(value)
                    }}
                  >
                    <SelectTrigger id="invite-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <FieldError errors={[errors.root]} />
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={invite.isPending}>
              {invite.isPending && <Spinner />}
              {texts.team.sendInvitation}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
