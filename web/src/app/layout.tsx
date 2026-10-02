import "@fontsource/inter-tight/400.css";
import "@fontsource/inter-tight/500.css";
import "@fontsource/inter-tight/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/syne/700.css";
import "@fontsource/ubuntu/500.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthFlowProvider } from "@/components/auth/AuthFlowProvider";
import { ThirdwebSessionProvider } from "@/components/auth/ThirdwebSessionProvider";
import { CartProvider } from "@/components/cart/CartProvider";
import { AppToaster } from "@/components/providers/AppToaster";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://digirobotics.xyz"),
  title: "DigiRobotics — Egocentric Data for Robotics",
  description:
    "Capture real-world skills from your point of view. Build the training data robotics teams need.",
  openGraph: {
    title: "DigiRobotics — Egocentric Data for Robotics",
    description:
      "First-person human activity, structured for perception, planning, and embodied AI.",
    url: "https://digirobotics.xyz",
    siteName: "DigiRobotics.xyz",
    images: [{
      url: "/digirobotics/hero/pov-thermostat.webp",
      width: 1586,
      height: 992,
      alt: "First-person capture of a person installing a control panel",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigiRobotics — Egocentric Data for Robotics",
    description: "Real-world skills, captured through human eyes.",
    images: ["/digirobotics/hero/pov-thermostat.webp"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DigiRobotics",
  url: "https://digirobotics.xyz",
  logo: "https://digirobotics.xyz/digirobotics/brand/digirobotics-logo.png",
  description: "Egocentric data for robotics training, captured through human eyes.",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DigiRobotics.xyz",
  url: "https://digirobotics.xyz",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/*
          Keyboard/screen-reader users otherwise land on the sticky Navbar on every page with
          no way to jump past it. Targets the #main-content wrapper below.
        */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--primary)] focus:px-5 focus:py-3 focus:text-[15px] focus:font-semibold focus:text-[var(--page-bg)]">
          Skip to content
        </a>
        {/*
          Reveal (components/ui/Reveal.tsx) hides its content behind an inline opacity:0 style
          until framer-motion's client-side animation runs. Without JavaScript that animation
          never fires, so this noscript-only rule (inert while scripting is enabled, and
          `!important` beats the inline style once it is not) keeps every `.reveal` section
          visible for no-JS visitors.
        */}
        <noscript>
          <style>{".reveal { opacity: 1 !important; transform: none !important; }"}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([organizationJsonLd, websiteJsonLd]).replace(/</g, "\\u003c") }}
        />
        {/*
          Thirdweb used to mount only inside the sign-in modal. Closing that modal
          destroyed its React context before the embedded wallet could restore its
          durable browser session. Keeping one provider at the app root lets
          Thirdweb reconnect its persisted in-app wallet across routes and refreshes.
          This flow does not issue an app JWT or auth cookie, so cookie domain,
          SameSite, Secure, and maxAge settings do not apply here.
        */}
        <ThirdwebSessionProvider>
          <CartProvider>
            <AuthFlowProvider>
              {/*
                A plain wrapper, not another <main>: every route already renders its own <main>,
                and this only needs to be a stable skip-link target that does not depend on each
                page/batch agreeing on an id.
              */}
              <div id="main-content">{children}</div>
            </AuthFlowProvider>
          </CartProvider>
        </ThirdwebSessionProvider>
        <AppToaster />
      </body>
    </html>
  );
}
