# Docs conventions

## Specs

- One per feature in `docs/specs/NN-name.md`, from `specs/_template.md`.
- Status line at the top: `Draft` → `Ready` → `Building` → `Done`.
  - **Draft:** ideas and questions. Don't build.
  - **Ready:** Khai has agreed; acceptance criteria are concrete.
  - **Building:** code in progress.
  - **Done:** shipped; the spec describes what the code does.
- A spec says *what* and *why*. Code-level *how* belongs only where it is a
  contract others rely on (data shapes, routes, events).
- If building reveals the spec is wrong, fix the spec in the same commit.

## ADRs

Append to `DECISIONS.md`. Never edit an accepted ADR's decision; add a new
ADR and set the old one's status to `superseded by ADR-NNN`.

## Glossary

New domain word → add it to `GLOSSARY.md` first, with its code name.

## Style

Short sentences, plain words, tables for anything with columns. Write for
an agent that has read nothing else.
