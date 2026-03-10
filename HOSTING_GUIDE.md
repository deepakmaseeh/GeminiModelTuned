# Hosting Guide: Auction AI on the Internet for Public Use

This guide covers how to host your Next.js Auction AI app for public use: **Option 1 (GCP)** and **Option 2 (best free alternative)**. It considers environment variables, Vertex AI access, SSL, domains, cost, and security.

---

## Overview

| Aspect | Option 1: GCP (Cloud Run) | Option 2: Vercel (free tier) |
|--------|---------------------------|------------------------------|
| **Best for** | Production, full control, same cloud as Vertex AI | Quick public demo, zero cost, minimal setup |
| **Cost** | Pay per use (free tier + usage) | Free (Hobby) for personal/non-commercial |
| **Vertex AI** | Same GCP project; minimal latency | Works; credentials via env var |
| **Custom domain** | Yes (Cloud Run + Load Balancer or Firebase Hosting) | Yes (Vercel) |
| **SSL** | Automatic (HTTPS) | Automatic (HTTPS) |

---

# Option 1: Google Cloud Platform (GCP) – Recommended for production

Running the app on **Google Cloud Run** keeps everything in GCP: your Vertex AI endpoint, service account, and app are in one project. Good for production, scaling, and custom domains.

## 1.1 Prerequisites

- **Google Cloud project** (same as your Vertex AI: e.g. `gemini-auction-ai`)
- **Billing enabled** (Cloud Run and Vertex AI use the same project; you pay for both)
- **gcloud CLI** installed and logged in: [Install gcloud](https://cloud.google.com/sdk/docs/install)
- **Docker** installed (for local image build) or use Cloud Build

Required APIs:

```bash
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## 1.2 GCP: Service account and Vertex AI

Your app needs a service account that can call Vertex AI.

1. **Use existing or create a service account**  
   IAM & Admin → Service Accounts → create (e.g. `auction-ai-app`).

2. **Grant Vertex AI access**  
   Add role: **Vertex AI User** (`roles/aiplatform.user`) so it can call your endpoint.

3. **Create and download a JSON key**  
   Keys → Add key → Create new key → JSON. Save the file securely (e.g. `sa-key.json`). **Do not commit it.**

4. **Optional (more secure):** Use **Workload Identity** or **Secret Manager** instead of a key in the image; see §1.8.

## 1.3 Next.js config for Cloud Run

Cloud Run runs a single process. Use the **standalone** output so Next.js produces a self-contained build.

Create or update **`next.config.js`** in the project root:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};
module.exports = nextConfig;
```

Then run `npm run build`. The `.next/standalone` folder will contain the runnable app.

## 1.4 Dockerfile for Cloud Run

Create **`Dockerfile`** in the project root:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

Cloud Run expects the app to listen on `PORT` (default 8080). Next.js standalone uses `server.js` in the standalone folder.

## 1.5 Environment variables on Cloud Run

Do **not** bake the service account JSON into the image. Use **Cloud Run environment variables and Secret Manager** (or env vars only for non-secrets).

**Option A – Env vars only (simplest):**

- In Cloud Run → Edit & deploy new revision → Variables & secrets:
  - `PROJECT_ID` = your GCP project ID
  - `VERTEX_LOCATION` = e.g. `us-central1`
  - `VERTEX_ENDPOINT_ID` = your endpoint ID
  - `GCP_SERVICE_ACCOUNT_KEY` = paste the **full JSON** of the service account key (mark as secret if the UI allows)

**Option B – Secret Manager (recommended for production):**

1. Store the key in Secret Manager:
   ```bash
   gcloud secrets create auction-ai-sa-key --data-file=./sa-key.json
   ```
2. Grant Cloud Run’s service account access to the secret.
3. In Cloud Run → Variables & secrets → Reference secret: `auction-ai-sa-key` as `GCP_SERVICE_ACCOUNT_KEY`.

Your API route already supports `GCP_SERVICE_ACCOUNT_KEY` (parsed JSON); it does not need a file path when this is set.

## 1.6 Deploy to Cloud Run

**Using Cloud Build (no local Docker needed):**

```bash
# Set your project and region
export PROJECT_ID=gemini-auction-ai
export REGION=us-central1

# Build and deploy from source (Cloud Build will use a Dockerfile if present)
gcloud run deploy auction-ai \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated
```

If you build the image locally and push to Artifact Registry:

```bash
# Build
docker build -t us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/auction-ai:latest .

# Push (first create the repo)
gcloud artifacts repositories create cloud-run-source-deploy --repository-format=docker --location=$REGION
docker push us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/auction-ai:latest

# Deploy
gcloud run deploy auction-ai \
  --image us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/auction-ai:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated
```

After deployment, set the env vars (and optional secret) in the Cloud Run console for that service.

**Public access:** `--allow-unauthenticated` makes the service public. For production, add IAP or another auth layer if you need to restrict who can use the app.

## 1.7 Custom domain and SSL (GCP)

- **Cloud Run URL:** `https://auction-ai-xxxxx-uc.a.run.app` (HTTPS by default).
- **Custom domain:**  
  Cloud Run → Manage custom domains → Add mapping (e.g. `app.yourdomain.com`). You’ll get DNS records to add at your registrar. SSL is managed by Google.

For a single global URL and optional CDN, put **Cloud Run behind a Load Balancer** and attach a managed SSL cert. See [Cloud Run custom domains](https://cloud.google.com/run/docs/mapping-custom-domains).

## 1.8 Cost and quotas (GCP)

- **Cloud Run:** Free tier includes 2 million requests/month; then pay per request and CPU/memory time. See [Cloud Run pricing](https://cloud.google.com/run/pricing).
- **Vertex AI:** You already pay for your endpoint/model usage; hosting the app on GCP does not change Vertex AI billing.
- **Best practice:** Set a budget alert in Billing and, if needed, cap Cloud Run max instances to control cost.

## 1.9 Security checklist (GCP)

- Do not commit `sa-key.json` or any file with the key; use `.gitignore`.
- Prefer Secret Manager over plain env for `GCP_SERVICE_ACCOUNT_KEY`.
- Use a dedicated service account for the app with only **Vertex AI User** (and any other minimal roles).
- For production, consider VPC, private Cloud Run (no `--allow-unauthenticated`), and IAP or your own auth.

---

# Option 2: Vercel (best free alternative)

Vercel is the simplest way to get the app on the internet for free (Hobby plan). It works well with Next.js and only needs the same env vars you use locally (with the key as JSON string).

## 2.1 Prerequisites

- **GitHub (or GitLab/Bitbucket)** account
- **Vercel** account: [vercel.com](https://vercel.com) (sign up with GitHub for easy deploys)
- Code pushed to a Git repository (do **not** commit `.env.local` or any key file)

## 2.2 Deploy steps (Vercel)

1. **Import project**  
   Vercel → Add New → Project → Import your repo. Vercel will detect Next.js.

2. **Build settings**  
   Keep defaults: Build Command `npm run build`, Output Directory `.next`. Root Directory blank unless the app is in a subfolder.

3. **Environment variables**  
   In Project → Settings → Environment Variables, add:

   | Name | Value | Notes |
   |------|--------|--------|
   | `PROJECT_ID` | Your GCP project ID | e.g. `gemini-auction-ai` |
   | `VERTEX_LOCATION` | Vertex AI region | e.g. `us-central1` |
   | `VERTEX_ENDPOINT_ID` | Your endpoint ID | e.g. `2482537826332180480` |
   | `GCP_SERVICE_ACCOUNT_KEY` | **Full JSON** of service account key | Paste entire contents of your `.json` key file; mark as Sensitive |

   Optional (if you ever switch to publisher model instead of endpoint):
   - `GEMINI_MODEL` = e.g. `gemini-1.5-flash`
   - `VERTEX_MODEL` = full resource name, if using a model ID

4. **Deploy**  
   Click Deploy. After the build, the app is live at `https://your-project.vercel.app`.

   - Home: `https://your-project.vercel.app/`
   - Auction AI chat: `https://your-project.vercel.app/gemini-test`

## 2.3 Custom domain and SSL (Vercel)

- **Vercel domain:** `*.vercel.app` with automatic HTTPS.
- **Custom domain:** Project → Settings → Domains → Add (e.g. `auction-ai.yourdomain.com`). Follow the DNS instructions. SSL is automatic (Let’s Encrypt).

## 2.4 Vercel free tier (Hobby) – important limits

- **Use case:** Personal / non-commercial only (see Vercel terms).
- **Function duration:** 10 s default; can be increased to 60 s in project settings (needed if Vertex AI sometimes takes longer).
- **Bandwidth and invocations:** Generous for small projects; see [Vercel limits](https://vercel.com/docs/limits/overview).
- **No persistent storage:** Session/history in the app is client-side (e.g. `localStorage`); no server-side DB on free tier unless you add an external one.

Your Vertex AI usage is billed by **Google Cloud** (same as when running locally); Vercel does not charge for calling your GCP endpoint.

## 2.5 Security (Vercel)

- Never commit `.env.local` or the service account JSON. Use Vercel’s Environment Variables (Sensitive) for `GCP_SERVICE_ACCOUNT_KEY`.
- Restrict the service account in GCP to **Vertex AI User** only.
- For production or commercial use, consider Vercel Pro and review [Vercel security](https://vercel.com/docs/security).

---

# Comparison and recommendation

| Criteria | GCP (Cloud Run) | Vercel (free) |
|----------|------------------|---------------|
| **Setup time** | Longer (Docker, config, env/secrets) | Short (connect repo, add env, deploy) |
| **Cost** | Pay per use after free tier | Free for Hobby (non-commercial) |
| **Vertex AI** | Same project; low latency | Same API; credentials in env |
| **Custom domain** | Yes (Cloud Run or Load Balancer) | Yes (built-in) |
| **SSL** | Yes | Yes |
| **Scaling** | Auto (Cloud Run) | Auto (Vercel) |
| **Best for** | Production, full control, same cloud as Vertex | Demos, side projects, quick public share |

**Suggested approach:**

- **Public demo / testing / personal:** Use **Vercel** (Option 2) for zero cost and minimal setup.
- **Production / business / long-term:** Use **GCP Cloud Run** (Option 1) and consider Secret Manager, custom domain, and budget alerts.

---

# Checklist before going public

- [ ] **Env vars:** `PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID`, and either `GCP_SERVICE_ACCOUNT_KEY` (JSON) or, on GCP only, a key file path with correct permissions.
- [ ] **Vertex AI:** Endpoint (or model) is in the same project and region; service account has **Vertex AI User**.
- [ ] **Secrets:** No keys or `.env.local` in Git; use platform env/secrets only.
- [ ] **Function timeout:** If using Vercel, set serverless function max duration to 60 s if needed for slow Vertex responses.
- [ ] **Public access:** Decide if the app is open to everyone or behind auth (e.g. IAP on GCP, or your own login).
- [ ] **Budget:** GCP budget alerts for both Vertex AI and, if used, Cloud Run.

---

# Quick reference

**GCP (Cloud Run)**  
- Add `output: 'standalone'` in `next.config.js`, add `Dockerfile`, set env (or Secret Manager) in Cloud Run, then `gcloud run deploy --source .` (or deploy from image).  
- Docs: [Deploy Next.js to Cloud Run](https://cloud.google.com/run/docs/quickstarts/frameworks/deploy-nextjs-service)

**Vercel**  
- Push to GitHub → Import in Vercel → Add env vars (`PROJECT_ID`, `VERTEX_LOCATION`, `VERTEX_ENDPOINT_ID`, `GCP_SERVICE_ACCOUNT_KEY`) → Deploy.  
- See also: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) in this repo.

Both options give you a public HTTPS URL; only the platform and cost model differ.
