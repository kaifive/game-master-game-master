import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import HomePage from "./page";

test("the home page names the app", () => {
  render(<HomePage />);
  expect(screen.getByRole("heading", { level: 1, name: "Game Master" })).toBeInTheDocument();
});
