# Viralyzer 5.0 - Creatomate Integration Setup

To enable the new video editing features powered by Creatomate, you need to configure three important variables. Follow these steps carefully.

## ✅ Setup Checklist

1.  [ ] Add **Public Token** to `index.html`.
2.  [ ] Create a **Base Template** in your Creatomate project.
3.  [ ] **Crucially, name the dynamic elements** in your template exactly as specified below.
4.  [ ] Add the **Base Template ID** to your Supabase Secrets.

---

## 1. Add Creatomate Public Token to `index.html`

Your **Public Token** is required for the frontend editor to load.

1.  Go to your Creatomate dashboard.
2.  Navigate to **Project Settings** in the top left menu.
3.  Go to the **API Integration** tab.
4.  Copy your **Public Token**.
5.  Open the `index.html` file in this project.
6.  Find the line `VITE_CREATOMATE_PUBLIC_TOKEN: 'YOUR_CREATOMATE_PUBLIC_TOKEN_HERE',` and replace the placeholder with your actual token.

## 2. Create Your Base Template in Creatomate

The application works by programmatically modifying a "base template" that you design. This is the most critical step.

1.  In your Creatomate project, create a new, blank template.
2.  Design it with placeholders for each scene. **The names of these elements are very important and must be exact.**
3.  For a script with up to 10 scenes, you must create dynamic elements with the following names. You can do this by selecting an element, going to the "Properties" panel on the right, and setting its **Name**.

    - **Visual Placeholders (Required):** Create a dynamic `video` or `image` element for each scene. Name them:
        - `Scene-1-Visual`
        - `Scene-2-Visual`
        - `Scene-3-Visual`
        - ...up to `Scene-10-Visual`

    - **Voiceover Placeholders (Required):** Create a dynamic `text` element for each scene to hold the voiceover script. Name them:
        - `Scene-1-Voiceover`
        - `Scene-2-Voiceover`
        - ...up to `Scene-10-Voiceover`
        
    - **On-Screen Text Placeholders (Recommended):** Create another dynamic `text` element for on-screen captions or titles. Name them:
        - `Scene-1-OnScreenText`
        - `Scene-2-OnScreenText`
        - ...up to `Scene-10-OnScreenText`

4.  Arrange these elements on the timeline as you see fit. The content will be replaced by the AI script.
5.  Save the template.

## 3. Add Base Template ID to Supabase Secrets

The backend function needs to know which template to use as a base.

1.  From the Creatomate editor, copy the **Template ID** from the URL bar. Your latest ID is `cfc99fd1-c34a-4935-b3e4-3defd28dcd28`.
2.  Go to your Supabase project dashboard.
3.  Navigate to **Edge Functions** -> **Secrets**.
4.  Click **Add new secret**.
5.  Enter the name `CREATOMATE_BASE_TEMPLATE_ID`.
6.  Paste your copied template ID as the value.
7.  Save the secret.

Once these steps are complete, the Creative Studio will be fully functional.