# State of the Race — Poll Tracker

Version 0.7.0

A static polling tracker with automated data updates, stored history, trend charts, and GitHub Pages deployment.

## Current data flow

```text
GitHub Actions
→ npm run update-polls
→ data/polling.json
→ data/polling-history.json
→ GitHub Pages redeploy
```

## Active sources

Generic ballot:
- VoteHub
- FiftyPlusOne
- Silver Bulletin
- CNN
- Race to WH

Trump approval:
- VoteHub
- FiftyPlusOne
- Silver Bulletin
- CNN
- Race to WH
- The New York Times

Only live scraped values count in the combined averages. Fallback/reference values can be shown, but they are not counted.

## Run locally

Install dependencies:

```bash
npm install
```

Install the browser used by Playwright:

```bash
npm run install-browsers
```

Update polling data:

```bash
npm run update-polls
```

Run the site locally:

```bash
npm start
```

Then open:

```text
http://127.0.0.1:5500
```

## Automated updates

The updater workflow is:

```text
.github/workflows/update-polls.yml
```

It:
- runs manually from the GitHub Actions tab
- runs automatically every two days
- installs dependencies
- installs Chromium for Playwright
- runs `npm run update-polls`
- commits updated data files back to the repo

The protected data files are:

```text
data/polling.json
data/polling-history.json
```

## Data protection

The protection workflow is:

```text
.github/workflows/protect-polling-data.yml
```

It prevents normal/manual commits from accidentally overwriting the growing data files. The scraper bot is still allowed to update them.

To intentionally allow a data-file change, include this in the commit message:

```text
[allow-data]
```

## History and 7-day changes

`data/polling-history.json` stores one dated point per scraper run. If the scraper runs more than once on the same day, that day's point is replaced instead of duplicated.

The 7-day change cards compare the latest stored point to the oldest usable point inside the previous seven days.

## 0.7 cleanup

This version:
- cleaned old updater startup logs
- replaced long release notes with current setup docs
- removed old DDHQ cleanup/debug references
- cleaned source labels on the public pages
- fixed the FiftyPlusOne approval source link
- added final responsive layout overrides for desktop/tablet/mobile


## Version 0.7.1

Changed files:
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Prevented homepage Generic Ballot and Trump Approval numbers from overlapping the center trend chip at medium screen widths.
- The major-card number row now stacks inside each card before the text gets cramped.
- Large screens still keep the side-by-side card design.


## Version 0.7.2

Changed files:
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Added a stronger responsive layout fix for the homepage Generic Ballot and Trump Approval cards.
- The major-card number row now stacks based on card width, not just screen width.
- Added a fallback media query for browsers without container-query support.
- Negative weekly-change values now use a real minus sign with a thin space, so it reads like `− 0.4` instead of a cramped hyphen.


## Version 0.7.3

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Removed the small blue hero eyebrow heading from every page.
- Moved the homepage trend chips outside the number rows, so the percent numbers cannot overlap them at any screen width.
- Kept the two large percent numbers side-by-side when there is enough room and stacked them when the card gets narrow.


## Version 0.7.4

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the small blue label headings everywhere.
- This includes both `.eyebrow` and `.section-label` labels.
- Added a global CSS fallback so those labels stay hidden even if one remains in future markup.


## Version 0.7.5

Changed files:
- `js/trend-charts.js`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added a dotted vertical marker to trend charts at the first live collected data point.
- The marker is labeled `Live data begins` and shows the date.
- The default hover panel text now explains that the dotted line marks when live data collection began.
- This makes the jump from estimated starter history to live scraper data understandable.


## Version 0.7.6

Changed files:
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fixes:
- Restored the homepage major-card large-screen layout so the trend chip sits between the two large numbers again.
- The cards only stack internally when the card itself gets too narrow.
- Removed the small blue headings/badges from all HTML pages again and kept a CSS fallback hiding `.eyebrow` and `.section-label`.


## Version 0.7.7

Changed files:
- `styles.css`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Remade the homepage major cards at medium screen widths.
- At that size, the two percent values now sit cleanly side-by-side at the top of each card, with the trend chip centered below them.
- Very large screens keep the original three-column layout.
- Narrow/mobile screens still stack vertically.


## Version 0.7.8

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Redesigned the homepage metric cards closer to the mockup.
- Added a small arrow/change badge next to each main percent:
  - Democrats
  - Republicans
  - Approve
  - Disapprove
- The center trend chip remains for margin/net approval change.
- Medium widths use two percent values above and the trend chip centered below.


## Version 0.7.9

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the center trend chip from the homepage Generic Ballot and Trump Approval cards.
- Each main percent now carries its own arrow/change badge:
  - Democrats
  - Republicans
  - Approve
  - Disapprove
- This makes the cards simpler and avoids duplicated trend information.


## Version 0.7.10

Changed files:
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added a mobile overscroll background fix so pulling past the top or bottom should stay dark instead of showing white bars.
- Set the root `html` and `body` backgrounds to the site dark color.
- Added `overscroll-behavior-y: none` where supported.
- Added mobile `theme-color` meta tags.


## Version 0.7.11

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added homepage text explaining that the small plus/minus arrow badges show change since last week.
- Added hover/title text to the mini-change badges, such as “Up 0.4 points since last week.”


## Version 0.7.12

Changed files:
- `methodology.html`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Replaced the About/Methodology page text using the new reference copy.
- Cleaned spelling and grammar while keeping the same meaning.
- Added clearer sections for purpose, sources, average-of-averages, current calculations, and algorithm adjustment.


## Version 0.7.13

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- The small homepage change badges now include `1W`, so it is clear they are weekly changes.
- Increases are green and decreases are red.
- Removed hover/title dependence; the weekly-change meaning is visible directly on the page.


## Version 0.7.14

Changed files:
- `scripts/update-polls.js`
- `.github/workflows/protect-polling-data.yml`
- `package.json`
- `README-AUTO-DATA.md`

Final 0.7 cleanup:
- Updated the scraper console version from the old 0.7.0 label to 0.7.14.
- Restored/added the polling-data protection workflow so manual uploads do not overwrite `data/polling.json` or `data/polling-history.json`.
- Confirmed the scraper source list is expansion-friendly: new sources can be added by creating a new file in `scripts/sources/`, importing it in `scripts/update-polls.js`, and adding its key to `sourceOrder`.

Expansion notes for 1.0:
- Keep scraper data in `data/polling.json`.
- Keep graph/history data in `data/polling-history.json`.
- Add future race pages as separate HTML pages first, then add new source modules only when the data format is stable.
- Use `[allow-data]` in a commit message only when intentionally changing the protected data files.


## Version 0.7.15

Changed files:
- `index.html`
- `styles.css`
- `js/load-polling-data.js`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed arrow icons from the homepage weekly-change badges because they rendered poorly on mobile.
- Removed `1W` from each badge.
- Added one clear homepage note explaining that plus/minus badges show weekly change.
- Tightened mobile badge sizing so the cards look cleaner before moving into version 0.8.


## Version 0.7.16

Changed files:
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Blocked horizontal mobile overscroll/page sliding.
- Locked horizontal overflow on `html`, `body`, and `.page-shell`.
- Added mobile-safe max-width rules so wide elements cannot push the page sideways.


## Version 0.7.17

Changed files:
- `styles.css`
- `js/load-polling-data.js`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed arrow characters from the mini weekly-change badge text completely.
- Desktop arrows are now CSS-only.
- Mobile hides those CSS arrows, so the phone should no longer render them as emoji.
- The badges still show plus/minus values such as `+0.8` and `−0.4`.


## Version 0.7.18

Changed files:
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- On mobile, the plus/minus weekly-change badge now stacks under the percentage instead of sitting to the side.
- This keeps the badge inside the card and prevents it from getting pushed off-screen.


## Version 0.8.0

Changed files:
- `senate.html`
- `house.html`
- `data/races.json`
- `js/race-maps.js`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Major update:
- Added Senate and House race-map pages.
- Added clickable U.S. state maps using active-race placeholders.
- Senate active states are based on 2026 Senate seats up for election, including the two Class 3 special elections.
- House map treats all states as active because all U.S. House seats are up.
- Active states are gray until race data is added; non-active states are lighter.
- Added expandable `data/races.json` structure for future ratings, leaders, called races, and state pages.


## Version 0.8.1

Changed files:
- `governor.html`
- `senate.html`
- `house.html`
- `data/races.json`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Correction:
- Replaced the House race map plan with Governor races.
- Navigation now links to Senate and Governor.
- Senate map has 35 active races.
- Governor map has 36 active state races.
- The old `house.html` now redirects to `governor.html` so a stale House page does not remain linked or confusing.


## Version 0.8.2

Changed files:
- `house.html`
- `data/races.json`
- `styles.css`
- `index.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `senate.html`
- `governor.html`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Correction:
- Kept Senate and Governor as the active race-map sections.
- Added House back as a work-in-progress page instead of redirecting it.
- Navigation now includes `House WIP`.
- `data/races.json` marks House as work in progress for later district-level expansion.


## Version 0.8.3

Changed files:
- `index.html`
- `house.html`
- `senate.html`
- `governor.html`
- `national-averages.html`
- `trump-approval.html`
- `methodology.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed House WIP from the top navigation.
- Kept Senate and Governor in the top navigation because those are the active map sections.
- Updated the homepage lower cards into real clickable buttons/links.
- Senate and Governor are no longer shown as work in progress on the homepage.
- House remains a lower-page work-in-progress item only.


## Version 0.8.5

Changed files:
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Added colored top borders to the lower homepage cards.
- Replaced paragraph-heavy lower cards with compact overview values.
- Senate and Governor now show placeholder D/GOP overview numbers directly on the homepage.
- House remains a work-in-progress card.


## Version 0.8.6

Changed files:
- `data/races.json`
- `js/race-maps.js`
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Update:
- Added current-control bars to the top of Senate and Governor map pages.
- Senate now uses current control: 47 Democratic caucus / 53 GOP.
- Governor now uses current control: 24 Democratic governors / 26 GOP governors.
- Homepage Senate/Governor overview cards now use those same current values.


## Version 0.8.7

Changed files:
- `index.html`
- `house.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Restored the About the Project paragraph on the homepage lower card.
- Made the House homepage box non-clickable.
- House now only shows a red `Work in progress` status.
- The House page itself is a simple work-in-progress page with no map or action buttons.


## Version 0.8.8

Changed files:
- `index.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Update:
- Redesigned the Senate and Governor homepage summary numbers so they look cleaner and more intentional.
- Added party-tinted mini stat panels and a centered divider for a better visual balance.


## Version 0.8.9

Changed files:
- `senate.html`
- `governor.html`
- `styles.css`
- `scripts/update-polls.js`
- `package.json`
- `README-AUTO-DATA.md`

Fix:
- Removed the contact strip from the bottom of the Senate and Governor pages.
- Made the site footer look more finished with a glass/gradient pill style.
- Race-page footer now says the race maps are early placeholders instead of showing the contact block.
