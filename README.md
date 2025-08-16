# Viralyzer 5.0 - Creatomate Integration Setup

This guide will walk you through setting up the Creatomate and Supabase integrations. Please follow these steps carefully to avoid common errors.

---

## 🚨 Final Setup Checklist (Do This Last!) 🚨

This is the most important part of the setup. **Your integration will not work until you complete this checklist.**

- [ ] **Have you created all 3 separate templates (16:9, 9:16, 1:1) in Creatomate?**
- [ ] **Have you set all 4 `CREATOMATE_...` secrets in your Supabase function?**
- [ ] **Most Importantly: Have you successfully run the GitHub Action to deploy your functions AFTER setting the secrets?**

---

## 1. Vercel: Set Your Public Token (Frontend)

The frontend editor needs your Public Token to load.

1.  Go to your Creatomate dashboard → **Project Settings** → **API Integration**.
2.  Copy your **Public Token**.
3.  Go to your Vercel project's settings → **Environment Variables**.
4.  Add a new variable:
    - **Name**: `VITE_CREATOMATE_PUBLIC_TOKEN`
    - **Value**: Paste your token here.

## 2. Creatomate: Create Three Base Templates

This is the simplest and most reliable setup. Instead of using "Variants", you will create one template for each video format.

1.  **Create Your Main Template (16:9 Landscape):**
    -   Design your main video template in a **1280x720** or **1920x1080** format.
    -   For each scene, add placeholder elements and **name them exactly** as follows in the "Properties" panel:
        -   **Visuals:** `Scene-1-Visual`, `Scene-2-Visual`, etc.
        -   **Voiceovers:** `Scene-1-Voiceover`, `Scene-2-Voiceover`, etc.
        -   **On-Screen Text:** `Scene-1-OnScreenText`, `Scene-2-OnScreenText`, etc.
    -   Copy the **Template ID** from the URL bar. This is your `16:9` ID.

2.  **Duplicate for Vertical (9:16):**
    -   Duplicate your main template.
    -   Open the new copy and change its size to **1080x1920**.
    -   Adjust the layout of the elements to look good in a vertical format.
    -   Copy the **Template ID** from the URL bar. This is your `9:16` ID.

3.  **Duplicate for Square (1:1):**
    -   Duplicate your main template again.
    -   Open the new copy and change its size to **1080x1080**.
    -   Adjust the layout for a square format.
    -   Copy the **Template ID** from the URL bar. This is your `1:1` ID.

## 3. Supabase: Set Your Backend Secrets

The backend function (`creatomate-proxy`) needs your API Key and the three Template IDs.

1.  From Creatomate Project Settings, copy your **API Key**.
2.  Go to your Supabase project dashboard → **Edge Functions** → `creatomate-proxy` → **Secrets**.
3.  Add **four** secrets:
    -   `CREATOMATE_API_KEY`: Paste your API key.
    -   `CREATOMATE_TEMPLATE_169_ID`: Paste your **16:9 Landscape** template ID.
    -   `CREATOMATE_TEMPLATE_916_ID`: Paste your **9:16 Vertical** template ID.
    -   `CREATOMATE_TEMPLATE_11_ID`: Paste your **1:1 Square** template ID.

## 4. GitHub & Supabase: Set Up Automated Deployment

To fix the "Deployment Mismatch" error, you must deploy the latest version of your Supabase functions. This GitHub Action does it for you automatically and securely.

1.  **Create a Supabase Access Token:**
    -   Go to your Supabase Account -> [Access Tokens](https://supabase.com/dashboard/account/tokens).
    -   Generate a new token with a descriptive name (e.g., "GitHub Actions Deploy") and copy it.

2.  **Get Your Supabase Project ID:**
    -   Go to your Supabase project's **Settings** -> **General**.
    -   Copy the **Project ID**.

3.  **Add GitHub Secrets:**
    -   In your GitHub repository, go to **Settings** -> **Secrets and variables** -> **Actions**.
    -   Click **"New repository secret"** and create two secrets:
        -   `SUPABASE_ACCESS_TOKEN`: Paste your Supabase Access Token.
        -   `SUPABASE_PROJECT_ID`: Paste your Supabase Project ID.

4.  **Trigger the Deployment:**
    -   Commit and push any change to your `main` branch (or just push the new `.github/workflows/deploy.yml` file).
    -   Go to the **Actions** tab in your GitHub repository. You should see the "Deploy Supabase Functions" workflow running.
    -   Once it completes successfully, your functions will be up to date.

---

## Troubleshooting

-   **Error: "404 Not Found" or "The template with ID '...' was not found"**
    -   This means there is a mistake in your secret values. The function is running, but Creatomate is rejecting your keys.
    -   **Solution:**
        1.  **Check for Typos:** Carefully re-copy and re-paste your `CREATOMATE_API_KEY` and all three `CREATOMATE_TEMPLATE_*_ID` values into Supabase. Make sure there are no extra spaces.
        2.  **Check Project Mismatch (Most Common Cause):** Confirm that the API Key and all three Template IDs come from the **EXACT SAME** project in Creatomate. An API key from "Project A" cannot access templates in "Project B".
        3.  **Trigger the GitHub Action again** by pushing a small change to a file. The function's error message will now give you detailed debug info to help you find the mismatch.
