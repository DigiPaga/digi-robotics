"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

const ThirdwebAuthPanel = dynamic(() => import("./ThirdwebAuthPanel").then((module) => module.ThirdwebAuthPanel), { ssr: false });
const AuthContext = createContext<(() => void) | null>(null);

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID?.trim());

  const show = useCallback(() => {
    triggerRef.current = document.activeElement as HTMLElement;
    setOpen(true);
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setOpen(false);
    router.push("/getting-started");
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <AuthContext.Provider value={show}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0c0f15]/85 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" tabIndex={-1} className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#171d2a] p-7 shadow-2xl sm:p-9">
            <button onClick={() => setOpen(false)} aria-label="Close sign-in dialog" className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-white/10 text-white transition hover:border-[var(--primary)] hover:text-[var(--primary)]"><X aria-hidden="true" size={20} /></button>
            <p className="font-mono text-[12px] uppercase tracking-[.18em] text-[var(--primary)]">Contributor access</p>
            <h2 id="auth-title" className="mt-4 pr-10 font-heading text-3xl leading-tight">Join the first capture campaigns.</h2>
            <p className="mt-4 max-w-md text-lg leading-7 text-[var(--muted-foreground)]">Use Google or email OTP when configured. A smart account is never deployed without a real, user-authorized action.</p>
            <div className="mt-7">
              {isConfigured ? <ThirdwebAuthPanel onLoginSuccess={handleLoginSuccess} /> : (
                <div className="rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/[.05] p-5" role="status">
                  <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[.12em] text-[var(--primary)]"><AlertTriangle size={17} aria-hidden="true" />Registration setup in progress</div>
                  <p className="mt-3 text-base leading-6 text-white/75">Contributor sign-in will open when the public Thirdweb client ID is configured. No registration has been recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuthFlow() {
  const open = useContext(AuthContext);
  if (!open) throw new Error("useAuthFlow must be used inside AuthFlowProvider");
  return open;
}
