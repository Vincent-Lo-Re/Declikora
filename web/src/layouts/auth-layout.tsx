import { Outlet } from "react-router"

import { texts } from "@/texts"

/** Pages de connexion : sans menu, centrées. */
export function AuthLayout() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-8">
      <p className="text-lg font-semibold">{texts.app.name}</p>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  )
}
