# Tasks

- [x] 1.1 Remove the frontend Updates card, release banner, update client and
      update state while retaining Version metadata and editor auto-hide.
- [x] 1.2 Remove the backend release-check route, semver helper, configuration,
      generated environment entries and obsolete launch overrides.
- [x] 1.3 Remove release-check tests and add focused assertions for the retired
      endpoint and retained Settings version/auto-hide behavior where needed.
- [x] 2.1 Run backend tests, frontend unit tests and relevant browser tests.
- [x] 2.2 Run `npm run check`, `npm run build`, `npm run docs:build` and
      `git diff --check`.
- [x] 2.3 Run `openspec validate --all --strict --no-interactive`.
- [x] 2.4 Scan for update UI, route, configuration and external release-check
      references; verify the editor auto-hide paths remain.
- [x] 3.1 Synchronize the implemented specification and archive this change
      after validation.
- [x] 3.2 Commit and push the implementation branch.

## Validation

- `npm --prefix backend test`: 18 files, 206 tests passed.
- `npm --prefix frontend run test:unit`: 6 files, 46 tests passed.
- `npm --prefix e2e run check`: passed.
- `npm --prefix e2e test -- --grep 'backup export controls|English navigation'`:
  5 browser tests passed. Settings showed Version, no Updates text, the
  auto-hide switch, and no `/system/update` request.
- `npm --prefix e2e test -- --grep 'should display drawing name in editor header'`:
  1 auto-hide browser test passed.
- `npm run check`: passed, including format, lint, version and environment
  boundary checks.
- `npm run build`: passed for backend and frontend.
- `npm run docs:build`: passed.
- `git diff --check`: passed.
- `openspec validate --all --strict --no-interactive`: 5 items passed.
- Source scan found no obsolete update implementation references; retained
  version metadata and auto-hide paths were present.
