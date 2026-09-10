# panban — portfolio

Personal portfolio for **Panashe Banhire** — web app developer, WordPress developer and
computer engineer in Harare, Zimbabwe. Live at <https://panban.netlify.app>.

The site is a single static page listing every project I have built, sourced from my GitHub.

## Structure

```
index.html            the whole page
assets/css/style.css  styles (light + dark, no framework)
assets/js/app.js      project rendering, search, filters, theme, GitHub sync
data/projects.json    the project list — edit this to change the portfolio
```

No build step, no dependencies. It is plain HTML, CSS and JavaScript.

## Editing projects

Everything shown in the Projects section comes from `data/projects.json`. Each entry:

```json
{
  "name": "interviewly",              // GitHub repo name (used to match the live API)
  "title": "Interviewly",             // heading on the card
  "description": "…",                 // one or two sentences
  "category": "apps",                 // apps | sites | business | labs
  "stack": ["TypeScript", "Vercel"],  // first four are shown as tags
  "language": "TypeScript",
  "private": true,                    // true hides the code link, shows "Private repository"
  "repo": null,                       // repo URL, or null when private
  "live": "https://…",                // live URL, or null
  "created": "2026-07-29",
  "updated": "2026-08-13"             // cards are sorted by this, newest first
}
```

Categories map to the filter chips: `apps` (Apps & Products), `sites` (Websites),
`business` (Client & Business), `labs` (Experiments).

## Staying current

On load the page also calls the public GitHub API for `iAmPanBan`. Public repositories
already in `projects.json` get their push date, links and visibility refreshed, and any
new public repository is appended automatically. Private repositories are never returned
by that API, so they are only ever described by `data/projects.json`. If the API is
unreachable or rate limited, the bundled data is used unchanged.

## Running locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. A server is needed because the page fetches
`data/projects.json`; opening the file directly with `file://` will not work.
