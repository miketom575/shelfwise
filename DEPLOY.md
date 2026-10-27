# Deploying to Vercel

One Vercel project serves everything: the React site from `frontend/dist` and the Express API as a serverless function (`api/index.js`) on the **same domain**. That keeps login cookies working with no CORS setup.

```
https://your-app.vercel.app/        → React site
https://your-app.vercel.app/api/*   → Express API (serverless) → MongoDB Atlas
```

## 1. Create the cloud database (MongoDB Atlas)
1. Sign up at mongodb.com/atlas and create a free **M0** cluster.
2. **Database Access** → Add Database User → choose a username and password (avoid special characters like `@` or `/`).
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`). Vercel uses changing IPs.
4. **Connect → Drivers** → copy the connection string and add the database name:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/library_management?retryWrites=true&w=majority`

## 2. Sample data loads itself
You do **not** need to run anything. The first time the deployed site talks to an empty database it creates the demo books, users and loans automatically (set `AUTO_SEED=false` to turn that off). The sample library has 300+ books. If your Atlas database was seeded earlier with only 40 books, the missing titles are added automatically on the next visit. `npm run seed` (with your Atlas string in `database/.env`) wipes and reloads everything, including the on-loan books and the demo suspended reader.

After the first visit, change the demo passwords or delete the demo accounts before sharing the link, because they are public.

## 3. Push the project to GitHub
Run these in the project root (the folder containing `vercel.json`):

```bash
git init
git add .
git commit -m "Shelfwise library system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/shelfwise.git
git push -u origin main
```

`.gitignore` already keeps `.env` files and `node_modules` out of GitHub. Never upload a `.env` file.

## 4. Import into Vercel
1. Sign in at vercel.com with GitHub → **Add New → Project** → pick the repository.
2. Leave **Root Directory** as the repository root. Framework Preset can stay **Other**; `vercel.json` already sets the install command, build command and output folder.
3. Open **Environment Variables** and add:

| Name | Value |
| --- | --- |
| `MONGODB_URI` | your Atlas string from step 1 |
| `JWT_SECRET` (recommended) | a long random string (generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |

Optional policy settings: `LOAN_DAYS`, `MAX_ACTIVE_LOANS`, `OVERDUE_SUSPEND_LIMIT`, `APPEAL_GRACE_DAYS`, `ADMIN_CAN_BORROW`, `ALLOW_ROLE_CHANGES`.

4. Click **Deploy**. When it finishes, open the URL and sign in.

Every `git push` to `main` redeploys automatically. If you change an environment variable, redeploy for it to take effect.

## Troubleshooting
| Symptom | Likely cause and fix |
| --- | --- |
| "The database is unavailable" (503) | Atlas Network Access doesn't allow `0.0.0.0/0`, or `MONGODB_URI` is wrong or has an unencoded special character in the password |
| Login fails with a generic server error | `JWT_SECRET` is missing in Vercel's environment variables |
| Empty catalog | `MONGODB_URI` isn't set in Vercel (or points to an unreachable database). Open `/api/health`: it should say `"database": "connected"` |
| Build fails at install | Make sure the repository root contains the root `package.json` with `workspaces`, and that `package-lock.json` was committed |
| Page refresh on `/catalog` gives 404 | `vercel.json` is missing from the repository root |

## Good to know
- Vercel's free Hobby plan is for non-commercial use, which suits a class project.
- The first request after a quiet period is slower (cold start plus database connection).
- Tests (`npm test`) run locally only. They are not part of the deployment.
