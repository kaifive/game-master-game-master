import { describe, expect, it } from "vitest";
import { animateSpy } from "@/tests/motion";
import { flyPoints } from "./fly";

describe("flyPoints", () => {
  it("S08-AC15: animates a chip to the header total, then removes it", async () => {
    document.body.innerHTML = '<p id="from">80</p><span data-total-score>100</span>';
    await flyPoints(document.getElementById("from") as Element, "+80", false);
    expect(animateSpy).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toContain("+80");
  });

  it("does nothing under reduced motion or without a total to fly to", async () => {
    document.body.innerHTML = '<p id="from">80</p>';
    await flyPoints(document.getElementById("from") as Element, "+80", false);
    document.body.innerHTML = '<p id="from">80</p><span data-total-score>100</span>';
    await flyPoints(document.getElementById("from") as Element, "+80", true);
    expect(animateSpy).not.toHaveBeenCalled();
  });
});
