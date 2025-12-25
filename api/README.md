# JP Quiz API (Render)

Express + Google Sheets API backend.

## What it does
- Login with **name + studentId** (your “account/password”)
- Pulls questions from your Google Sheet
- Stores progress + wrong-bank + resets in additional tabs inside the same spreadsheet
- Exports wrong-bank as PDF (note: to render Japanese/Chinese properly, you should provide a CJK font)

## Required env vars
See `.env.example`.

## Google Sheets permissions
1. Create a Google Cloud **Service Account** and enable **Google Sheets API**.
2. Share the spreadsheet with the service account email (Editor).

## Local run
```bash
npm i
cp .env.example .env
npm run dev
```

## Render deploy
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Add env vars from `.env.example`

## Data tabs created
- `Users`
- `Progress`
- `WrongBank`
- `Resets`

If you already created those tabs manually, the server will just reuse them.
