"use client";

import { ArrowLeftRight, CornerDownLeft, FileCode2, Gauge, LogOut, Menu, Search, Server, Store, Wallet, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from "react";
import { prefetchOpsData, setOpsUnauthorizedHandler, useOpsData } from "@/lib/ops/client/use-ops-data";
import type { InfraSnapshot } from "@/lib/ops/infra";
import { OPS_SECTIONS, sectionForKey, sectionForPath, type OpsSection, type OpsSectionId } from "@/lib/ops/sections";
import { formatInteger } from "./format";
import { Dot, labelClass } from "./primitives";

const ICONS: Record<OpsSectionId, LucideIcon> = {
  overview: Gauge,
  wallets: Wallet,
  payments: ArrowLeftRight,
  contracts: FileCode2,
  marketplace: Store,
  infra: Server,
};

interface ViewTransitionLike {
  ready: Promise<unknown>;
  finished: Promise<unknown>;
}

/**
 * Section changes go through the View Transitions API where the browser has
 * it: a short crossfade of the content region only (see ops.css). The rail and
 * the header are not part of the transition and stay interactive. Without the
 * API, or with reduced motion, this is a plain router.push.
 */
function useSectionNavigate(): (href: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const settle = useRef<(() => void) | null>(null);

  // The new section is in the DOM: let the pending transition take its snapshot.
  useLayoutEffect(() => {
    settle.current?.();
    settle.current = null;
  }, [pathname]);

  return useCallback((href: string) => {
    const start = (document as Document & { startViewTransition?: (update: () => Promise<void>) => ViewTransitionLike }).startViewTransition;
    const reduced = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!start || reduced || href === window.location.pathname) {
      router.push(href);
      return;
    }
    const transition = start.call(document, () => new Promise<void>((resolve) => {
      // Never hold the old frame for long: a section that is not prefetched yet shows its skeleton.
      const timer = window.setTimeout(resolve, 250);
      settle.current = () => {
        window.clearTimeout(timer);
        resolve();
      };
      router.push(href);
    }));
    // A skipped transition (hidden tab, resized viewport) still navigates; only the animation is dropped.
    transition.ready.catch(() => undefined);
    transition.finished.catch(() => undefined);
  }, [router]);
}

export function Brand({ href = "/ops" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-baseline gap-2 rounded-sm">
      <span className="font-ops-brand text-[15px] font-bold tracking-[-.01em] text-ops-fg">DigiRobotics</span>
      <span className={`${labelClass} !text-ops-accent`}>ops</span>
    </Link>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Escape closes, Tab stays inside, focus returns to the opener. For the drawer and the palette. */
function useOverlay(open: boolean, panel: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])") ?? []);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, panel, onClose]);
}

function NavList({ current, navigate, onNavigate, compact = false }: { current: OpsSection | null; navigate: (href: string) => void; onNavigate?: () => void; compact?: boolean }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {OPS_SECTIONS.map((section) => {
        const Icon = ICONS[section.id];
        const active = current?.id === section.id;
        return (
          <li key={section.id}>
            <Link
              href={section.href}
              prefetch
              onNavigate={(event) => {
                event.preventDefault();
                onNavigate?.();
                navigate(section.href);
              }}
              onMouseEnter={() => void prefetchOpsData(section.api)}
              onFocus={() => void prefetchOpsData(section.api)}
              aria-current={active ? "page" : undefined}
              aria-keyshortcuts={`g ${section.key}`}
              className={`group flex items-center gap-2.5 rounded-md px-2.5 text-[13.5px] transition-colors duration-150 ${compact ? "h-10" : "h-8"} ${active ? "bg-ops-fg/[.07] font-medium text-ops-fg" : "text-ops-fg-2 hover:bg-ops-fg/[.04] hover:text-ops-fg"}`}
            >
              <Icon size={15} aria-hidden="true" className={active ? "text-ops-accent" : "text-ops-fg-3 group-hover:text-ops-fg-2"} />
              <span className="flex-1">{section.label}</span>
              <kbd aria-hidden="true" className="hidden font-ops-mono text-[10.5px] uppercase tracking-[.06em] text-ops-fg-3 lg:inline">g {section.key}</kbd>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Shown until the first infra snapshot arrives, so the header does not change width. */
const PENDING_CHAINS: { chainId: number; name: string; ok: boolean | null; blockNumber: number | null }[] = [
  { chainId: 421614, name: "Arbitrum Sepolia", ok: null, blockNumber: null },
  { chainId: 46630, name: "Robinhood Chain Testnet", ok: null, blockNumber: null },
];

function ChainStatus() {
  const { data } = useOpsData<InfraSnapshot>("/api/ops/infra", { refreshInterval: 30_000 });
  return (
    <Link href="/ops/infra" prefetch aria-label="Chain status, open Infra" className="hidden items-center gap-4 rounded-sm text-[12.5px] text-ops-fg-2 transition-colors duration-150 hover:text-ops-fg md:flex">
      {(data?.rpc ?? PENDING_CHAINS).map((chain) => (
        <span key={chain.chainId} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Dot tone={chain.ok === null ? "unknown" : chain.ok ? "ok" : "bad"} />
          <span>{chain.name.replace(" Chain Testnet", "")}</span>
          <span className="sr-only">{chain.ok === null ? "status loading" : chain.ok ? "RPC reachable" : "RPC unreachable"}</span>
          <span className="hidden min-w-[5.5rem] font-ops-mono text-[11.5px] text-ops-fg-3 xl:inline">{chain.blockNumber === null ? "" : formatInteger(chain.blockNumber)}</span>
        </span>
      ))}
    </Link>
  );
}

function SignOut({ csrf, className = "" }: { csrf: string; className?: string }) {
  return (
    <form method="post" action="/ops/logout" className={className}>
      <input type="hidden" name="csrf" value={csrf} />
      <button type="submit" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] text-ops-fg-2 transition-colors duration-150 hover:bg-ops-raised hover:text-ops-fg">
        <LogOut size={14} aria-hidden="true" />
        Sign out
      </button>
    </form>
  );
}

function Palette({ onClose, onGo }: { onClose: () => void; onGo: (section: OpsSection) => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listId = useId();
  useOverlay(true, panel, onClose);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? OPS_SECTIONS.filter((section) => `${section.label} ${section.summary}`.toLowerCase().includes(needle)) : [...OPS_SECTIONS];
  }, [query]);
  const active = Math.min(index, Math.max(matches.length - 1, 0));

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndex((active + 1) % Math.max(matches.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndex((active - 1 + matches.length) % Math.max(matches.length, 1));
    } else if (event.key === "Enter" && matches[active]) {
      event.preventDefault();
      onGo(matches[active]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-[14vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Jump to a section" className="w-full max-w-md overflow-hidden rounded-lg border border-ops-line-2 bg-ops-rail shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]">
        <div className="flex items-center gap-2.5 border-b border-ops-line px-3.5">
          <Search size={15} aria-hidden="true" className="shrink-0 text-ops-fg-3" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={matches[active] ? `${listId}-${matches[active].id}` : undefined}
            aria-label="Jump to a section"
            placeholder="Jump to a section"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            className="h-11 w-full bg-transparent text-[14px] text-ops-fg placeholder:text-ops-fg-3 focus-visible:!outline-none"
          />
          <kbd className="font-ops-mono text-[10.5px] uppercase text-ops-fg-3">esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Sections" className="max-h-[50vh] overflow-y-auto p-1.5">
          {matches.length === 0 ? <li className="px-2.5 py-3 text-[13px] text-ops-fg-3">No section matches. Try &quot;wallets&quot; or &quot;infra&quot;.</li> : null}
          {matches.map((section, position) => {
            const Icon = ICONS[section.id];
            const selected = position === active;
            return (
              <li
                key={section.id}
                id={`${listId}-${section.id}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setIndex(position)}
                onClick={() => onGo(section)}
                className={`flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-[13.5px] ${selected ? "bg-ops-fg/[.08] text-ops-fg" : "text-ops-fg-2"}`}
              >
                <Icon size={15} aria-hidden="true" className={selected ? "text-ops-accent" : "text-ops-fg-3"} />
                <span className="font-medium">{section.label}</span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ops-fg-3">{section.summary}</span>
                {selected ? <CornerDownLeft size={13} aria-hidden="true" className="text-ops-fg-3" /> : <kbd aria-hidden="true" className="font-ops-mono text-[10.5px] uppercase text-ops-fg-3">g {section.key}</kbd>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export interface ConsoleShellProps {
  email: string;
  csrf: string;
  children: ReactNode;
}

/**
 * The persistent frame of the ops console. It mounts once and stays mounted
 * while sections change under it, so navigation never repaints the rail or the
 * header. It also owns the keyboard shortcuts and warms the data cache.
 */
export function ConsoleShell({ email, csrf, children }: ConsoleShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useSectionNavigate();
  const current = sectionForPath(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  useOverlay(drawerOpen, drawer, closeDrawer);
  useEffect(() => {
    if (drawerOpen) drawer.current?.focus();
  }, [drawerOpen]);

  // A 401 from any data endpoint re-renders the server layout, which shows sign-in.
  useEffect(() => {
    setOpsUnauthorizedHandler(() => router.refresh());
    return () => setOpsUnauthorizedHandler(null);
  }, [router]);

  // Warm every section's data once the shell is idle, one request at a time,
  // so the first visit to each section paints from cache as well.
  useEffect(() => {
    let cancelled = false;
    const warm = async () => {
      for (const section of OPS_SECTIONS) {
        if (cancelled) return;
        await prefetchOpsData(section.api);
      }
    };
    const idle = (window as unknown as { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
    const handle = idle ? idle(() => void warm(), { timeout: 1_500 }) : window.setTimeout(() => void warm(), 400);
    return () => {
      cancelled = true;
      if (idle) (window as unknown as { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  const go = useCallback((section: OpsSection) => {
    setPaletteOpen(false);
    setDrawerOpen(false);
    void prefetchOpsData(section.api);
    navigate(section.href);
  }, [navigate]);

  // Cmd/Ctrl+K opens the palette. "g" then a letter jumps to a section.
  useEffect(() => {
    let armedUntil = 0;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === "g" || event.key === "G") {
        armedUntil = Date.now() + 1_200;
        return;
      }
      if (Date.now() < armedUntil) {
        armedUntil = 0;
        const section = sectionForKey(event.key);
        if (section) {
          event.preventDefault();
          go(section);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="ops-root flex min-h-dvh" data-ops-shell="console">
      <a href="#ops-main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ops-accent focus:px-3 focus:py-1.5 focus:text-[13px] focus:font-semibold focus:text-ops-ink">
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-ops-line bg-ops-rail lg:flex">
        <div className="flex h-12 shrink-0 items-center border-b border-ops-line px-4"><Brand /></div>
        <nav aria-label="Ops sections" className="flex-1 overflow-y-auto p-2">
          <NavList current={current} navigate={navigate} />
        </nav>
        <div className="border-t border-ops-line p-2">
          <button type="button" onClick={() => setPaletteOpen(true)} aria-keyshortcuts="Control+K Meta+K" className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-ops-fg-2 transition-colors duration-150 hover:bg-ops-fg/[.04] hover:text-ops-fg">
            <Search size={14} aria-hidden="true" className="text-ops-fg-3" />
            <span className="flex-1 text-left">Jump to</span>
            <kbd aria-hidden="true" className="font-ops-mono text-[10.5px] uppercase tracking-[.06em] text-ops-fg-3">ctrl k</kbd>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-ops-line bg-ops-canvas px-4 lg:px-8">
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen} aria-controls="ops-drawer" className="-ml-2 inline-flex size-9 items-center justify-center rounded-md text-ops-fg-2 hover:bg-ops-raised hover:text-ops-fg lg:hidden">
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="lg:hidden"><Brand /></div>
          <p className="hidden min-w-0 truncate text-[13px] text-ops-fg-3 lg:block">
            Ops <span aria-hidden="true" className="px-1 text-ops-line-2">/</span> <span className="text-ops-fg">{current?.label ?? "Not found"}</span>
          </p>
          <div className="ml-auto flex items-center gap-4">
            <span className={`${labelClass} hidden rounded border border-ops-line-2 px-1.5 py-0.5 sm:inline`}>Testnet</span>
            <ChainStatus />
            <span className="hidden max-w-[16rem] truncate border-l border-ops-line pl-4 font-ops-mono text-[12px] text-ops-fg-2 sm:inline" title={email}>{email}</span>
            <SignOut csrf={csrf} className="hidden sm:block" />
          </div>
        </header>

        <main id="ops-main" tabIndex={-1} className="flex-1 px-4 pb-20 pt-6 outline-none lg:px-8 lg:pt-8">
          <div className="ops-content mx-auto w-full max-w-[1120px]">{children}</div>
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/55 lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
          <div ref={drawer} id="ops-drawer" role="dialog" aria-modal="true" aria-label="Navigation" tabIndex={-1} className="flex h-full outline-none focus-visible:!outline-none w-[min(18rem,86vw)] flex-col border-r border-ops-line-2 bg-ops-rail">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-ops-line pl-4 pr-2">
              <Brand />
              <button type="button" onClick={closeDrawer} aria-label="Close navigation" className="inline-flex size-9 items-center justify-center rounded-md text-ops-fg-2 hover:bg-ops-raised hover:text-ops-fg">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Ops sections" className="flex-1 overflow-y-auto p-2">
              <NavList current={current} navigate={navigate} onNavigate={closeDrawer} compact />
            </nav>
            <div className="border-t border-ops-line p-3">
              <p className="truncate px-1 pb-2 font-ops-mono text-[12px] text-ops-fg-2" title={email}>{email}</p>
              <SignOut csrf={csrf} />
            </div>
          </div>
        </div>
      ) : null}

      {paletteOpen ? <Palette onClose={closePalette} onGo={go} /> : null}
    </div>
  );
}
