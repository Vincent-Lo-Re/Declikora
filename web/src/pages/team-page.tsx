import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  KeyRound,
  Mail,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserMinus,
  UserPen,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { LoadState } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { InviteDialog } from "@/components/team/invite-dialog"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
import {
  callTeam,
  countActiveAdmins,
  isInvitationExpired,
  listMembers,
  teamQueryKey,
  type Member,
  type TeamRequest,
} from "@/lib/team"
import { texts } from "@/texts"

// Actions qui demandent une confirmation.
type Confirmation = { action: "remove" | "reset_mfa"; member: Member }

// Actions sur un membre de la liste.
type MemberRequest = Exclude<TeamRequest, { action: "list" | "invite" }>

const successMessages: Record<
  Exclude<TeamRequest["action"], "list" | "invite">,
  string
> = {
  resend: texts.team.done.resent,
  set_role: texts.team.done.role,
  reset_mfa: texts.team.done.resetMfa,
  remove: texts.team.done.removed,
}

function displayName(member: Member) {
  return member.full_name ?? member.email
}

/** Équipe (réservée aux admins) : membres, invitations, rôles et double vérification. */
export function TeamPage() {
  const { title, description } = texts.sections.team
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const checkAccess = useAccessCheck()

  const members = useQuery({ queryKey: teamQueryKey, queryFn: listMembers })
  useEffect(() => {
    if (members.error) checkAccess(members.error)
  }, [members.error, checkAccess])

  const action = useMutation({
    mutationFn: (request: MemberRequest) => callTeam(request),
    onSuccess: async (_, request) => {
      toast.success(successMessages[request.action])
      await queryClient.invalidateQueries({ queryKey: teamQueryKey })
    },
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: () => setConfirmation(null),
  })

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<InviteDialog />}
      />

      {members.data === undefined ? (
        <LoadState query={members} failed={texts.team.loadFailed} />
      ) : (
        <div className="space-y-4">
          {/* Une mise à jour a échoué : la liste déjà chargée reste affichée. */}
          {members.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription className="flex flex-wrap items-center gap-x-2">
                {texts.team.refreshFailed}
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => members.refetch()}
                >
                  {texts.common.retry}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {countActiveAdmins(members.data) < 2 && (
            <Alert role="status">
              <ShieldAlert />
              <AlertDescription>{texts.team.singleAdmin}</AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{texts.team.columns.member}</TableHead>
                <TableHead>{texts.team.columns.role}</TableHead>
                <TableHead>{texts.team.columns.status}</TableHead>
                <TableHead>{texts.team.columns.lastSignIn}</TableHead>
                <TableHead>{texts.team.columns.mfa}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{texts.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data.map((member) => {
                const isMe = member.id === profile?.id
                // Heure de la liste chargée : l'affichage ne dépend pas de l'heure du rendu.
                const expired = isInvitationExpired(
                  member,
                  members.dataUpdatedAt
                )
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {member.full_name ?? (
                          <span className="text-muted-foreground">
                            {texts.team.noName}
                          </span>
                        )}
                        {isMe && (
                          <Badge variant="secondary">{texts.team.you}</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {member.email}
                      </div>
                    </TableCell>
                    <TableCell>{texts.roles[member.role]}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            member.status === "active"
                              ? "secondary"
                              : expired
                                ? "destructive"
                                : "outline"
                          }
                        >
                          {expired
                            ? texts.team.status.expired
                            : texts.team.status[member.status]}
                        </Badge>
                        {/* Lien expiré : on met le renvoi en avant. */}
                        {expired && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                action: "resend",
                                user_id: member.id,
                              })
                            }
                          >
                            {texts.team.actions.resend}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.last_sign_in_at
                        ? formatDateTime(member.last_sign_in_at)
                        : texts.team.never}
                    </TableCell>
                    <TableCell>
                      {member.mfa_enabled
                        ? texts.team.mfaOn
                        : texts.team.mfaOff}
                    </TableCell>
                    <TableCell>
                      {/* Sur son propre compte : aucune action (un autre admin s'en charge). */}
                      {!isMe && (
                        <MemberActions
                          member={member}
                          disabled={action.isPending}
                          onAction={(request) => action.mutate(request)}
                          onConfirm={(kind) =>
                            setConfirmation({ action: kind, member })
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !action.isPending) setConfirmation(null)
        }}
      >
        {confirmation && (
          <ConfirmationContent
            confirmation={confirmation}
            pending={action.isPending}
            onConfirm={() =>
              action.mutate({
                action: confirmation.action,
                user_id: confirmation.member.id,
              })
            }
          />
        )}
      </AlertDialog>
    </>
  )
}

function MemberActions({
  member,
  disabled,
  onAction,
  onConfirm,
}: {
  member: Member
  disabled: boolean
  onAction: (request: MemberRequest) => void
  onConfirm: (action: Confirmation["action"]) => void
}) {
  const nextRole = member.role === "admin" ? "editor" : "admin"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={texts.team.actions.open(displayName(member))}
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {member.status === "invited" && (
          <DropdownMenuItem
            onClick={() => onAction({ action: "resend", user_id: member.id })}
          >
            <Mail />
            {texts.team.actions.resend}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() =>
            onAction({ action: "set_role", user_id: member.id, role: nextRole })
          }
        >
          {nextRole === "admin" ? <ShieldCheck /> : <UserPen />}
          {nextRole === "admin"
            ? texts.team.actions.makeAdmin
            : texts.team.actions.makeEditor}
        </DropdownMenuItem>
        {member.mfa_enabled && (
          <DropdownMenuItem onClick={() => onConfirm("reset_mfa")}>
            <KeyRound />
            {texts.team.actions.resetMfa}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onConfirm("remove")}
        >
          <UserMinus />
          {texts.team.actions.remove}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ConfirmationContent({
  confirmation: { action, member },
  pending,
  onConfirm,
}: {
  confirmation: Confirmation
  pending: boolean
  onConfirm: () => void
}) {
  const copy =
    action === "remove" ? texts.team.confirmRemove : texts.team.confirmResetMfa

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{copy.title}</AlertDialogTitle>
        <AlertDialogDescription>
          {copy.description(displayName(member))}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>
          {texts.common.cancel}
        </AlertDialogCancel>
        <Button variant="destructive" onClick={onConfirm} disabled={pending}>
          {pending && <Spinner />}
          {copy.confirm}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}
