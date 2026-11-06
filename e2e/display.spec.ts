import { expect, test } from "@playwright/test";

const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

test("S05-AC3: the display shows how to join and fits a TV with no scrolling", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "tv", "The display is for the TV");
  await page.goto("/holiday-2026/display");
  const join = page.getByRole("region", { name: "Join the party" });
  await expect(join.getByRole("img", { name: /QR code for/ })).toBeVisible();
  await expect(join).toContainText("WUSH7");
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });
});

test("S05-AC2 S05-AC4: a player's points show on their phone and on the display", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "tv", "One run is enough: it uses a phone and the TV");
  const name = unique("Tv");
  const phone = await (
    await browser.newContext({ viewport: { width: 412, height: 915 } })
  ).newPage();
  await phone.goto("/holiday-2026?code=WUSH7");
  await phone.getByLabel("Your name").fill(name);
  await phone.getByRole("button", { name: "Join", exact: true }).click();
  await phone.getByRole("link", { name: /Holiday Trivia/ }).click();
  await phone.getByRole("button", { name: "Start" }).click();
  for (let n = 1; n <= 5; n++) {
    await expect(phone.getByText(`Question ${String(n)} of 5`)).toBeVisible();
    await phone.getByRole("list", { name: "Answers" }).getByRole("button").first().click();
    await expect(phone.getByRole("status")).toBeVisible();
  }
  const score = phone.getByRole("region", { name: "Your score" });
  const label =
    (await score.getByRole("img", { name: /points$/ }).getAttribute("aria-label")) ?? "";
  const points = Number(/(\d+) points$/.exec(label)?.[1] ?? 0);
  test.skip(points === 0, "No right answers this time, so there's nothing on the board");

  const tv = await (
    await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  ).newPage();
  await tv.goto("/holiday-2026/display");
  await expect(tv.getByRole("list", { name: "Leaderboard" })).toContainText(name);

  await phone.goto("/holiday-2026");
  await expect(phone.getByRole("list", { name: "Leaderboard" })).toContainText(name);
});
