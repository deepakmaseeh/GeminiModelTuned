# Deploy to Vercel

## 1. Push your code to GitHub

Make sure your project is in a Git repo and pushed to GitHub (or GitLab/Bitbucket). Do **not** commit `.env.local` or any file with real credentials.

## 2. Import project in Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New** → **Project**.
3. Import your repository.
4. Vercel will detect Next.js. Keep the default settings (Build Command: `next build`, Output Directory: `.next`).

## 3. Environment variables

In your Vercel project, go to **Settings** → **Environment Variables** and add:

| Variable | Value | Notes |
|----------|--------|--------|
| `PROJECT_ID` | Your GCP project ID | e.g. `gemini-auction-ai` |
| `VERTEX_LOCATION` | Vertex AI region | e.g. `us-central1` |
| `VERTEX_ENDPOINT_ID` | Your endpoint ID | e.g. `2482537826332180480` |
| `GCP_SERVICE_ACCOUNT_KEY` | **Full JSON** of your service account key | Required on Vercel (no file path) |

### How to set the service account credential (GCP_SERVICE_ACCOUNT_KEY)

On Vercel there is no file system, so you cannot use a path like `GOOGLE_APPLICATION_CREDENTIALS`. Instead you pass the **whole JSON** as one environment variable.

1. **Get your service account JSON file**  
   From Google Cloud Console: **IAM & Admin** → **Service Accounts** → select the account → **Keys** → **Add key** → **Create new key** → JSON. Download the file (e.g. `my-project-xxxx.json`).

2. **Open the file** in a text editor. It looks like this:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "your-sa@your-project.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "..."
   }
   ```

3. **Copy the entire JSON** (from the first `{` to the last `}`). Do not change or minify it; newlines inside the key are fine.

4. **In Vercel:** **Project** → **Settings** → **Environment Variables** → **Add**:
   - **Name:** `GCP_SERVICE_ACCOUNT_KEY`
   - **Value:** paste the full JSON you copied
   - **Environments:** Production (and Preview if you use it)
   - **Sensitive:** turn on so the value is encrypted and hidden

5. **Redeploy** so the new variable is applied. The API route reads this env var and uses it for authentication instead of a key file.

**Local development:** Keep using `.env.local` with `GOOGLE_APPLICATION_CREDENTIALS` pointing to the path of the same JSON file (e.g. `C:\path\to\your-key.json`). Do not put the JSON content in `.env.local` unless you want to use `GCP_SERVICE_ACCOUNT_KEY` locally too.

Optional (if you use model ID instead of endpoint):

- `VERTEX_MODEL` – Full resource name, e.g. `projects/.../locations/.../models/...`
- `GEMINI_MODEL` – e.g. `gemini-1.5-flash` (only if not using endpoint/model above)

**Do not** set `GOOGLE_APPLICATION_CREDENTIALS` on Vercel; the app uses `GCP_SERVICE_ACCOUNT_KEY` there.

## 4. Deploy

Click **Deploy**. After the build finishes, your app will be live at `https://your-project.vercel.app`.

- Home: `https://your-project.vercel.app/`
- Auction AI: `https://your-project.vercel.app/gemini-test`

## 5. Local vs Vercel

- **Local:** Use `.env.local` with `GOOGLE_APPLICATION_CREDENTIALS` pointing to your key file.
- **Vercel:** Use Environment Variables in the dashboard with `GCP_SERVICE_ACCOUNT_KEY` set to the full JSON string. The API route reads this when no key file path is available.

---

## Optional: Other things you can add

- **Copy / Export:** Copy last response or export the full chat as `.txt` or `.md` (Copy button is already in the header).
- **Clear chat:** Start a new conversation (Clear button in the header).
- **Dark mode:** Toggle theme and persist in `localStorage`.
- **Keyboard shortcuts:** e.g. Enter to send, Shift+Enter for new line.
- **Session history:** Store past analyses in `localStorage` and show a list to resume.
- **Retry on error:** Retry button when a request fails.
- **Model info:** Show in the sidebar which endpoint/model is used (e.g. from an API that returns config).
- **Rate limits:** Show a message when you hit Vertex AI quotas.
