"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AuthButton } from "@/components/auth/AuthButton";
import { primaryAction, secondaryAction } from "@/components/ui/Primitives";
import { useCart } from "@/components/cart/CartProvider";

const links = [
  { label: "Become a contributor", href: "/#contributors" },
  { label: "Enter marketplace", href: "/#marketplace" },
  { label: "Request custom data", href: "/#custom-data" },
  { label: "Gadgets for capture", href: "/gear" },
  { label: "Your orders", href: "/orders" },
];

export function Navbar() {
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<"marketplace" | "data" | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const menuButton = menuButtonRef.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key === "Tab" && drawerRef.current) {
        const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>("a,button")];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#141923]/95 backdrop-blur-lg">
      <nav aria-label="Primary navigation" className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-6 px-5 sm:px-8 lg:px-12 xl:px-16">
        <Link href="/#top" aria-label="DigiRobotics home" className="mr-auto shrink-0">
          <Image src="/digirobotics/brand/digirobotics-logo.png" alt="DigiRobotics" width={210} height={48} className="h-auto w-[168px] lg:w-[190px]" priority />
        </Link>

        <div className="hidden items-center gap-8 xl:flex">
          <Link href="/#contributors" className="shrink-0 whitespace-nowrap py-3 text-[13px] font-medium tracking-normal text-white/80 transition-colors duration-300 ease-out hover:text-[var(--primary)]">Become a contributor</Link>
          <div className="relative">
            <button aria-expanded={menu === "marketplace"} aria-controls="marketplace-menu" onClick={() => setMenu(menu === "marketplace" ? null : "marketplace")} className="flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-medium tracking-normal text-white/80 transition-colors duration-300 ease-out hover:text-[var(--primary)]">Enter marketplace <ChevronDown size={14} aria-hidden="true" /></button>
            {menu === "marketplace" ? <div id="marketplace-menu" className="absolute left-0 top-[calc(100%+14px)] w-[340px] rounded-xl border border-white/10 bg-[#171d29] p-5 shadow-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[.16em] text-[var(--primary)]">Phase 1 preview</p>
              <p className="mt-3 text-base leading-6 text-white/75">Human activity · Software interaction · Sensor capture</p>
              <Link href="/#marketplace" onClick={() => setMenu(null)} className="mt-5 inline-flex min-h-11 items-center text-[13px] font-semibold text-white transition-colors duration-300 ease-out hover:text-[var(--primary)]">Explore the marketplace →</Link>
            </div> : null}
          </div>
          <div className="relative">
            <button aria-expanded={menu === "data"} aria-controls="data-menu" onClick={() => setMenu(menu === "data" ? null : "data")} className="flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-[13px] font-medium tracking-normal text-white/80 transition-colors duration-300 ease-out hover:text-[var(--primary)]">Request custom data <ChevronDown size={14} aria-hidden="true" /></button>
            {menu === "data" ? <div id="data-menu" className="absolute left-0 top-[calc(100%+14px)] w-[320px] rounded-xl border border-white/10 bg-[#171d29] p-5 shadow-2xl">
              {[["Audiovisual Data", "video + audio"], ["Software Interaction Data", "screens + workflows"], ["Hardware and Sensor Data", "devices + signals"]].map(([title, note]) => <Link key={title} href="/#custom-data" onClick={() => setMenu(null)} className="block border-b border-white/[.07] py-3 transition-colors duration-300 ease-out hover:text-[var(--primary)] last:border-0"><span className="block font-heading text-base">{title}</span><span className="font-mono text-[10px] uppercase tracking-[.12em] text-white/45">{note}</span></Link>)}
            </div> : null}
          </div>
          <Link href="/gear" className="shrink-0 whitespace-nowrap py-3 text-[13px] font-medium tracking-normal text-white/80 transition-colors duration-300 ease-out hover:text-[var(--primary)]">Gadgets for capture</Link>
        </div>

        <div className="hidden items-center gap-6 sm:flex">
          <Link href="/checkout" aria-label={`Cart with ${itemCount} items`} className="relative grid size-11 shrink-0 place-items-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]">
            <ShoppingBag size={18} aria-hidden="true" />
            {itemCount > 0 ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[var(--primary)] px-1 font-mono text-[9px] font-bold text-[var(--page-bg)]">{itemCount}</span> : null}
          </Link>
          <AuthButton className={'min-h-11 shrink-0 whitespace-nowrap rounded-full border border-transparent px-3 text-[13px] font-medium tracking-normal text-white/75 ' + secondaryAction + ' hover:text-[var(--primary)]'}>Sign in</AuthButton>
          <AuthButton className={'min-h-11 shrink-0 whitespace-nowrap rounded-full bg-[var(--primary)] px-5 text-[13px] font-semibold tracking-normal text-[var(--page-bg)] ' + primaryAction}>Join now</AuthButton>
        </div>
        <button ref={menuButtonRef} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-nav" onClick={() => setMobileOpen(true)} className="grid size-11 place-items-center rounded-full border border-white/15 xl:hidden"><Menu aria-hidden="true" size={21} /></button>
      </nav>

      {mobileOpen ? <div id="mobile-nav" ref={drawerRef} className="fixed inset-x-0 top-0 z-[60] min-h-dvh bg-[#131822] p-5 xl:hidden">
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <Image src="/digirobotics/brand/digirobotics-logo.png" alt="DigiRobotics" width={180} height={42} className="h-auto w-[168px]" />
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="grid size-11 place-items-center rounded-full border border-white/15"><X aria-hidden="true" size={21} /></button>
        </div>
        <div className="flex flex-col py-7">
          {links.map((link, index) => <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex min-h-16 items-center justify-between border-b border-white/[.08] text-lg font-medium"><span className="font-mono text-[11px] text-[var(--primary)]">0{index + 1}</span>{link.label}</Link>)}
        </div>
        <Link href="/checkout" onClick={() => setMobileOpen(false)} className="mb-3 flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/15 text-sm font-semibold"><ShoppingBag size={17} aria-hidden="true" />Cart · {itemCount}</Link>
        <AuthButton onClick={() => setMobileOpen(false)} className={'min-h-14 w-full rounded-full bg-[var(--primary)] px-6 text-[15px] font-semibold text-[var(--page-bg)] ' + primaryAction}>Join now</AuthButton>
      </div> : null}
    </header>
  );
}
