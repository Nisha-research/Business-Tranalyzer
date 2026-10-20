# Business Tranalyzer

Business Tranalyzer is a static, browser-based expense and transaction tracker built with HTML, CSS, and vanilla JavaScript. It helps track business income/expenses, review charts, and view a forecasting dashboard without any backend service.

## Features

- Add, edit, delete, and undo transactions
- Track totals: balance, income, expenses, and pending amounts
- Vendor/category, invoice, product/bill, due-date, and status tracking
- Recurring transactions (weekly, monthly, quarterly, yearly, custom interval)
- Attachment support (receipt/invoice file preview with size limits)
- Filtered transaction views
- CSV import/export for backup and restore workflows
- Chart views in tracker + full analytics/forecast dashboard
- Dashboard navigation state passed via `sessionStorage`

## Project structure

```text
Business-Tranalyzer/
├── index.html
├── expense-tracker.html
├── expense-style.css
├── expense-script.js
├── dashboard.html
├── assets/
│   └── favicon.svg
└── .github/workflows/
    └── deploy-pages.yml
```

## Entry point

- Production entry point: `index.html`
- `index.html` redirects to `expense-tracker.html` using a relative URL suitable for GitHub Pages project paths.

## Run locally

No build step is required.

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

## Data storage, privacy, and limitations

- Transaction data is stored in browser `localStorage`.
- Temporary dashboard handoff state is stored in `sessionStorage`.
- There is no backend, account system, authentication, or external database.
- Data stays on the current browser profile/device.
- Clearing browser/site data or switching devices will not transfer existing transactions.
- Use CSV export regularly to keep backups.

## Backup guidance

- Use **Export CSV** to back up your transactions.
- Keep exported files in a safe location.
- Use **Import CSV** to restore data in the same or a different browser/device.

## GitHub Pages deployment

This repository includes `.github/workflows/deploy-pages.yml` for static Pages deployment (no build step).

### Workflow behavior

- Triggers on pushes to `main`
- Supports manual `workflow_dispatch`
- Uses official GitHub Pages actions:
  - `actions/configure-pages`
  - `actions/upload-pages-artifact`
  - `actions/deploy-pages`

### One-time repository setup

1. Go to **Settings → Pages** in this repository.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
4. Wait for **Deploy to GitHub Pages** to complete successfully.
5. Open the published URL shown in the workflow run.

## Notes

- This is a client-side application; forecast output is informational and not financial advice.
- Chart.js and Papa Parse are loaded from CDN.
