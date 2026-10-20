# Business-Tranalyzer

A browser-based business transaction tracker and analytics dashboard for recording income, expenses, pending payments, recurring transactions, and business trends.

## Live application

Once GitHub Pages is enabled for this repository, open the published site at:

`https://nisha-research.github.io/Business-Tranalyzer/`

The application entry point is `index.html`, which redirects visitors to the transaction tracker.

## Features

### Transaction management

- Add income and expense transactions.
- Record descriptions, amounts, vendors/stores, transaction type, payment status, dates, due dates, currencies, invoice numbers, and product or bill IDs.
- Edit or delete existing transactions.
- Undo a recently deleted transaction.
- Mark transactions as paid or pending.
- Add recurring transaction schedules: weekly, monthly, quarterly, yearly, or custom intervals.
- Attach a small receipt or invoice image/PDF to a transaction.
- Manage the vendor list from the interface.

### Import and export

- Export transaction data to CSV.
- Import transaction data from CSV.
- Export the currently filtered transaction list.
- Data is stored locally in the browser with `localStorage`; no backend or account is required.

### Analytics dashboard

- View total balance, income, expenses, and pending amounts.
- Filter transactions by all transactions, income, or expenses.
- Display bar and pie charts using Chart.js.
- Open the full analytics dashboard from the chart view.
- Analyze income, expenses, and balance by week, month, quarter, or year.
- Review category breakdowns and income-versus-expense comparisons.
- Generate forecast projections with trend, average, standard deviation, and confidence-bound information.
- Use the sample-data and forecast-debug tools to test the dashboard.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | GitHub Pages entry point that opens the tracker. |
| `expense-tracker.html` | Main transaction tracker interface. |
| `expense-script.js` | Transaction logic, local persistence, CSV handling, charts, and dashboard navigation. |
| `expense-style.css` | Responsive styling for the tracker and chart views. |
| `dashboard.html` | Analytics, comparison charts, and forecasting dashboard. |
| `expense-script.js.bak` | Backup file retained from the original project. |

## Run locally

Because this is a static browser application, it can be opened directly in a browser. For the most reliable local behavior, serve the repository with a small local web server:

```bash
# From the repository directory
python -m http.server 8000
