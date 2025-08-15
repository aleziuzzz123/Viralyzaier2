# Viralyzer 5.0 - Creatomate Integration Setup

Getting the Creatomate video editor working involves a few critical setup steps. Please follow these carefully to avoid common errors.

---

## 🚨 Final Setup Checklist (Most Common Errors)

Before you deploy, quickly check these common failure points:

1.  [ ] **`VITE_CREATOMATE_PUBLIC_TOKEN`**: Is it set correctly in your **Vercel** Environment Variables?
2.  [ ] **Creatomate Template Variants**: Does your template have variants named **exactly** `Vertical` and `Square` (case-sensitive)?
3.  [ ] **Supabase Secrets**: Are `CREATOMATE_API_KEY` and `CREATOMATE_BASE_TEMPLATE_ID` set in your Supabase project's secrets?
4.  [ ] **Function Redeployment (CRITICAL!)**: Did you **redeploy the `creatomate-proxy` function** in Supabase *after* setting the secrets? If you forget this step, your function will fail.

---

## 1. Vercel: Set Your Public Token (Frontend)

The frontend editor needs your Public Token to load.

1.  Go to your Creatomate dashboard → **Project Settings** → **API Integration**.
2.  Copy your **Public Token**.
3.  Go to your Vercel project's settings → **Environment Variables**.
4.  Add a new variable:
    - **Name**: `VITE_CREATOMATE_PUBLIC_TOKEN`
    - **Value**: Paste your token here.

## 2. Creatomate: Configure Your Base Template

The app works by programmatically changing a "base template" that you design.

### Step 2A: Name Your Dynamic Elements
1.  In your Creatomate project, open your main template (e.g., in 16:9 format).
2.  For each scene, you need placeholders. **The names must be exact.**
3.  Select an element, go to the "Properties" panel, and set its **Name**.

    - **Visuals (Required):** Use `video` or `image` elements.
        - `Scene-1-Visual`, `Scene-2-Visual`, ..., `Scene-10-Visual`

    - **Voiceovers (Required):** Use `text` elements (you can place these off-screen).
        - `Scene-1-Voiceover`, `Scene-2-Voiceover`, ..., `Scene-10-Voiceover`
        
    - **On-Screen Text (Recommended):** Use `text` elements.
        - `Scene-1-OnScreenText`, `Scene-2-OnScreenText`, ..., `Scene-10-OnScreenText`

### Step 2B: Create Template Variants (CRITICAL)
For vertical and square videos, you must create variants.

1.  In your template editor, find the **Template** section in the right-hand panel.
2.  Click **Manage Variants** next to the template size.
3.  Create a new variant for the **9:16 vertical format** (1080x1920) and name it **exactly `Vertical`**.
4.  Create another variant for the **1:1 square format** (1080x1080) and name it **exactly `Square`**.
5.  Adjust the layouts for the 'Vertical' and 'Square' variants to look good.
6.  Save the template.

## 3. Supabase: Set Your Backend Secrets

The backend function (`creatomate-proxy`) needs your API Key and Template ID.

1.  From your Creatomate editor, copy the **Template ID** from the URL bar.
2.  From Creatomate Project Settings, copy your **API Key**.
3.  Go to your Supabase project dashboard → **Edge Functions** → **Secrets**.
4.  Add two secrets:
    - **Name**: `CREATOMATE_BASE_TEMPLATE_ID`
    - **Value**: Paste your template ID.
    - **Name**: `CREATOMATE_API_KEY`
    - **Value**: Paste your API key.

> **💡 Important Note:** You recently provided a new API key (`d879c80a...`). Please ensure this is the exact key you have set for `CREATOMATE_API_KEY` in your Supabase secrets. An incorrect key will cause a `401 Unauthorized` error.

---

## 🚀 The Final Step: Redeploy Your Function!

**This is the most common reason for setup failure.** Secrets are only applied when a function is deployed.

1.  Go to your Supabase Dashboard.
2.  Navigate to the **Edge Functions** section.
3.  Click on the `creatomate-proxy` function.
4.  Click the **"Redeploy"** button in the top right corner.

This will resolve most initialization errors. If problems persist, check the function's **Logs** tab in Supabase for specific error messages.