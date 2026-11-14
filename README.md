# monee — Personal Finance

A simple, responsive personal-finance dashboard built from the v1 PRD. Track income and expenses, see where money goes, check a monthly budget, and import or export transactions.

## Features

- Monthly balance, income, expenses, and savings summary
- Spending-by-category breakdown and six-month cash-flow chart
- Quick-add transactions, searchable and filterable activity, and delete/undo
- Editable monthly budget with 80% and 100% threshold alerts
- CSV import with column mapping and preview, plus CSV export
- INR defaults, sample transactions, and browser-local persistence

## Run locally

Open `index.html` in a modern browser, or serve this folder with any static web server.

## Prototype and privacy

This is a front-end prototype. Sample transactions and budget settings are stored in the browser's local storage; there is no authentication, server-side database, bank connection, or cross-device sync. Do not enter real or sensitive financial information.

## Files

- `index.html` — dashboard layout
- `styles.css` — responsive styling
- `app.js` — dashboard interactions, sample data, storage, and CSV workflows
