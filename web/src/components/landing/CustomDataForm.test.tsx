import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomDataForm } from "./CustomDataForm";

describe("CustomDataForm", () => {
  it("renders every field full-width inside its grid cell", () => {
    render(<CustomDataForm />);
    const fields = [
      screen.getByLabelText("Work email"),
      screen.getByLabelText("Company or project"),
      screen.getByLabelText("Data type"),
      screen.getByLabelText("Estimated number of captures"),
      screen.getByLabelText("Task or scenario"),
    ];
    for (const field of fields) {
      expect(field.className).toMatch(/\bw-full\b/);
      expect(field.className).not.toMatch(/max-w-4xl|mx-auto/);
    }
  });

  it("renders labels as block elements so they don't center inline with the field", () => {
    render(<CustomDataForm />);
    expect(screen.getByText("Work email").className).toMatch(/\bblock\b/);
  });
});
