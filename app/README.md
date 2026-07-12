# Paper Trail App

The `app` directory contains the Next.js App Router application.

## Development

```bash
npm install
npm run dev
```

### Running with Docker

```bash
docker compose up --build
```

## Build

```bash
npm run build
npm start
```

## Structure

```
app/
├── api/
│   └── audit/
├── globals.css
├── layout.tsx
└── page.tsx
```

## Notes

- UI is implemented using the Next.js App Router.
- Audit requests are handled by `/api/audit`.
- Client-side audit history is stored locally.

## Features

- Installable Progressive Web App
- Docker Compose support
- AI invoice auditing
- Local audit history
- Interactive analytics
- Example invoices for demonstrations
