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
