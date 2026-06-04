# State of the Race — Automatic Polling Data Setup

## What was added

This version adds an automatic data pipeline:

```text
data/polling.json
data/manual-overrides.json
js/load-polling-data.js
scripts/update-polls.js
scripts/sources/*.js
package.json
```

## How to run in VS Code

Open the project folder in VS Code, then open the terminal.

Install dependencies:

```bash
npm install
```

Update the polling data:

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

## Important

The scraper files are set up source-by-source. They try to scrape the public page text first. If a site blocks the script, changes its layout, or requires login data, the script falls back to `data/manual-overrides.json`.

That means the site will still work even while you tune each scraper.

## How to update manual fallback values

Edit:

```text
data/manual-overrides.json
```

Then run:

```bash
npm run update-polls
```

## Where the website reads data from

The website reads:

```text
data/polling.json
```

The frontend loader is:

```text
js/load-polling-data.js
```

## If a subscription page needs a cookie

Do not put real cookies in GitHub.

For local testing only, you can set an environment variable before running the script.

Example on Mac/Linux:

```bash
export NYT_COOKIE="your_cookie_here"
npm run update-polls
```

Example on Windows PowerShell:

```powershell
$env:NYT_COOKIE="your_cookie_here"
npm run update-polls
```

## Next step

Run:

```bash
npm install
npm run update-polls
npm start
```

If a source does not update correctly, send me the terminal output and I can adjust that specific scraper.


## Updated CNN and NYT URLs

This version uses:

```text
https://www.nytimes.com/interactive/polls/donald-trump-approval-rating-polls.html
https://www.cnn.com/polling/approval/trump-cnn-poll-of-polls
https://www.cnn.com/polling/generic-ballot-poll-of-polls
```

## Install Playwright browser support

Run this once after `npm install`:

```bash
npm.cmd run install-browsers
```

Then run:

```bash
npm.cmd run update-polls
```

The script now tries regular fetch first, then falls back to a real Chromium browser for pages that block fetch or load data with JavaScript.


## DDHQ 429 fix

DDHQ was returning HTTP 429 rate-limit errors. This version temporarily skips live DDHQ scraping and uses the values in:

```text
data/manual-overrides.json
```

You can still update DDHQ numbers manually there. The rest of the sources will continue attempting to scrape.


## Fast fallback update

This version avoids long 90-second browser hangs.

Changes:
- Playwright waits for `domcontentloaded`, not `networkidle`.
- Browser timeout is reduced to about 20 seconds.
- Sources run one at a time.
- The terminal prints which source is starting and finishing.
- DDHQ is skipped live because it was returning 429 rate-limit errors.

Run:

```powershell
npm.cmd install
npm.cmd run install-browsers
npm.cmd run update-polls
```


## Link and fallback update

This version fixes:
- NYT Trump approval URL:
  `https://www.nytimes.com/interactive/polls/donald-trump-approval-rating-polls.html`
- CNN Trump approval URL:
  `https://www.cnn.com/polling/approval/trump-cnn-poll-of-polls`
- CNN generic ballot URL:
  `https://www.cnn.com/polling/generic-ballot-poll-of-polls`

It also keeps trusted manual fallback sources included in the average when live scraping is blocked.


## Live trend graphs

This version adds:

```text
data/history.json
js/trend-charts.js
```

The trend charts on `national-averages.html` and `trump-approval.html` use estimated historical points from `data/history.json`, then append the latest values from `data/polling.json`.

Hovering over the graph shows the date and values.

## Generic ballot algorithm adjustment

This version adds:

```text
data/adjustments.json
```

To adjust the generic ballot and generic ballot trend graph, edit:

```json
{
  "genericBallot": {
    "enabled": true,
    "party": "D",
    "points": 1.5
  }
}
```

Use `"party": "D"` for a D+ adjustment or `"party": "R"` for an R+ adjustment.

This adjustment only changes the displayed generic ballot average and generic ballot trend graph. The individual source cards still show the raw aggregator values.

## D+1.6 graph fix

This version sets the generic ballot algorithm adjustment to D+1.6 in:

```text
data/adjustments.json
```

It also centers the graph section, fixes the undefined adjustment label, and cleans up graph fonts/labels.

## Summary-card and graph polish

This version:
- Makes Generic Ballot and Trump Approval combined-average cards match better.
- Centers the graph.
- Removes the Approval Trend descriptive subheader/copy.
- Uses a cleaner system font on the graph.
- Keeps D+1.6 in `data/adjustments.json`.

## Final graph legend fix

This version:
- Removes the floating hover tooltip that covered dates.
- Adds a legend outside the graph.
- Shows hover values in a fixed panel below the graph.
- Hard-codes the adjustment fallback label as D+1.6 so it does not display undefined.


## U.S. outline design preview

This version adds:

```text
assets/us-outline-blue.png
assets/us-outline-white.png
```

The outline is used as a subtle watermark behind the hero section and inside major cards.


## Version 0.5.1

Fixes:
- NYT approval now uses manual fallback values instead of live scraping, because the scraper was pulling incorrect values.
- Card/summary U.S. outline watermark removed from the number-card area.


## Version 0.5.3

Changes:
- Uses the newly uploaded U.S. outline image.
- Styled like 0.5.1 with the map brought back only in the hero area.
- Made the hero outline a little bigger.
- No map watermark in the card/number areas.


## Version 0.5.4

Changes:
- Methodology/content boxes no longer move upward on hover.
- Top navigation is larger.
- Navigation now resizes to fit desktop, tablet, and mobile screens more cleanly.


## Version 0.5.5

Changes:
- Added a bottom contact section to every page.
- Added top navigation link to the contact section.
- Added footer contact links:
  - jackeckholt@gmail.com
  - @jackeckholt


## Version 0.5.6

Changes:
- Renamed "Methodology" to "About the Project" in visible page text/navigation.
- Removed the large site-wide contact section.
- Added a smaller separate contact block on the About page only.
- Kept contact accessible from the nav using a Contact link to methodology.html#contact.
- Cropped a small amount from the right side of the U.S. outline image to remove the border.


## Version 0.5.7

Changes:
- Contact nav link is visible and points to a real contact block.
- Contact block is on the About the Project page.
- Added a subtle page-background map watermark so the image is not only in the top hero.
- Kept map watermark out of number/card areas.


## Version 0.5.8

Changes:
- Replaced the old map watermark with the newly uploaded U.S. outline image.
- Removed the random corner map effect.
- Made the map a large centered background element.
- Extended the map beyond the header so it continues into the page design instead of staying only in the top area.


## Version 0.5.9

Changes:
- Repositioned the U.S. outline so it sits centered behind the hero text like the reference.
- Reduced the map from full-page background behavior to a clean hero design element.
- Styled the "National Poll Tracker" home link as a pill button like the other top-nav items.


## Version 0.5.10

Changes:
- Moved contact into a compact strip right before the footer on the About the Project page.
- Tightened the hero/header vertical spacing so there are not huge empty borders.
- Made the U.S. outline larger behind the hero title.


## Version 0.5.11

Changes:
- Fixed U.S. outline clipping at certain window sizes.
- Restored the compact contact strip before the footer.
- Contact now appears before the footer on every page so the nav link always works.


## Version 0.5.12

Changes:
- Fixed mobile top navigation so buttons do not crunch/stack awkwardly on the right.
- Contact section now appears only on the About the Project page.
- Contact section is placed above the footer.
- Contact nav links from other pages point to the About page contact section.


## Version 0.5.13

Changes:
- Reworked the About the Project page for large screens.
- About content now uses a wider responsive grid instead of a narrow stacked column.
- Reduced wasted side space on large monitors.
- Kept the mobile/tablet layout stacked and readable.


## Version 0.5.14

Changes:
- Moved the contact strip directly above the footer on the About the Project page.
- Removed contact sections from the other pages.
- Contact nav links still point to the About page contact section.


## Version 0.5.15

Changes:
- Renamed the Governor section to Gubernatorial.
- Added a centered recent-trend preview to the Gubernatorial card.
- Included a sample upward arrow and week-over-week change so you can preview the design.


## Version 0.5.16

Changes:
- Moved the recent trend preview into the middle of the Trump Approval card on the home page.
- Styled the recent trend as a centered chip between Approve and Disapprove.
- Used party-color logic for the arrow/trend styling (blue or red depending on the situation).


## Version 0.5.17

Changes:
- Added a centered change/trend chip to both major home cards.
- Generic ballot chip now shows the Democratic-side algorithm adjustment in the middle.
- Trump approval chip now reads "Approval" with the arrow and change amount.
- Removed the trend preview from the Gubernatorial section.


## Version 0.5.20

Scraper work:
- DDHQ now attempts a real scrape for generic ballot and Trump approval before using fallback values.
- NYT now attempts a real scrape for Trump approval before using fallback values.
- NYT generic ballot remains not included because no usable national generic ballot average is available.
- Added `DDHQ_COOKIE` and `NYT_COOKIE` entries to `.env.example` for cases where those pages require browser/session access.
- Added browser snapshot extraction that reads visible page text, HTML, and page scripts for more robust polling value detection.

Notes:
- If DDHQ or NYT rate-limits, blocks automation, or changes page structure, the scraper will still fall back to manual values instead of breaking the update.


## Version 0.5.21

Scraper visibility update:
- DDHQ and NYT now print clear messages when live scraping works.
- If scraping fails or cannot find both values, the terminal will say it is using fallback values.
- `data/polling.json` now includes `scrapeStatus` on DDHQ/NYT source records:
  - `"live"` means the scraper found live values.
  - `"fallback"` means it used the manual fallback value.
  - `"not_applicable"` means that source is intentionally not scraped for that category.

How to test:
1. Run `npm.cmd run update-polls`.
2. Look in the terminal for messages like:
   - `[DDHQ] Generic ballot live scrape worked: D 43.7 / R 40.3`
   - `[DDHQ] Trump approval live scrape worked: Approve 40.3 / Disapprove 56.2`
   - `[NYT] Trump approval live scrape worked: Approve 38 / Disapprove 58`
3. Then open `data/polling.json`.
4. Check the DDHQ and NYT entries. If `scrapeStatus` says `"live"`, that scrape worked. If it says `"fallback"`, it did not.


## Version 0.5.22

Scraper validation fix:
- DDHQ and NYT live scrapes are now sanity-checked before being accepted.
- Bad extracted values like `Approve 30 / Disapprove 56.8` or `Approve 58 / Disapprove 29` are rejected.
- Rejected values fall back to trusted manual values.
- Rejections are shown clearly in the terminal and stored in `data/polling.json` as `scrapeNote`.

What you should see:
- If the scrape grabs wrong values, the terminal should now say `scrape rejected (...) Using fallback`.
- `data/polling.json` should show `"scrapeStatus": "fallback"` for that source instead of pretending it was live.


## Version 0.5.23

DDHQ / NYT approval scraper fix:
- Updated trusted current values from screenshots:
  - DDHQ approval: Approve 38.9 / Disapprove 56.8
  - NYT approval: Approve 38.0 / Disapprove 58.0
- DDHQ scraper now prefers the visible `Candidate / Average` table pattern.
- NYT scraper now prefers chart-end label patterns like `Disapprove 58%` and `Approve 38%`.
- NYT no longer uses the broad label `Approval`, because that can match the page title and grab the wrong number.
- Validation now accepts those real current values while rejecting clearly wrong values like Approve 30 or swapped 58/29.


## Version 0.5.24

Scraper validation update:
- Live scrape values are no longer rejected just because they differ from old fallback values.
- Fallback values are now only a safety net, not a truth check.
- Approval scrapes still reject obviously bad/swapped values where approve is higher than disapprove for the current Trump approval pages.
- Generic ballot scrapes use broad sanity checks instead of fallback-distance checks.
- This should avoid blocking legitimate changes over time.


## Version 0.5.25

Hard scraper validation fix:
- Removed fallback-distance validation entirely from DDHQ and NYT.
- Added terminal version stamp:
  - `Poll tracker updater version 0.5.25`
  - `DDHQ/NYT validation: fallback-distance checks disabled.`
- If your terminal still says `too far from fallback`, you are not running this version.

How to verify:
1. Open the 0.5.25 folder.
2. Run `npm.cmd install`.
3. Run `npm.cmd run update-polls`.
4. Confirm the first line says `Poll tracker updater version 0.5.25`.


## Version 0.5.26

DDHQ table extraction fix:
- DDHQ generic ballot now scrapes the visible table first, not the chart/tooltip text.
- Expected current DDHQ generic values from the screenshot:
  - Democratic 45.30
  - Republican 37.80
- DDHQ approval now also scrapes the visible table first:
  - Approve 38.90
  - Disapprove 56.80
- DDHQ generic values below 30 are rejected, so bad chart-axis values like D 23 / R 25 no longer get accepted.
- Terminal success messages now say `table scrape worked` when the table extractor succeeds.


## Version 0.5.27

DDHQ / NYT link and scraper update:
- DDHQ generic ballot URL changed to:
  - https://votes.decisiondeskhq.com/polls/generic-ballot/national/lv-rv-adults
- DDHQ generic ballot now reads the bottom `CANDIDATE / AVERAGE` table:
  - Democratic 45.30
  - Republican 37.80
- NYT approval uses the provided page:
  - https://www.nytimes.com/interactive/polls/donald-trump-approval-rating-polls.html
- NYT approval extraction looks for chart labels like:
  - Disapprove 58%
  - Approve 38%
- The updater now prints:
  - `Poll tracker updater version 0.5.27`
  - `DDHQ generic URL: votes.decisiondeskhq.com`

How to verify:
1. Run `npm.cmd run update-polls`.
2. Confirm the first lines show version `0.5.27`.
3. For DDHQ generic, look for `Generic ballot table scrape worked`.
4. For NYT approval, look for `Trump approval chart scrape worked` or a fallback message.


## Version 0.5.28

Scraper debug/network capture:
- DDHQ and NYT now capture:
  - visible text
  - page HTML
  - script contents
  - JSON/network responses
- DDHQ extraction searches those combined sources for candidate average values.
- If a scrape fails, debug files are saved:
  - `data/scrape-debug/ddhq-generic.txt`
  - `data/scrape-debug/ddhq-approval.txt`
  - `data/scrape-debug/nyt-approval.txt`

How to verify:
1. Run `npm.cmd run update-polls`.
2. If DDHQ or NYT still says missing values, open the matching debug file.
3. Search inside it for:
   - `Democratic`
   - `Republican`
   - `Approve`
   - `Disapprove`
   - `45.30`
   - `37.80`
   - `58`
   - `38`

This version is meant to expose exactly what the browser receives, so the scraper can be tightened if the values are hidden in a different structure.


## Version 0.5.29

DDHQ approval link + NYT label-order fix:
- DDHQ approval URL changed to:
  - https://votes.decisiondeskhq.com/polls/presidential-approval/donald-j-trump-5/national/lv-rv-adults
- DDHQ candidate matching now avoids matching `Approve` inside `Disapprove`.
- NYT approval extraction now handles the current visible order:
  - `38% Approve`
  - `58% Disapprove`
- Expected working results from the provided debug text:
  - DDHQ approval: Approve 38.90 / Disapprove 56.80
  - NYT approval: Approve 38 / Disapprove 58


## Version 0.5.30

Verification update:
- Added a full terminal summary after every scraper run.
- The updater now prints the value used for every generic ballot source:
  - VoteHub
  - Silver Bulletin
  - CNN
  - Race to WH
  - Decision Desk HQ
  - NYT
- It also prints every Trump approval source:
  - VoteHub
  - Silver Bulletin
  - CNN
  - Race to WH
  - Decision Desk HQ
  - NYT
- The summary shows:
  - values used
  - whether the source is included in the average
  - scrape status when available

How to use it:
1. Run `npm.cmd run update-polls`.
2. Read the `Generic ballot source summary`.
3. Read the `Trump approval source summary`.
4. Compare each listed value to the source page.
5. If one is wrong, the source name and exact bad value will be obvious.


## Version 0.5.31

Bug fix:
- Fixed the `ReferenceError: output is not defined` crash from 0.5.30.
- The scraper was already completing correctly; the crash only happened when printing the new verification summary.
- The summary now references the actual final polling data object.

Expected behavior:
- `npm.cmd run update-polls` should finish without the `output is not defined` error.
- You should see the full generic ballot and Trump approval source summaries after `Updated data/polling.json`.


## Version 0.5.32

Approval source verification update:
- Updated/confirmed approval source URLs:
  - Silver Bulletin: https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin
  - CNN: https://www.cnn.com/polling/approval/trump-cnn-poll-of-polls
  - VoteHub: https://www.votehubpolling.com/polls/approval/donald-trump/approval-rating
  - Race to WH: https://www.racetothewh.com/trump
- Updated current approval fallback values from the screenshots:
  - Silver Bulletin: Approve 38.6 / Disapprove 57.7
  - CNN: Approve 36.0 / Disapprove 63.0
  - VoteHub: Approve 40.3 / Disapprove 57.0
  - Race to WH: Approve 37.7 / Disapprove 58.2
- Added more status logging for non-DDHQ/NYT approval sources when their own scraper finds values.
- If a source still says `fallback`, it is using the verified manual value rather than a confirmed live scrape.


## Version 0.5.33

Full source verification/debug mode:
- VoteHub, Silver Bulletin, CNN, and Race to WH now use the same verification style as DDHQ/NYT.
- For each source, the updater attempts a live scrape first.
- If it succeeds, the terminal prints exact live values.
- If it fails or the values look wrong, the terminal says fallback and saves a debug file.
- Debug files are saved in `data/scrape-debug/`, for example:
  - `votehub-approval.txt`
  - `silver-approval.txt`
  - `cnn-approval.txt`
  - `racetowh-approval.txt`

What to do after running:
1. Run `npm.cmd run update-polls`.
2. Look for each source saying either `live scrape worked` or `Using fallback`.
3. Paste the full source summary here.
4. If any source says fallback, open its debug file and search for the expected numbers.


## Version 0.5.34

Generic ballot scraper tightening:
- Updated/confirmed generic ballot links:
  - Silver Bulletin: https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls
  - CNN: https://www.cnn.com/polling/generic-ballot-poll-of-polls
  - VoteHub: https://www.votehubpolling.com/polls/state-of-the-union/generic-congressional-vote
  - Race to WH: https://www.racetothewh.com/polls/genericballot
- Updated current generic ballot fallback values from screenshots:
  - Silver Bulletin: D 48.6 / R 41.8
  - CNN: D 47.0 / R 49.0
  - VoteHub: D 48.3 / R 41.5
  - Race to WH: D 48.1 / R 41.2
- VoteHub extraction now avoids confusing date-range numbers with polling values.
- Race to WH fallback Republican value updated from 40.7 to 41.2 based on the screenshot.


## Version 0.5.35

Data access update:
- Silver Bulletin now tries Datawrapper chart-data URLs directly:
  - Generic ballot chart: `https://datawrapper.dwcdn.net/rfiFi/31/`
  - Trump approval chart: `https://datawrapper.dwcdn.net/kSCt4/349/`
- If Datawrapper CSV/JSON is not exposed, Silver falls back to public text derivation:
  - Generic ballot: Republican value plus the D margin.
  - Approval: strong approve + somewhat approve, then net approval to calculate disapprove.
- VoteHub now reports `blocked` when DataDome/CAPTCHA prevents scraping, rather than pretending it is an ordinary fallback.
- Source summaries now include `scrapeNote` so you can see why a source used fallback, blocked, live, or derived public text.


## Version 0.5.36

Silver Bulletin generic ballot fix:
- Silver generic ballot now explicitly reads the top update text.
- It looks for the public sentence saying Republicans are at `41.6 percent today`.
- It also reads the stated generic-ballot margin, currently `D +6.9`.
- Then it calculates Democrats as `41.6 + 6.9 = 48.5`.
- This avoids depending on the hidden chart/table for Silver generic ballot.
- The terminal will print:
  - `Derived generic ballot from top update text: Republicans today + D margin.`


## Version 0.5.37

Silver generic chart-label extraction:
- Silver generic ballot now tries to read visible chart-end labels like:
  - Democrats 48.6%
  - Republicans 41.8%
- The order for Silver generic is now:
  1. Datawrapper chart data
  2. visible chart labels
  3. top update text derivation
  4. verified fallback
- The verified fallback has been reset to the chart-label values:
  - D 48.6 / R 41.8
- The terminal will print:
  - `Read generic ballot from visible chart labels.`
  if that route works.


## Version 0.5.38

Silver/Race generic extraction update:
- Added the Silver Datawrapper URL visible in DevTools:
  - `https://datawrapper.dwcdn.net/sEHv2/34/`
- Silver now tries multiple Datawrapper candidates for generic ballot:
  - `https://datawrapper.dwcdn.net/rfiFi/31/`
  - `https://datawrapper.dwcdn.net/sEHv2/34/`
- Silver Datawrapper fetching now tries more common endpoints:
  - `data.csv`
  - `dataset.csv`
  - `data.json`
  - `dataset.json`
  - `data`
  - the base iframe URL
- Race to WH fallback remains aligned with the visible chart:
  - Generic D 48.1
  - Generic R 41.2


## Version 0.5.39

Silver rendered Datawrapper iframe scraping:
- Silver now opens the Datawrapper iframe URLs directly with Playwright.
- It waits for the chart to render and reads the rendered DOM labels.
- This targets markup like:
  - `series-label label` = Democrats / Republicans
  - `value-label label last` = 48.6% / 41.8%
- If this works, the terminal will print:
  - `Read generic ballot from rendered Datawrapper iframe labels.`
- Debug files are saved as:
  - `data/scrape-debug/silver-generic-datawrapper-rendered.txt`
  - `data/scrape-debug/silver-approval-datawrapper-rendered.txt`


## Version 0.5.40

VoteHub source update:
- Changed the blocked legacy source to VoteHub throughout the updater and data files.
- New VoteHub generic ballot source:
  - https://votehub.com/polls/?poll=generic_ballot_2026
  - Screenshot fallback: Democrats 49.0 / Republicans 42.3
- New VoteHub Trump approval source:
  - https://votehub.com/polls/?poll=trump_approval
  - Screenshot fallback: Approve 39.5 / Disapprove 57.3
- Added `scripts/sources/votehub.js`.
- Updated `scripts/update-polls.js` to run VoteHub with VoteHub.
- Updated the source order so VoteHub appears in the source order.
- Updated front-end/methodology text to say VoteHub with VoteHub.


## Version 0.5.41

VoteHub strict NOW-label extraction:
- Fixed VoteHub accepting wrong chart/tooltip values like:
  - Generic D 52 / R 48
  - Approval 46 / 52
- VoteHub now only accepts values from the right-side `NOW` label block.
- Correct screenshot fallback values:
  - Generic: D 49.0 / R 42.3
  - Approval: Approve 39.5 / Disapprove 57.3
- If the `NOW` label block is not readable, VoteHub uses the verified fallback instead of accepting random chart numbers.


## Version 0.5.42

Race to WH generic-ballot handling:
- Race to WH approval still scrapes live normally.
- Race to WH generic ballot is sometimes rendered as a visual chart/bar and not exposed in the page text.
- When text scraping cannot find the generic values, the source now uses a verified visual fallback instead of showing a broken scrape.
- Verified Race to WH generic fallback:
  - Generic D 48.1
  - Generic R 41.2
- New status:
  - `fallback`
- This keeps the source included and makes the terminal output clearer.


## Version 0.5.43

VoteHub fallback wording cleanup:
- VoteHub no longer reports a plain `fallback` when the strict NOW label scrape cannot read values.
- It now reports `fallback`.
- This makes the terminal output clearer because the fallback values are verified from screenshots:
  - Generic ballot: D 49.0 / R 42.3
  - Trump approval: Approve 39.5 / Disapprove 57.3
- VoteHub still attempts the strict NOW-label scrape first.


## Version 0.5.44

VoteHub SVG-summary extraction:
- VoteHub now reads the rendered SVG summary text nodes you found in DevTools.
- It targets text nodes with classes like:
  - `mouse-text fg summary`
- Example parsed labels:
  - `Approve: 39.5%`
  - `Disapprove: 57.3%`
  - `Democrats: 49.0%`
  - `Republicans: 42.3%`
- This should make VoteHub a real automated scrape instead of relying on screenshot fallback values.
- It still falls back safely if those SVG summary labels are not present.


## Version 0.5.45

Fallback cleanup:
- Removed the `fallback` wording.
- Removed screenshot-verification wording from current source notes.
- Scrapers now treat fallback as a simple backup only:
  - use live scraped data when available
  - use fallback only when no usable live data is found
- VoteHub still reads the rendered SVG summary labels first.
- Race to WH still attempts live scraping first.
- Fallback values remain in `data/manual-overrides.json`, but they are no longer described as verified/current values.


## Version 0.5.46

UI cleanup:
- Changed the generic ballot trend card placeholder text from `Adjusted using my algorithm` to `Change since last week`.
- This is only a placeholder label for now. The actual week-over-week calculation can be added in version 0.6.


## Version 0.6.0

First 0.6 history step:
- Added `data/polling-history.json`.
- `scripts/update-polls.js` now appends a dated history point every time the scraper runs.
- If the scraper runs more than once on the same day, that date is replaced instead of duplicated.
- Trend graphs now read from `data/polling-history.json` first, so the graph can grow as new daily or every-two-day points are collected.
- Existing estimated prototype points are preserved before automated collection begins.
- Added week-over-week calculation support:
  - generic ballot card uses change in Democratic margin
  - approval card uses change in net approval
- The 7-day comparison uses the oldest available stored point inside the last seven days, so it works with daily or every-two-day scraping.
