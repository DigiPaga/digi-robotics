import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearOpsDataCache } from "@/lib/ops/client/use-ops-data";
import { OPS_SECTIONS } from "@/lib/ops/sections";
import { ConsoleShell } from "./ConsoleShell";

const router = { push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() };
let pathname = "/ops";

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
}));

// next/link without an App Router: a plain anchor that reports client-side navigation the way Link does.
vi.mock("next/link", () => ({
  default: ({ href, prefetch, onNavigate, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean; onNavigate?: (event: { preventDefault: () => void }) => void; children: ReactNode }) => (
    <a
      href={href}
      data-prefetch={prefetch ? "true" : undefined}
      {...rest}
      onClick={(event) => {
        event.preventDefault();
        let prevented = false;
        onNavigate?.({ preventDefault: () => { prevented = true; } });
        if (!prevented) router.push(href);
      }}
    >
      {children}
    </a>
  ),
}));

const infra = {
  rpc: [
    { chainId: 421614, name: "Arbitrum Sepolia", ok: true, blockNumber: 314693208 },
    { chainId: 46630, name: "Robinhood Chain Testnet", ok: false, blockNumber: null },
  ],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  pathname = "/ops";
  router.push.mockReset();
  router.refresh.mockReset();
  clearOpsDataCache();
  fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.startsWith("/api/ops/infra") ? infra : {}), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function renderShell() {
  return render(<ConsoleShell email="ottodevs@gmail.com" csrf="csrf-token-1"><p>section body</p></ConsoleShell>);
}

function desktopNav() {
  return screen.getAllByRole("navigation", { name: "Ops sections" })[0];
}

describe("ConsoleShell", () => {
  it("renders one prefetching link per section and the section content", () => {
    renderShell();
    const links = within(desktopNav()).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(OPS_SECTIONS.map((section) => section.href));
    expect(links.map((link) => link.textContent)).toEqual(OPS_SECTIONS.map((section) => `${section.label}g ${section.key}`));
    for (const link of links) expect(link).toHaveAttribute("data-prefetch", "true");
    expect(screen.getByText("section body")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "ops-main");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#ops-main");
  });

  it("marks the current section, including on a nested path", () => {
    pathname = "/ops/payments";
    const { unmount } = renderShell();
    expect(within(desktopNav()).getByRole("link", { current: "page" })).toHaveTextContent("Payments");
    expect(within(desktopNav()).getAllByRole("link", { current: "page" })).toHaveLength(1);
    unmount();
    pathname = "/ops/contracts/anything";
    renderShell();
    expect(within(desktopNav()).getByRole("link", { current: "page" })).toHaveTextContent("Contracts");
  });

  it("shows the signed-in email and a sign-out form that posts the CSRF token", () => {
    const { container } = renderShell();
    expect(screen.getAllByText("ottodevs@gmail.com").length).toBeGreaterThan(0);
    const form = container.querySelector("form[action='/ops/logout']") as HTMLFormElement;
    expect(form.method).toBe("post");
    expect((form.querySelector("input[name='csrf']") as HTMLInputElement).value).toBe("csrf-token-1");
    expect(within(form).getByRole("button", { name: "Sign out" })).toHaveAttribute("type", "submit");
  });

  it("shows the environment and per-chain RPC status in the header", async () => {
    renderShell();
    expect(screen.getByText("Testnet")).toBeInTheDocument();
    const status = screen.getByRole("link", { name: "Chain status, open Infra" });
    expect(await within(status).findByText("RPC reachable")).toBeInTheDocument();
    expect(within(status).getByText("RPC unreachable")).toBeInTheDocument();
    expect(within(status).getByText("314,693,208")).toBeInTheDocument();
  });

  it("navigates client-side when a section link is clicked", async () => {
    renderShell();
    await userEvent.click(within(desktopNav()).getByRole("link", { name: /Wallets/ }));
    expect(router.push).toHaveBeenCalledWith("/ops/wallets");
  });

  it("warms a section's data when its link is hovered or focused", async () => {
    renderShell();
    fireEvent.mouseEnter(within(desktopNav()).getByRole("link", { name: /Contracts/ }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/ops/contracts", expect.anything()));
  });

  it("jumps to a section with g then its key", () => {
    renderShell();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "p" });
    expect(router.push).toHaveBeenCalledWith("/ops/payments");
    fireEvent.keyDown(window, { key: "i" });
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("ignores the chord with a modifier, for an unknown key and while typing in a field", () => {
    renderShell();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "x" });
    fireEvent.keyDown(window, { key: "g", ctrlKey: true });
    fireEvent.keyDown(window, { key: "w" });
    const field = document.createElement("input");
    document.body.appendChild(field);
    fireEvent.keyDown(field, { key: "g" });
    fireEvent.keyDown(field, { key: "w" });
    field.remove();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens the palette with Ctrl+K, filters, and goes to the picked section with Enter", async () => {
    renderShell();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const dialog = screen.getByRole("dialog", { name: "Jump to a section" });
    const input = within(dialog).getByRole("combobox");
    expect(input).toHaveFocus();
    expect(within(dialog).getAllByRole("option")).toHaveLength(OPS_SECTIONS.length);
    await userEvent.type(input, "infr");
    expect(within(dialog).getAllByRole("option").map((option) => option.textContent)).toEqual([expect.stringContaining("Infra")]);
    await userEvent.keyboard("{Enter}");
    expect(router.push).toHaveBeenCalledWith("/ops/infra");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("moves through palette options with the arrow keys and closes on Escape", async () => {
    renderShell();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const options = () => screen.getAllByRole("option");
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(options()[2]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowUp}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("tells the operator when nothing matches in the palette", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: /Jump to/ }));
    await userEvent.type(screen.getByRole("combobox"), "zzz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/No section matches/)).toBeInTheDocument();
  });

  it("opens the navigation drawer on a phone, and closes it on Escape and on navigation", async () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: "Open navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getAllByRole("link")).toHaveLength(OPS_SECTIONS.length + 1);
    expect(within(drawer).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
    await userEvent.click(toggle);
    await userEvent.click(within(screen.getByRole("dialog", { name: "Navigation" })).getByRole("link", { name: /Marketplace/ }));
    expect(router.push).toHaveBeenCalledWith("/ops/marketplace");
    expect(screen.queryByRole("dialog", { name: "Navigation" })).toBeNull();
  });

  it("re-renders the server layout when a data endpoint answers 401", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ message: "Sign in required." }), { status: 401 }));
    renderShell();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("warms every section's data once idle, one endpoint each", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderShell();
    await act(async () => { vi.advanceTimersByTime(2_000); });
    await waitFor(() => {
      for (const section of OPS_SECTIONS) expect(fetchMock).toHaveBeenCalledWith(section.api, expect.anything());
    });
    for (const section of OPS_SECTIONS) expect(fetchMock.mock.calls.filter(([url]) => url === section.api)).toHaveLength(1);
    vi.useRealTimers();
  });
});
