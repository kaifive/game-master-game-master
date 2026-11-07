import { expect, test, type Page } from "@playwright/test";

// One run of each quick game on a phone (S16-AC7). They're alwaysOpen, so no host is needed.
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function joinAndOpen(page: Page, title: string) {
  await page.goto("/holiday-2026?code=WUSH7");
  await page.getByLabel("Your name").fill(unique("Qg"));
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Party" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(title) }).click();
  await page
    .getByRole("dialog", { name: "How to play" })
    .getByRole("button", { name: "Start" })
    .click();
}

const scored = (page: Page) =>
  expect(page.getByRole("region", { name: "Your score" })).toBeVisible();

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "phone", "Phone games; one size is enough");
});

test("S16-AC7: T-Timer", async ({ page }) => {
  await joinAndOpen(page, "T-Timer");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Stop" }).click();
  await scored(page);
  await expect(page.getByRole("region", { name: "Your score" })).toContainText(/s off/);
});

test("S16-AC7: Tap Masher", async ({ page }) => {
  await joinAndOpen(page, "Tap Masher");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const pad = page.getByRole("button", { name: /Tap!/ });
  await expect(pad).toBeEnabled({ timeout: 6000 });
  for (let i = 0; i < 12; i++) await pad.dispatchEvent("pointerdown");
  await scored(page);
  await expect(page.getByRole("region", { name: "Your score" })).toContainText("12 taps");
});

test("S16-AC7: Stack Attack", async ({ page }) => {
  await joinAndOpen(page, "Stack Attack");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const board = page.getByRole("button", { name: "Stop the bar" });
  const score = page.getByRole("region", { name: "Your score" });
  for (let i = 0; i < 40 && !(await score.isVisible()); i++) {
    await board.dispatchEvent("pointerdown");
    await page.waitForTimeout(150 + (i % 5) * 70);
  }
  await expect(score).toContainText(/of 12 rows/);
});

test("S16-AC7: Rapid Recall", async ({ page }) => {
  await joinAndOpen(page, "Rapid Recall");
  for (let round = 1; round <= 3; round++) {
    await expect(page.getByText(`Round ${String(round)} of 3`)).toBeVisible();
    const lit = await page
      .locator("[data-lit]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    expect(lit.length).toBeGreaterThan(0);
    await expect(page.locator("[data-lit]")).toHaveCount(0, { timeout: 3000 });
    for (const name of lit) await page.getByRole("button", { name, exact: true }).click();
  }
  await scored(page);
  await expect(page.getByRole("region", { name: "Your score" })).toContainText("15 of 15 squares");
});

/** A small solver: a path from dot 1 through every square, passing the dots in order. */
function solve(size: number, dots: number[]): number[] {
  const total = size * size;
  const next = (c: number) =>
    [c - size, c + size, c % size > 0 ? c - 1 : -1, c % size < size - 1 ? c + 1 : -1].filter(
      (n) => n >= 0 && n < total,
    );
  const path = [dots[0] as number];
  const used = new Set(path);
  const go = (want: number): boolean => {
    if (path.length === total) return want === dots.length;
    for (const n of next(path[path.length - 1] as number)) {
      if (used.has(n)) continue;
      const di = dots.indexOf(n);
      if (di >= 0 && di !== want) continue;
      if (di === dots.length - 1 && path.length + 1 !== total) continue;
      path.push(n);
      used.add(n);
      if (go(di >= 0 ? want + 1 : want)) return true;
      path.pop();
      used.delete(n);
    }
    return false;
  };
  if (!go(1)) throw new Error("no solution");
  return path;
}

test("S16-AC7: Snow Trail", async ({ page }) => {
  await joinAndOpen(page, "Snow Trail");
  const cells = page.locator("[data-cell]");
  await expect(cells).toHaveCount(36);
  const labels = await cells.evaluateAll((els) =>
    els.map((e) => e.getAttribute("aria-label") ?? ""),
  );
  const dots: number[] = [];
  labels.forEach((l, i) => {
    const m = /Number (\d+)/.exec(l);
    if (m) dots[Number(m[1]) - 1] = i;
  });
  const path = solve(6, dots);
  const centre = async (cell: number) => {
    const box = await cells.nth(cell).boundingBox();
    if (!box) throw new Error("no box");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const first = await centre(path[0] as number);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const cell of path.slice(1)) {
    const p = await centre(cell);
    await page.mouse.move(p.x, p.y, { steps: 2 });
  }
  await page.mouse.up();
  await scored(page);
  await expect(page.getByRole("region", { name: "Your score" })).toContainText(/Solved in/);
});

test("S17-AC6: Guessing Jar is scored from Controls, and the points reach the phone", async ({
  page,
  browser,
}) => {
  await joinAndOpen(page, "Guessing Jar");
  await page.getByLabel("How many candies are in the jar?").fill("300");
  await page.getByRole("button", { name: "Lock in my guess" }).click();
  await page.getByRole("button", { name: "Yes, lock it in" }).click();
  await expect(page.getByRole("region", { name: "Your score" })).toContainText(
    "Points come when the host reveals the jar",
  );

  const admin = await (
    await browser.newContext({ viewport: { width: 1024, height: 900 } })
  ).newPage();
  await admin.goto("/admin");
  await admin.getByLabel("Passphrase").fill("e2e-host-pass");
  await admin.getByRole("button", { name: "Sign in" }).click();
  await admin.getByRole("link", { name: /Nova Wushu Holiday Party/ }).click();
  await admin.getByRole("button", { name: "Show guesses" }).click();
  await admin.getByLabel("Real count").fill("300");
  await admin.getByRole("button", { name: /Score (the jar|it again)/ }).click();
  await admin.getByRole("button", { name: "Yes, the jar has 300" }).click();
  await expect(admin.getByRole("list", { name: "Closest guesses for Guessing Jar" })).toBeVisible();

  await page.goto("/holiday-2026/play/guessing-jar");
  await expect(page.getByRole("region", { name: "Your score" })).toContainText(
    "the jar had 300 · 0% off",
  );
});

test("S17-AC6: Geocache scores a hidden code once", async ({ page }) => {
  await joinAndOpen(page, "Geocache");
  const box = page.getByLabel("Found a code? Type it here");
  await box.fill("snow1");
  await page.getByRole("button", { name: "Check code" }).click();
  await expect(page.getByText("Found one! The points are yours.")).toBeVisible();
  await expect(page.getByText("1 of 3 found")).toBeVisible();
  await box.fill("SNOW1");
  await page.getByRole("button", { name: "Check code" }).click();
  await expect(page.getByText("You've already found that one.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Party" })
    .getByRole("link", { name: /Games/ })
    .click();
  await expect(
    page.getByRole("link", { name: /Geocache/ }).getByRole("img", { name: /Geocache: 33 points/ }),
  ).toBeVisible();
});
