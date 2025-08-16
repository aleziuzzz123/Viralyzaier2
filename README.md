# Viralyzer 5.0 - Creatomate Integration Setup

Getting the Creatomate video editor working involves a few critical setup steps. Please follow these carefully to avoid common errors.

---

## 🚨 ATTENTION: The Final, Most Important Step 🚨

**Your secrets will not work until you do this!**

After you have set all your secrets in the Supabase Dashboard, you **MUST** redeploy the `creatomate-proxy` function. Secrets are only loaded when a function is deployed.

1.  Go to your Supabase Dashboard → **Edge Functions**.
2.  Click on the `creatomate-proxy` function.
3.  Click the **"Redeploy"** button in the top right corner.

This single step is the most common reason for setup failure.

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

**Remember to redeploy the function after setting these!**

---

## Troubleshooting

-   **Error: "Missing one or more secrets..."**
    -   This means you haven't set all four `CREATOMATE_...` secrets in Supabase for the function.
    -   **Solution:** You forgot to click **"Redeploy"** after setting the secrets.

-   **Error: "404 Not Found" or "The template with ID '...' was not found"**
    -   This means the Template ID is wrong, OR you haven't redeployed the function since setting it.
    -   **Solution:** 1) Double-check that your template ID is correct in Supabase secrets. 2) **Redeploy the function.** This is almost always the solution.