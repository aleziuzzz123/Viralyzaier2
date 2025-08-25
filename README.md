# Viralyzer 5.0 - Setup Guide (Shotstack Studio)

This guide walks you through setting up the application, which is now powered by the **Shotstack Studio SDK** for a rich, interactive editing experience and the Shotstack API for backend rendering.

---

## 1. Supabase: Set Up Your Backend Secrets

Your backend functions need secret keys to communicate with various services securely.

1.  Go to your Supabase Project Dashboard.
2.  Navigate to **Edge Functions**.
3.  For each function, go to its **Secrets** tab and add the following keys. You will need to create accounts for these services to get your keys.

    *   **For ALL Shotstack Functions (`shotstack-studio-token`, `shotstack-render`, `shotstack-status`):**
        *   `SHOTSTACK_API_KEY`: Your **production** Shotstack API key. This is the **only** Shotstack key you need. It is used for both Studio authentication and backend rendering.
        *   `SUPABASE_URL`: The URL of your Supabase project. This is crucial for constructing the webhook callback URL.
        *   **IMPORTANT**: Make sure you have removed any old keys like `SHOTSTACK_STUDIO_KEY` or `SHOTSTACK_SANDBOX_KEY` from your secrets to avoid confusion.

    *   **For `shotstack-webhook`:**
        *   `SUPABASE_URL`: The URL of your Supabase project.
        *   `SUPABASE_SERVICE_ROLE_KEY`: Your project's `service_role` key, found in your project's API settings.

    *   **For `gemini-proxy`, `ai-polish`, `ai-broll-generator`:**
        *   `GEMINI_API_KEY`: Your Google AI API Key.
    
    *   **For `ai-polish`, `elevenlabs-proxy`, etc.:**
        *   `ELEVENLABS_API_KEY`: Your ElevenLabs API Key.
    
    *   ... (and other secrets for Pexels, Jamendo, Giphy, Stripe, Google OAuth, etc.)

4.  After setting or changing secrets, you **must redeploy** your Supabase Edge Functions for the changes to take effect.

---

## 2. Frontend: No Keys Required

The frontend application does not require any public API keys. The Shotstack Studio editor is initialized by calling a secure Supabase function to get a session token, and all rendering calls are proxied securely through the `shotstack-render` Supabase function.

---

## 3. Architectural Note: Editing, Rendering & Webhooks

-   **Shotstack Studio SDK:** All interactive video editing now happens in the browser. The SDK is initialized with a short-lived token fetched from our secure `shotstack-studio-token` function.
-   **API-Based Rendering:** When a user is ready, the frontend sends the editor's final JSON state to the secure Supabase function (`shotstack-render`).
-   **Webhook Notifications:** The `shotstack-render` function tells the Shotstack API to send a notification to another secure function (`shotstack-webhook`) when the render is complete. This webhook function then updates the project's status in the database, which is pushed to the user's browser in real-time.

---

## 4. Troubleshooting

-   **Editor Fails to Load on "Authenticating...":**
    -   This is an authentication token issue. Check the browser's Network tab for a call to `/functions/v1/shotstack-studio-token`.
    -   If it returns a 404, the function is not deployed correctly.
    -   If it returns a 500 error, check the function's logs in the Supabase dashboard. The most common cause is a missing `SHOTSTACK_API_KEY` secret.
-   **Rendering Fails with a 4xx/5xx Error:**
    -   This is likely an issue with the `shotstack-render` function. Check its logs in the Supabase dashboard. Ensure the `SHOTSTACK_API_KEY` and `SUPABASE_URL` secrets are set correctly and that you have redeployed the function after setting them.
-   **Video Stays in "Rendering" State Forever:**
    -   This indicates the `shotstack-webhook` function may not have been called or has an error. Check its logs in the Supabase dashboard. Ensure the function has been deployed and its secrets are set.