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
