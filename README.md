# Business Tranalyzer

Business Tranalyzer is a browser-based business expense and transaction tracking application built with HTML, CSS, and JavaScript.

It helps users record income and expenses, monitor balances, track pending payments, visualize financial data, and generate basic business forecasts.

## Live deployment

After GitHub Pages is enabled, the application will be available from the repository's **Settings → Pages** section.

The application starts from `index.html` and opens the main tracker.

## Features

- Add income and expense transactions.
- Track total balance, income, expenses, and pending amounts.
- Categorize transactions by vendor or store.
- Add dates, due dates, invoice numbers, and product or bill IDs.
- Mark transactions as paid or pending.
- Support INR, USD, and EUR currencies.
- Add recurring transactions:
  - Weekly
  - Monthly
  - Quarterly
  - Yearly
  - Custom intervals
- Edit and delete transactions.
- Undo recently deleted transactions.
- Filter transactions by:
  - All
  - Income
  - Expense
- Import transactions from CSV files.
- Export transactions to CSV files.
- Attach receipts or invoices.
- View bar and pie charts.
- Open a detailed analytics dashboard.
- Compare income and expenses over time.
- Review category-based spending.
- Generate simple forecast projections.
- Store data locally in the browser.
- Responsive layout for desktop, tablet, and mobile devices.

## Project files

| File | Description |
| --- | --- |
| `index.html` | GitHub Pages entry point. |
| `expense-tracker.html` | Main transaction tracker interface. |
| `expense-style.css` | Application styling and responsive layout. |
| `expense-script.js` | Transaction logic, storage, CSV handling, attachments, and charts. |
| `dashboard.html` | Analytics and forecast dashboard. |
| `.github/workflows/deploy-pages.yml` | GitHub Pages deployment workflow. |

## Running locally

This project does not require a build process.

Run a local server from the repository directory:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Technology stack

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js
- Papa Parse
- GitHub Actions
- GitHub Pages

## Data storage

Business Tranalyzer stores transaction information in the browser using `localStorage` and `sessionStorage`.

There is currently no backend database or user account system. Data may be lost if browser storage is cleared or if the application is opened on another device.

Use the CSV export feature to create backups of important transaction data.

## Forecasting

The dashboard provides a lightweight forecast based on historical transaction values, average values, trend calculations, standard deviation, and present-data adjustments.

Forecast results are estimates and should not be treated as financial advice.

## Deployment

The GitHub Actions workflow deploys the project to GitHub Pages whenever changes are pushed to the `main` branch.

To enable deployment:

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Select **Pages**.
4. Set the source to **GitHub Actions**.
5. Open the **Actions** tab.
6. Confirm that the **Deploy to GitHub Pages** workflow completes successfully.

## Limitations

- Data is stored only in the browser.
- There is no authentication system.
- There is no server-side synchronization.
- Forecast results are estimates.
- Chart.js and Papa Parse are loaded from external CDNs.

## License

No license has been added to this repository yet.
