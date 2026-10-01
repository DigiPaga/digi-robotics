import { KeyRound } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./console/ConsoleShell";
import { labelClass, Notice, primaryButtonClass } from "./console/primitives";

/**
 * The console frame without a session: same rail, header and type as the
 * signed-in shell, with no navigation and no data. Public, so it says nothing
 * about what is behind it beyond the product name.
 */
export function OpsGateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="ops-root flex min-h-dvh" data-ops-shell="gate">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-ops-line bg-ops-rail lg:flex">
        <div className="flex h-12 shrink-0 items-center border-b border-ops-line px-4"><Brand /></div>
        <p className="p-4 text-[13px] text-ops-fg-3">Operator console for the DigiRobotics testnet deployment.</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-ops-line bg-ops-canvas px-4 lg:px-8">
          <div className="lg:hidden"><Brand /></div>
          <p className="hidden text-[13px] text-ops-fg-3 lg:block">Ops</p>
          <span className={`${labelClass} ml-auto rounded border border-ops-line-2 px-1.5 py-0.5`}>Testnet</span>
        </header>
        <main id="ops-main" className="flex-1 px-4 pb-20 pt-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-[1120px]">
            <div className="max-w-md">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

const titleClass = "text-[20px] font-semibold leading-7 tracking-[-.01em] text-ops-fg";
const bodyClass = "mt-2 text-[14px] leading-[22px] text-ops-fg-2";

/** Deliberately generic: this page is public, so it never says what is missing. */
export function OpsNotConfigured() {
  return (
    <OpsGateFrame>
      <h1 className={titleClass}>Ops is not configured.</h1>
      <p className={bodyClass}>
        Sign-in is disabled and nobody can get in while this page shows. If you operate this deployment, the server log says what to fix.
      </p>
    </OpsGateFrame>
  );
}

/** A Map, not an object: `?error=constructor` must not resolve to an inherited property. */
const ERROR_COPY: ReadonlyMap<string, string> = new Map([
  ["denied", "That Google account is not on the ops allowlist."],
  ["failed", "Sign-in did not complete. Try again."],
]);

export function OpsSignIn({ error }: { error?: string }) {
  const message = error ? ERROR_COPY.get(error) : undefined;
  return (
    <OpsGateFrame>
      <h1 className={titleClass}>Sign in to ops</h1>
      <p className={bodyClass}>
        Wallets, payments, contracts and infrastructure for the DigiRobotics operators. Access is limited to allowlisted Google accounts.
      </p>
      {message ? <div className="mt-5"><Notice tone="bad" role="alert">{message}</Notice></div> : null}
      {/* /ops/login is a route handler that redirects to Google: it needs a full navigation, not a client-side one. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/ops/login" className={`mt-6 !h-9 ${primaryButtonClass}`}>
        <KeyRound size={14} aria-hidden="true" /> Continue with Google
      </a>
    </OpsGateFrame>
  );
}

/** Generic failure page in the console frame. Never shows the error. */
export function OpsProblem({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="max-w-md">
      <h1 className={titleClass}>{title}</h1>
      <p className={bodyClass}>{children}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
