# Run on another laptop (after GitHub pull)

The hall list comes from **`npm run db:seed`**, not from old files in Git.
Do **not** rely on copying `prisma/dev.db` unless you intentionally want a full DB snapshot.

## One-time fix (recommended)

```powershell
cd path\to\findyourspot
git pull
npm install
npx prisma migrate deploy
npx prisma generate
npm run db:seed
npm run dev
```

You should see in the terminal: **`Seed OK — 23 halls`**.

Open http://localhost:3000 and press **Ctrl+F5** on the halls page.

## If you still see old halls ("Lecture Hall A", etc.)

Your laptop is still using an **old database file**. Reset it:

```powershell
cd path\to\findyourspot
git pull
npm install
npm run db:reset
npm run dev
```

`db:reset` wipes the local DB, reapplies migrations, and runs seed automatically.

## Create `.env` if missing

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="any-long-random-string-for-dev"
```

## Demo logins (after seed)

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@findyourspot.edu | Admin1!demo |
| Customer | customer@findyourspot.edu | Customer1!demo |

## On the main laptop (stop pushing old DB)

If `prisma/dev.db` was committed before, remove it from Git (keep local file):

```powershell
git rm --cached prisma/dev.db
git add .gitignore prisma/seed.ts
git commit -m "Stop tracking dev.db; force-remove stale halls in seed"
git push
```

Then on the other laptop: `git pull` → `npm run db:reset`.
