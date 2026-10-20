# Business Tranalyzer

Business Tranalyzer is a browser-based business finance and transaction tracker built with HTML, CSS, and vanilla JavaScript. It helps individuals and small businesses record income and expenses, monitor balances, review spending patterns, and analyze financial trends through interactive charts.

## Features

- Add, edit, delete, and undo transactions.
- Track total balance, income, expenses, and pending amounts.
- Categorize transactions by vendor or store.
- Record due dates, invoice numbers, product or bill IDs, and payment status.
- Support INR, USD, and EUR currencies.
- Create recurring transactions using weekly, monthly, quarterly, yearly, or custom intervals.
- Attach receipt or invoice files within the application's size limits.
- Filter transactions by all, income, or expense.
- Import and export transaction data using CSV files.
- View bar and pie charts for transaction summaries.
- Use the analytics dashboard for trends, category breakdowns, income-versus-expense comparisons, and forecast projections.
- Responsive interface for desktop, tablet, and mobile devices.

## Project structure

```text
Business-Tranalyzer/
├── index.html                    # GitHub Pages entry point
├── expense-tracker.html          # Main transaction tracker
├── expense-style.css             # Application styles
├── expense-script.js             # Application logic and browser storage
├── dashboard.html                # Analytics and forecasting dashboard
├── assets/
│   └── favicon.svg               # Application favicon
└── .github/workflows/
    └── deploy-pages.yml          # GitHub Pages deployment workflow
```

## Live project

Repository: [Nisha-research/Business-Tranalyzer](https://github.com/Nisha-research/Business-Tranalyzer)

The production entry point is `index.html`. When GitHub Pages is enabled, it redirects visitors to `expense-tracker.html` using a relative URL so the application works correctly from a GitHub Pages project path.

## Run locally

No build process is required. Start a local static server from the repository directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Data storage and privacy

Business Tranalyzer is a client-side application. Transaction data is stored in the current browser using `localStorage`, while temporary dashboard navigation data uses `sessionStorage`.

There is no backend, authentication system, user account, or external database. Clearing browser site data, changing browsers, or switching devices will not transfer saved transactions automatically.

Use **Export CSV** regularly to create backups. CSV files can be imported later on the same or another device.

## GitHub Pages deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

To enable deployment:

1. Open the repository's **Settings** page.
2. Select **Pages**.
3. Set the source to **GitHub Actions**.
4. Push changes to the `main` branch or run the deployment workflow manually from the **Actions** tab.
5. Open the published URL shown in the successful workflow run.

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js
- Papa Parse
- GitHub Actions
- GitHub Pages

## Limitations

- Data is stored locally in the browser.
- Forecast values are informational estimates, not financial advice.
- Chart.js and Papa Parse are loaded from CDN resources.
- No server-side synchronization is currently provided.

## License

No license has been specified for this repository.
