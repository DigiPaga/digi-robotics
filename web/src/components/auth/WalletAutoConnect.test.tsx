import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const autoConnect = vi.fn<(props: unknown) => null>(() => null);
vi.mock("thirdweb/react", () => ({ AutoConnect: (props: unknown) => autoConnect(props) }));

afterEach(() => { vi.resetModules(); autoConnect.mockClear(); });

describe("WalletAutoConnect", () => {
  it("attempts an auto-connect with the embedded wallets when thirdweb is configured", async () => {
    vi.doMock("@/lib/thirdweb", () => ({ isThirdwebConfigured: true, thirdwebClient: { clientId: "test" }, embeddedWallets: ["in-app"] }));
    const { WalletAutoConnect } = await import("./WalletAutoConnect");
    render(<WalletAutoConnect />);
    expect(autoConnect).toHaveBeenCalledWith(expect.objectContaining({ client: { clientId: "test" }, wallets: ["in-app"] }));
  });

  it("renders nothing when thirdweb is not configured", async () => {
    vi.doMock("@/lib/thirdweb", () => ({ isThirdwebConfigured: false, thirdwebClient: {}, embeddedWallets: [] }));
    const { WalletAutoConnect } = await import("./WalletAutoConnect");
    render(<WalletAutoConnect />);
    expect(autoConnect).not.toHaveBeenCalled();
  });
});
