# Viralyzer 5.0 - Creatomate Integration Setup

To enable the new video editing features powered by Creatomate, you need to configure your environment. Follow these steps carefully.

---

## ✅ Final Setup Checklist

1.  [ ] Add **`VITE_CREATOMATE_PUBLIC_TOKEN`** to your Vercel Environment Variables.
2.  [ ] Create a **Base Template** in your Creatomate project.
3.  [ ] **Name the elements** in your Base Template correctly.
4.  [ ] **Create and name the Variants** for different video sizes.
5.  [ ] Add the **two required secrets** to your Supabase project: `CREATOMATE_API_KEY` and `CREATOMATE_BASE_TEMPLATE_ID`.
6.  [ ] **REDEPLOY YOUR SUPABASE `creatomate-proxy` FUNCTION** after setting secrets. This is the most common reason for errors.

---

## 1. Add Public Token to Vercel (Frontend)

Your **Public Token** is required for the frontend editor to load.

1.  Go to your Creatomate dashboard -> **Project Settings** -> **API Integration**.
2.  Copy your **Public Token**.
3.  Go to your Vercel project's settings -> **Environment Variables**.
4.  Add a new variable named `VITE_CREATOMATE_PUBLIC_TOKEN` and paste your token as the value.

## 2. Create & Configure Your Base Template in Creatomate

The application works by programmatically modifying a "base template" that you design.

### Step 2A: Name Your Dynamic Elements
1.  In your Creatomate project, create a new template (e.g., in 16:9 format).
2.  Design it with placeholders for each scene. The **names of these elements must be exact.**
3.  Select an element, go to the "Properties" panel on the right, and set its **Name**.

    - **Visual Placeholders (Required):** Create `video` or `image` elements.
        - `Scene-1-Visual`, `Scene-2-Visual`, ...up to `Scene-10-Visual`

    - **Voiceover Placeholders (Required):** Create `text` elements (you can place these off-screen).
        - `Scene-1-Voiceover`, `Scene-2-Voiceover`, ...up to `Scene-10-Voiceover`
        
    - **On-Screen Text Placeholders (Recommended):** Create `text` elements.
        - `Scene-1-OnScreenText`, `Scene-2-OnScreenText`, ...up to `Scene-10-OnScreenText`

### Step 2B: Create and Name Template Variants (CRITICAL)
To support different video sizes, you must create variants.

1.  With your master template open, find the **Template** section in the right-hand panel.
2.  Click on the **Size** property (e.g., "1920px x 1080px").
3.  From the dropdown, select **Manage Variants**.
4.  Create a new variant for the **9:16 vertical format** (1080x1920).
5.  **Crucially, name this variant exactly `Vertical`**.
6.  Create another new variant for the **1:1 square format** (1080x1080).
7.  **Name this variant exactly `Square`**.
8.  Adjust the layout for your 'Vertical' and 'Square' variants so they look good.
9.  Save the template.

## 3. Add Secrets to Supabase (Backend)

The backend function needs your API Key and Template ID. **These are the ONLY two secrets required for the `creatomate-proxy` function.**

1.  From your Creatomate editor, copy the **Template ID** from the URL bar.
2.  From Creatomate Project Settings, copy your main **API Key**.
3.  Go to your Supabase project dashboard -> **Edge Functions** -> **Secrets**.
4.  Add a secret named `CREATOMATE_BASE_TEMPLATE_ID` with your template ID.
5.  Add another secret named `CREATOMATE_API_KEY` with your API key.
6.  **Triple-check for typos and extra spaces!**

---

## 🚨 CRITICAL TROUBLESHOOTING STEP (READ THIS) 🚨

**After setting or changing your Supabase secrets, you MUST redeploy your Edge Functions.**

Secrets are injected at deploy time. If you don't redeploy, your function will continue to run with old or empty environment variables, causing a **"Function is not configured"** error.

### How to Redeploy (The Final Fix):
1.  Go to your Supabase Dashboard.
2.  Navigate to the **Edge Functions** section.
3.  Click on the `creatomate-proxy` function.
4.  Click the **"Redeploy"** button in the top right.

This will resolve most initialization errors. If the problem persists, check the function's **Logs** tab in Supabase for a more specific error message.