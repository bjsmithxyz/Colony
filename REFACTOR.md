REFACTOR: Massive simplification and cleanup

Overview
--------
This branch (`refactor-simplify-major`) contains work toward a large-scale refactor and simplification of the Colony codebase. The purpose is to reduce coupling, improve maintainability, and make future features and tests easier to add.

Primary goals
-------------
- Simplify the module system and reduce inter-file dependencies.
- Consolidate rendering code and remove duplicated helpers.
- Split very large files into smaller, well-named modules where it improves clarity.
- Add a small test harness and linting step (future commits).
- Keep changes incremental and reversible; this PR will start as a WIP/draft and collect small, safe commits.

Scope (initial)
----------------
- Add this `REFACTOR.md` as a living design doc.
- Create a small set of scaffolding commits that:
  - Introduce a consistent module import/export pattern.
  - Move a few pure helpers into `js/lib/`.
  - Add lightweight smoke tests (node/browser) later.

Constraints and risk mitigation
-------------------------------
- Keep runtime behaviour unchanged in early commits. Any behavioural changes must be backed by tests or manual smoke runs.
- Push work incrementally; open PR as draft and switch to ready when it's safe.
- If a large change causes regressions, revert the specific commit and continue.

Rollback plan
-------------
- Use git to revert individual bad commits.
- If the whole refactor is problematic, the branch can be closed without merging and development can continue on `main`.

Checklist (short-term)
----------------------
- [x] Create `refactor-simplify-major` branch.
- [x] Add `REFACTOR.md` to document goals.
- [ ] Add scaffolding commits (module pattern, small helper moves).
- [ ] Add smoke tests and linting configuration.
- [ ] Split and refactor large files in small PR chunks.

How to review
-------------
- Review each commit in the draft PR; prefer small commits with a single responsibility.
- Run the app locally after each commit (see `server.py`) and check `index.html` behaviour.

Signature
---------
WIP Draft: Massive refactor & simplification

Signed-off-by: GitHub Copilot
