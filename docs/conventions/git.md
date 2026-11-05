# Git conventions

- Author: Khai Nguyen <tuongkhai.nguyen@gmail.com>.
- **No attribution** in commits or PRs: no Co-Authored-By, no session links,
  no "Generated with" footers.
- One commit per backlog item. Check the item off in `docs/BACKLOG.md` in
  the same commit.
- Message: short imperative subject (`Add points ledger`), blank line, then
  why if it isn't obvious.
- Docs that describe the change go in the same commit as the code.
- Work on a branch per milestone or feature; merge to `main` through a PR.
  Docs-only changes may go straight to `main`.
- Never force-push `main`.
- Khai's standing permission: when Claude opens a PR, it turns on GitHub
  auto-merge (merge commit) so the PR merges by itself once the required
  checks (`Verify`, `End-to-end`) pass. Claude doesn't need to watch it.
  If CI fails, the PR stays open and Claude fixes it.
