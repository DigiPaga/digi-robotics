import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OpsSignIn } from "./OpsPanels";

describe("OpsSignIn", () => {
  it("shows the copy for a known error code", () => {
    render(<OpsSignIn error="denied" />);
    expect(screen.getByRole("alert")).toHaveTextContent("not on the ops allowlist");
  });

  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "unknown", ""])(
    "renders the sign-in card with no alert for ?error=%s",
    (error) => {
      render(<OpsSignIn error={error} />);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute("href", "/ops/login");
    },
  );
});
