import { expect, test, type Page } from "@playwright/test";

// The party's trivia is alwaysOpen, so it plays before the host starts the party (S08-AC13).
const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function joinParty(page: Page) {
  await page.goto("/holiday-2026?code=WUSH7");
  await page.getByLabel("Your name").fill(unique("Quiz"));
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("Playing as")).toBeVisible();
}

async function playToEnd(page: Page) {
  for (let n = 1; n <= 5; n++) {
    await expect(page.getByText(`Question ${String(n)} of 5`)).toBeVisible();
    await page.getByRole("list", { name: "Answers" }).getByRole("button").first().click();
    await expect(page.getByRole("status")).toHaveText(/Right!|Not quite\./);
    await page.getByRole("button", { name: n === 5 ? "See score" : "Next", exact: true }).click();
  }
}

test("S08-AC9 S08-AC11 S08-AC13 S08-AC15 S10-AC6: play before the start, see the score and the header total", async ({
  page,
}) => {
  await joinParty(page);
  const total = page.locator("[data-total-score]");
  await expect(total).toHaveAttribute("aria-label", /: 0 points$/);
  const trivia = page.getByRole("link", { name: /Holiday Trivia/ });
  await expect(trivia).toContainText("Play →");
  await trivia.click();

  const rules = page.getByRole("dialog", { name: "How to play" });
  await expect(rules).toContainText("5 quick questions. You have 15 seconds for each.");
  await rules.getByRole("button", { name: "Start" }).click();
  await playToEnd(page);

  const score = page.getByRole("region", { name: "Your score" });
  await expect(score).toContainText(/[0-5] of 5 right/);
  const points =
    (await score.getByLabel(/points$/).getAttribute("aria-label"))?.replace(" points", "") ?? "";
  await expect(total).toHaveAttribute("aria-label", new RegExp(`: ${points} points$`));

  await page
    .getByRole("navigation", { name: "Party" })
    .getByRole("link", { name: /Games/ })
    .click();
  await expect(page.getByRole("link", { name: /Holiday Trivia/ })).toContainText(
    `Best ${points} · Again →`,
  );
});

test("S08-AC12 S08-AC3: a finished replayable game shows its result and plays again", async ({
  page,
}) => {
  await joinParty(page);
  await page.getByRole("link", { name: /Holiday Trivia/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await playToEnd(page);
  await page.reload();
  await expect(page.getByRole("region", { name: "Your score" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Play again" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
});

test("S08-AC3 S08-AC14: leaving mid-game asks first, then resumes the same question", async ({
  page,
}) => {
  await joinParty(page);
  await page.getByRole("link", { name: /Holiday Trivia/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  const prompt = await page.getByRole("heading", { level: 2 }).last().textContent();

  const games = page
    .getByRole("navigation", { name: "Party" })
    .getByRole("link", { name: /Games/ });
  await games.click();
  await page.getByRole("button", { name: "Keep playing" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  await games.click();
  await page.getByRole("button", { name: "Leave" }).click();

  await expect(page.getByRole("link", { name: /Holiday Trivia/ })).toContainText("Continue →");
  await page.getByRole("link", { name: /Holiday Trivia/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2 }).last()).toHaveText(prompt ?? "");
});
