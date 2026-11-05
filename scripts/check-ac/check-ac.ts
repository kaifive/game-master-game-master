/**
 * Every acceptance criterion in a Ready, Building or Done spec must have a
 * test that names it, such as "S04-AC3" (docs/conventions/testing.md).
 */
export type Spec = { file: string; number: string; status: string; criteria: string[] };
export type Missing = { id: string; file: string };

const CHECKED = new Set(["Ready", "Building", "Done"]);

export function parseSpec(file: string, markdown: string): Spec | null {
  const number = /(?:^|\/)(\d{2})-[^/]+\.md$/.exec(file)?.[1];
  if (!number) return null;
  const status = /^\*\*Status:\*\*\s*(\w+)/m.exec(markdown)?.[1] ?? "Draft";
  const section =
    /^## Acceptance criteria\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(markdown)?.[1] ?? "";
  const criteria = [...section.matchAll(/^\s*-\s*(?:\[[ x]\]\s*)?AC-(\d+)\b/gm)].map(
    (m) => `S${number}-AC${m[1] ?? ""}`,
  );
  return { file, number, status, criteria };
}

export function findMissing(specs: Spec[], testSources: string[]): Missing[] {
  const all = testSources.join("\n");
  return specs
    .filter((s) => CHECKED.has(s.status))
    .flatMap((s) =>
      s.criteria
        .filter((id) => !new RegExp(`\\b${id}(?!\\d)`).test(all))
        .map((id) => ({ id, file: s.file })),
    );
}
