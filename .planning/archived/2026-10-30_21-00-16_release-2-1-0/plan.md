# Release 2.1.0

Publish the component identity fix as 2.1.0. The identity plan is executed and archived at
`.planning/archived/2026-10-30_20-18-17_issue-1-component-identity/`; its commits `2004de6` to `7402b63` are on
local `main`, not yet pushed, with `npm test` green (115 tests).

Version: 2.1.0, minor. The change adds public members (`ComponentRegistry.generation`,
`ComponentRegistry.indexOf`, `World.assertRegistryIsCurrent`) and new throwing paths. npm never received 2.0.0
(`npm view @serbanghita-gamedev/ecs dist-tags` reports `latest: 1.1.0`, while git has a pushed `v2.0.0` tag). The
user is the only consumer of this package, so publishing 2.1.0 directly is fine; the CHANGELOG notes that the
2.0.0 entry carries the 1.x migration.

Decisions:

- The release ships TypeScript source only. `dist/` is excluded from the npm tarball and from git archives. The
  folder stays tracked in git because `build`, `build:example`, `build:demo` and `dev:demo` write into it.
- `.planning/` is excluded from the npm tarball and from git archives.
- The `World.stop()` inside-a-frame defect (`.planning/world-stop-inside-frame/`) is not part of 2.1.0. It ships
  as 2.1.1 after this release.
- Not included: a `prepublishOnly` script in `package.json`. The gate in chapter 3 is run by hand for this
  release; add the script later if the gate should be enforced on every publish.

Execution order: chapter 1, chapter 2, chapter 3. Every outward-facing step in chapter 3 (push, publish, issue
comment) is confirmed with the user before it runs.

## Chapter 1: Release contents, TypeScript only

Today `npm pack --dry-run` includes `dist/ecs.js` (22.6kB, a stale bundle that predates the identity fix) and
every file under `.planning/`, including the session files, so its total grows with every plan file written.
`.npmignore` excludes only the demo and example files under `dist/`, and nothing under `.planning/`.

Changes:

- `.npmignore`: under "Dev/build tooling" add `.planning/`; replace the five `dist/demo.*` and `dist/example.*`
  lines under "Tests & examples" with a single `dist/` line
- `.gitattributes` (new): `/dist export-ignore` and `/.planning export-ignore`, so GitHub source archives of
  the tag are TypeScript only as well. This also answers the tag policy's artifact review: the tracked
  `dist/` files stay in git and are excluded from archives
- `npm run build`: rebuild `dist/ecs.js` so the tracked copy matches the source of the release commit. It is
  not published, but a stale tracked bundle next to a 2.1.0 tag is misleading

Affected files:

- .npmignore
- .gitattributes (new)
- dist/ecs.js (rebuilt)

Verification:

- `npm pack --dry-run` lists exactly 12 files: `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`,
  `src/Component.ts`, `src/ComponentRegistry.ts`, `src/Entity.ts`, `src/frameGuard.ts`, `src/index.ts`,
  `src/Query.ts`, `src/System.ts`, `src/World.ts`; no `dist/` and no `.planning/` path
- `npm run build` succeeds (its `prebuild` runs `tsc --noEmit`); `grep -c "assertRegistryIsCurrent" dist/ecs.js`
  is at least 1 (it is 0 today)
- after the chapter 3 release commit: `git archive HEAD | tar -t | grep -E "^dist/|^\.planning/"` prints nothing
  (`git archive` reads attributes from the committed tree, so this check runs on the commit, not the working tree)

## Chapter 2: Version and changelog

- `package.json` version 2.0.0 to 2.1.0, with `package-lock.json` following
- `CHANGELOG.md`:
  - rename "## [Unreleased]" to "## [2.1.0] - <release date>" and add an empty "## [Unreleased]" above it
  - under the 2.1.0 "Changed" section add: "the npm package ships TypeScript source only; `dist/ecs.js` is no
    longer included" (1.1.0, the last npm version, shipped `dist/ecs.js` but never the demo or example bundles)
    and "first 2.x version on npm; see the 2.0.0 entry for the migration from 1.x"

Affected files:

- package.json
- package-lock.json (version fields)
- CHANGELOG.md

Verification:

- `npm version 2.1.0 --no-git-tag-version` updates both package files; `git diff -- package.json
  package-lock.json` shows only version lines
- `grep -n "^## \[" CHANGELOG.md` shows `[Unreleased]` first, then `[2.1.0] - <date>`, then `[2.0.0] - 2026-10-29`
- the 2.1.0 "Changed" section lists every new throw and every new public member from the identity plan, plus the
  two lines above

## Chapter 3: Gate, commit, tag, push, publish

Gate, on the working tree with chapters 1 and 2 applied, before any commit:

- `npm test`: 115 passed
- `npm run lint`: no errors
- `npm run build`: succeeds
- `npm pack --dry-run`: the 12-file list from chapter 1

Then:

1. commit `.npmignore`, `.gitattributes`, `dist/ecs.js`, `package.json`, `package-lock.json`, `CHANGELOG.md` with
   the message `Release 2.1.0: idempotent component registration and identity protection (#1)`, following the
   commit policy (author identity, GPG signing, no attribution trailers)
2. `git tag -s v2.1.0 -m "Release 2.1.0"`; `git tag -v v2.1.0` shows a good signature from
   `6A4ACBB9E82812953232565E87AD4E16058BB1CA`
3. `git archive v2.1.0 | tar -t | grep -E "^dist/|^\.planning/"` prints nothing
4. confirm with the user, then `git push origin main` and `git push origin v2.1.0`
5. confirm with the user, then `npm publish`
6. confirm with the user, then close serbanghita/ecs#1 with a comment linking the `v2.1.0` tag and the npm
   version

Affected files:

- none beyond chapters 1 and 2

Verification:

- `git status -sb` shows `main...origin/main` with no "ahead"; `git ls-remote --tags origin v2.1.0` returns the
  tag
- `npm view @serbanghita-gamedev/ecs version` returns 2.1.0 and `npm view @serbanghita-gamedev/ecs dist.fileCount`
  returns 12
- `gh issue view 1 --repo serbanghita/ecs --json state -q .state` returns CLOSED

## Follow-up: 2.1.1

`.planning/world-stop-inside-frame/` is executed after this release and published as 2.1.1 with its own
CHANGELOG "Fixed" entry. It is listed here only so the two releases are not confused; it has no steps in this
plan.
