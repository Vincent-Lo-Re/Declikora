import { Outlet } from "react-router"

import { BrandLogo } from "@/components/brand-logo"

/** Pages de connexion : sans menu, centrées. */
export function AuthLayout() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-8">
      <p className="flex min-h-7 items-center text-lg font-medium">
        <BrandLogo kind="logotype" surface="theme" className="h-8" />
      </p>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </main>
  )
}
