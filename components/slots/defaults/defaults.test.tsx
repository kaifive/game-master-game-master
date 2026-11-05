import { describe } from "vitest";
import { SLOT_NAMES } from "@/lib/themes";
import { runSlotContract } from "../contracts";
import { DEFAULT_SLOTS } from ".";

describe("S09-AC3: the default slots pass their contract suites", () => {
  for (const name of SLOT_NAMES) {
    describe(name, () => {
      runSlotContract(name, DEFAULT_SLOTS[name]);
    });
  }
});
