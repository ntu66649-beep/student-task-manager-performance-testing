# StudyFlow UI synchronization

Date: 2026-10-30. Branch: `codex/studyflow-ui`. Design reference: DuANE2E commit `36629698fd2d4aa1945ca11fe07cf27ac2c635a4`.

## Shared design

All seven projects share `design/studyflow-tokens.json`. Primary #7662cf, hover #6450bb, navy #191d33, canvas #f7f8fc, white panels, lavender #f0ecfc, ink #2b2d43. Buttons use a 9px corner radius, panels 12px, inputs 8px. System sans-serif typography uses Segoe UI with platform fallbacks.

Web apps use identical `css/studyflow-common.css` and `js/studyflow-common.js` plus a small layout adapter. Login story, form, demo account controls and StudyFlow branding are shared; project-specific controls stay available. Flutter implements the same design tokens in native widgets, with a responsive navy sidebar/header and split login.

## Preserved behavior

The existing REST API authentication, sessionStorage token, server data, CRUD, loading/error states, list/board modes and project-specific testing tools remain active. Native API usernames/passwords are retained.

## Validation

npm run test:ui: 4 passed. Original smoke scenario: 480/480 checks, 240 HTTP requests, all thresholds passed on the local API. HTML/JSON exports succeeded. npm run report:build rebuilt 4 saved reports. Load/stress/full-flow were preserved and not rerun. These local smoke timings are not a production capacity benchmark.

Visual QA checked the login and authenticated workspace. Browser verification covered the web apps at 320–1440px with no horizontal overflow or JavaScript errors in the checked flows.

## Run the performance workspace

Start the existing student-task-manager-api-testing API at http://localhost:3000, then run `npm start` here. Open http://localhost:3106. Set `API_BASE_URL` to choose another API and `UI_PORT` to choose another UI port. The UI proxies `/api/*` without changing methods, tokens or request bodies; k6 continues to use its existing `BASE_URL`, `TEST_USERNAME` and `TEST_PASSWORD`. Existing report links are available from the sidebar and `/reports/index.html`. API failures show a useful message.

The k6 report renderer now formats Vietnamese numbers without locale APIs unsupported by k6. A regression test simulates the missing locale support. The same styling is applied to saved HTML reports. Scenario scripts, payloads, VU stages and SLA thresholds are unchanged.

## Maintenance

Update the shared token file and common CSS/JS consistently across the six web repositories, and map the same tokens into Flutter. Preserve each project’s backend, test tools and accessibility keys when changing presentation. Keep intentional failure demonstrations separate from normal test results.
