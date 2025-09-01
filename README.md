# Viralyzaier - Setup Guide (Shotstack Studio)

This guide walks you through setting up the application, which is now powered by the **Shotstack Studio SDK** for a rich, interactive editing experience and the Shotstack API for backend rendering.

---

## 1. API Keys: Sandbox vs. Production (Important!)

When developing your application, it is crucial to use your **Sandbox API Key** from the Shotstack Dashboard. The sandbox environment is free for rendering tests (videos will have a watermark) and will prevent accidental charges.

- **Action:** Set your **sandbox key** in the `SHOTSTACK_API_KEY` secret for the `shotstack-render` and `shotstack-status` Supabase functions.
- **Production Key:** Only use your **Production API Key** in your live, deployed application when you are ready to serve non-watermarked videos to your users.

## 2. Supabase: Set Up Your Backend Secrets

Your backend functions need secret keys to communicate with various services securely.

1.  Go to your Supabase Project Dashboard.
2.  Navigate to **Edge Functions**.
3.  For each function, go to its **Secrets** tab and add the following keys. You will need to create accounts for these services to get your keys.

    *   **For `shotstack-render` & `shotstack-status`:**
        *   `SHOTSTACK_API_KEY`: Your **secret** Shotstack API key (use your "stage" key for development, as mentioned above).
        *   `SHOTSTACK_API_BASE`: Set this to `https://api.shotstack.io/stage` for development.
        *   `SUPABASE_URL`: The URL of your Supabase project. This is crucial for constructing the webhook callback URL.

    *   **For `shotstack-webhook`:**
        *   `SUPABASE_URL`: The URL of your Supabase project.
        *   `SUPABASE_SERVICE_ROLE_KEY`: Your project's `service_role` key, found in your project's API settings.

    *   **For `gemini-proxy`, `ai-polish`, `ai-broll-generator`:**
        *   `GEMINI_API_KEY`: Your Google AI API Key.
    
    *   **For `ai-polish`, `elevenlabs-proxy`, etc.:**
        *   `ELEVENLABS_API_KEY`: Your ElevenLabs API Key.
    
    *   **For `pexels-proxy`:**
        *   `PEXELS_API_KEY`: Your Pexels API Key.
        
    *   **For `jamendo-proxy`:**
        *   `JAMENDO_CLIENT_ID`: Your Jamendo API Client ID.

    *   **For `giphy-proxy`:**
        *   `GIPHY_API_KEY`: Your Giphy API Key.
    
    *   ... (and other secrets for Stripe, Google OAuth, etc.)

4.  After setting or changing secrets, you **must redeploy** your Supabase Edge Functions for the changes to take effect.

---

## 3. Frontend: No Keys Required

The frontend application does not require any public API keys. The Shotstack Studio editor is initialized without a key, and all rendering calls are proxied securely through the `shotstack-render` Supabase function.

---

## Architectural Note: Editing, Rendering & Webhooks

-   **Shotstack Studio SDK:** All interactive video editing now happens in the browser. The SDK provides a fast, timeline-based experience.
-   **API-Based Rendering:** When a user is ready, the frontend sends the editor's final JSON state to the secure Supabase function (`shotstack-render`).
-   **Webhook Notifications:** The `shotstack-render` function tells the Shotstack API to send a notification to another secure function (`shotstack-webhook`) when the render is complete. This webhook function then updates the project's status in the database, which is pushed to the user's browser in real-time.

---

## Troubleshooting

-   **Editor Fails to Load:**
    -   Check the browser console for any errors related to the `@shotstack/shotstack-studio` package or the `asset-proxy` function. Ensure your dependencies are installed correctly.
-   **Rendering Fails with a 4xx/5xx Error:**
    -   This is likely an issue with the `shotstack-render` function. Check its logs in the Supabase dashboard. Ensure the `SHOTSTACK_API_KEY`, `SHOTSTACK_API_BASE` and `SUPABASE_URL` secrets are set correctly and that you have redeployed the function after setting them.
-   **Video Stays in "Rendering" State Forever:**
    -   This indicates the `shotstack-webhook` function may not have been called or has an error. Check its logs in the Supabase dashboard. Ensure the function has been deployed and its secrets are set.