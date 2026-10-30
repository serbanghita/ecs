# Execution Log: Release 2.1.0

Started: 2026-10-30 18:31:54 UTC

Steps 1 and 2 are not committed separately; the plan makes one release commit in step 3.

---

## Step 1: Chapter 1, release contents, TypeScript only

Result: COMPLETED
Duration: 0m 39s
Files changed: .npmignore, .gitattributes (new), dist/ecs.js (rebuilt)
Tests: no unit test applies; verified by the plan's commands below (the full suite runs as the step 3 gate)

Output:
Check first: `npm pack --dry-run` listed `.planning/.sessions/44302`, the archived plan files and
`dist/ecs.js`; `grep -c assertRegistryIsCurrent dist/ecs.js` was 0.
Changes: `.npmignore` gains `.planning/` and `.gitattributes` under "Dev/build tooling" and replaces the five
`dist/demo.*` / `dist/example.*` lines with `dist/`; new `.gitattributes` with `/dist export-ignore` and
`/.planning export-ignore`; `npm run build` (prebuild `tsc --noEmit` passed) rebuilt `dist/ecs.js` to 26.6kb.
Deviation from the plan: the first dry run after the change listed 13 files because the new `.gitattributes`
was packed. It is dev tooling, so it was added to `.npmignore`; the plan did not anticipate it.
After: `npm pack --dry-run` lists exactly the 12 expected files (12): CHANGELOG.md LICENSE README.md package.json src/Component.ts src/ComponentRegistry.ts src/Entity.ts src/frameGuard.ts src/index.ts src/Query.ts src/System.ts src/World.ts 
`grep -c assertRegistryIsCurrent dist/ecs.js`: 7.
The `git archive` check is deferred to the step 3 release commit, as the plan states.

---

## Step 2: Chapter 2, version and changelog

Result: COMPLETED
Duration: 0m 38s
Files changed: package.json, package-lock.json, CHANGELOG.md
Tests: no unit test applies; verified by the plan's commands below (the full suite runs as the step 3 gate)

Output:
Check first: package.json version was 2.0.0; CHANGELOG headings were [Unreleased] at line 8 and [2.0.0] at line 28.
`npm version 2.1.0 --no-git-tag-version` printed v2.1.0. `git diff -- package.json package-lock.json` shows
only version lines (one in package.json, two in package-lock.json).
CHANGELOG: "## [Unreleased]" (empty) at line 8, "## [2.1.0] - 2026-10-30" at line 10, "## [2.0.0] - 2026-10-29"
at line 32. Two lines added to the 2.1.0 "Changed" section (lines 29 and 30): TypeScript-only package, and first
2.x version on npm. The 2.1.0 "Changed" section has 10 bullets: the 8 from the identity plan plus these two.

---

## Step 3: Chapter 3, gate, commit, tag, push, publish (in progress)

Gate on the working tree with steps 1 and 2 applied:
  npm test: Test Files 9 passed (9), Tests 115 passed (115)
  npm run lint: 0 errors
  npm run build: Done (dist/ecs.js rebuilt again, unchanged)
  npm pack --dry-run: 12 files, the expected list
Tag policy tree review: tracked files outside src/ and dist/ are repo config (.editorconfig, .github workflow,
.gitignore, .npmignore, prettier and eslint config, tsconfig, vite config, docs, package files) plus
.claude/settings.json, which was already tracked in v2.0.0. dist/ is tracked and export-ignored.
Release commit 2f9d56c: "Release 2.1.0: idempotent component registration and identity protection (#1)";
gpg: Good signature from "Serban Ghita <serbanghita@gmail.com>"; no attribution lines.
Tag v2.1.0: git tag -v shows Good signature, EDDSA key 6A4ACBB9E82812953232565E87AD4E16058BB1CA.
git archive v2.1.0: 0 entries under dist/ or .planning/, 38 files.
Pending user confirmation: push main and v2.1.0, npm publish, close serbanghita/ecs#1.

Push: `git push origin main` moved origin/main from 598735c to 2f9d56c; `git push origin v2.1.0` created the tag
on origin (c85c9a213db2bf30e8bd8cb9bee47c634e7292e9). `git status -sb` shows `## main...origin/main`.
npm publish: FAILED. Verbatim output:
  npm notice package size: 12.5 kB
  npm notice unpacked size: 43.3 kB
  npm notice total files: 12
  npm notice Publishing to https://registry.npmjs.org/ with tag latest and public access
  npm error code E404
  npm error 404 Not Found - PUT https://registry.npmjs.org/@serbanghita-gamedev%2fecs - Not found
  npm error 404  The requested resource '@serbanghita-gamedev/ecs@2.1.0' could not be found or you do not have permission to access it.
Retry after `npm login` (npm whoami: serbanghita): npm publish FAILED again, this time on two-factor auth.
Verbatim:
  npm notice Publishing to https://registry.npmjs.org/ with tag latest and public access
  npm error code EOTP
  npm error This operation requires a one-time password.
  npm error Open this URL in your browser to authenticate: https://www.npmjs.com/auth/cli/<id>
npm still reports version 1.1.0 (dist-tags latest: 1.1.0). The publish needs the interactive 2FA flow from the
user's own shell.
Publish, third attempt, run by the user with `npm publish --otp=<code>`: `+ @serbanghita-gamedev/ecs@2.1.0`,
12 files, 12.5 kB, shasum 2a84779af7f7d5dbed7b644e829bc9c871d013f5. The registry listed 2.1.0 about a minute later.
Verified: `npm view @serbanghita-gamedev/ecs version` returns 2.1.0; `dist.fileCount` is 12; the downloaded
tarball contains exactly the 12 expected files.
Issue: comment https://github.com/serbanghita/ecs/issues/1#issuecomment-6530723319 posted, issue closed;
`gh issue view 1 --json state` returns CLOSED.

Result: COMPLETED
Duration: 6m 33s (including the two failed publish attempts and the user's login and OTP steps)
Files changed: none beyond steps 1 and 2 (release commit 2f9d56c, tag v2.1.0)
Tests: `npm test` PASSED (115) as the gate and again as the final run

---

## Summary

- Total steps: 3
- Completed: 3
- Failed: 0 (step 3 failed twice on npm authentication and 2FA before succeeding)
- Skipped: 0
- Verified by tests: 3 of 3 (the full suite ran as the step 3 gate and as the final run; steps 1 and 2 were
  verified by the plan's packaging and version commands)
- Git commits: 2f9d56c (release commit; tag v2.1.0 on it)
- Final run:  Test Files 9 passed (9) Tests 115 passed (115) 
