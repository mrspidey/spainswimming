# SpainSwimming static site

This is the simplest possible version for Cloudflare Pages:

- no framework
- no build step
- CSV lives in `data/spain_boys_2014_results_master.csv`
- updating that CSV and pushing to GitHub updates the site after Cloudflare Pages redeploys

## Files
- `index.html`
- `styles.css`
- `app.js`
- `data/spain_boys_2014_results_master.csv`

## How to deploy on Cloudflare Pages
1. Create a GitHub repo, for example `spainswimming`.
2. Upload all files from this folder to the repo root.
3. In Cloudflare Pages choose **Create project** > **Connect to Git**.
4. Select the repo.
5. Use **No build command** and output directory `/` because this is a static site.
6. If the project name `spainswimming` is available, the default Pages subdomain should be `spainswimming.pages.dev`.
7. Future CSV updates are just:
   - replace `data/spain_boys_2014_results_master.csv`
   - commit
   - push
   - Cloudflare redeploys automatically

## Current data note
The bundled CSV is Spain-ready in schema, but currently populated with the validated Valencia 2025/26 season-to-date results for boys born in 2014.

## Next upgrade path
If you later want accounts, shared parent watchlists, admin review of swimmer merges, or federation-by-federation uploads, the next step is:
- React/Next.js frontend
- Supabase backend
- alias review table
