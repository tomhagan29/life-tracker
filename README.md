This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

To populate the local SQLite database with repeatable demo data for reviewing
dashboards and insights, run:

```bash
npm run db:seed:dummy
```

The seed command recreates its own demo accounts, transactions, budgets, goals,
and habits without clearing unrelated local data.

## Desktop App

This project is configured as a Tauri desktop app. In development, run:

```bash
npm run desktop:dev
```

To build a distributable desktop app for the current operating system, run:

```bash
npm run desktop:build
```

The Tauri build runs `npm run tauri:prepare` first. That command creates the Next standalone server bundle, copies static assets and Prisma migrations, removes local `.env`/database files from the bundle, and copies the local Node runtime into `src-tauri/bin/` so the packaged app can run without asking your friend to install Node.

The packaged app stores its SQLite database in the user's application data folder. Local development still uses `dev.db` from the project root.

Linux build machines need the Tauri native prerequisites installed, including Rust/Cargo, WebKitGTK 4.1, and librsvg.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
