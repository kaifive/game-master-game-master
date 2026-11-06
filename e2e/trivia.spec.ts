import { expect, test, type Page } from "@playwright/test";

// Without Firebase, this cookie sets the party's status (spec 08). It makes the party live.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "gm-dev-status", value: "live", url: baseURL ?? "http://localhost:3100" },
  ]);
});

const unique = (base: string) => `${base}${String(Math.floor(Math.random() * 1e6))}`;

async function joinParty(page: Page) {
  await page.goto("/holiday-2026?code=WUSH7");
  await page.getByLabel("Your name").fill(unique("Quiz"));
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("Playing as")).toBeVisible();
}

test("S08-AC9 S08-AC3 S08-AC11 S10-AC6: instructions, five questions, a score, then Done on the hub", async ({
  page,
}) => {
  await joinParty(page);
  const trivia = page.getByRole("link", { name: /Holiday Trivia/ });
  await expect(trivia).toContainText("Play →");
  await trivia.click();

  const rules = page.getByRole("dialog", { name: "How to play" });
  await expect(rules).toContainText("5 quick questions. You have 15 seconds for each.");
  await rules.getByRole("button", { name: "Start" }).click();

  for (let n = 1; n <= 5; n++) {
    await expect(page.getByText(`Question ${String(n)} of 5`)).toBeVisible();
    await page.getByRole("list", { name: "Answers" }).getByRole("button").first().click();
    await expect(page.getByRole("status")).toHaveText(/Right!|Not quite\./);
    await page.getByRole("button", { name: n === 5 ? "See score" : "Next" }).click();
  }

  const score = page.getByRole("region", { name: "Your score" });
  await expect(score).toContainText(/[0-5] of 5 right/);
  const points = await score.getByLabel(/points$/).getAttribute("aria-label");

  // Reopening shows the result, not a new game.
  await page.reload();
  await expect(page.getByRole("region", { name: "Your score" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("link", { name: "Back to all games" }).click();
  await expect(page.getByRole("link", { name: /Holiday Trivia/ })).toContainText(
    `Done · +${points?.replace(" points", "") ?? ""}`,
  );
});

test("S08-AC3: leaving mid-game resumes the same question with no instructions", async ({
  page,
}) => {
  await joinParty(page);
  await page.getByRole("link", { name: /Holiday Trivia/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Question 1 of 5")).toBeVisible();
  const prompt = await page.getByRole("heading", { level: 2 }).last().textContent();
  await page.goto("/holiday-2026");
  await expect(page.getByRole("link", { name: /Holiday Trivia/ })).toContainText("Continue →");
  await page.getByRole("link", { name: /Holiday Trivia/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 2 }).last()).toHaveText(prompt ?? "");
});
