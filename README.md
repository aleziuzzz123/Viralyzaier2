# Viralyzer 5.0 - Setup Guide (Shotstack Studio)

This guide walks you through setting up the application, which is now powered by the **Shotstack Studio SDK** for a rich, interactive editing experience and the Shotstack API for backend rendering.

---

## 1. Supabase: Set Up Your Backend Secrets

Your backend functions need secret keys to communicate with various services securely.

1.  Go to your Supabase Project Dashboard.
2.  Navigate to **Edge Functions**.
3.  For each function, go to its **Secrets** tab and add the following keys. You will need to create accounts for these services to get your keys.

    *   **For `shotstack-render` & `shotstack-status`:**
        *   `SHOTSTACK_API_KEY`: Your **secret** Shotstack API key for rendering (use your "stage" key for development).
        
    *   **For `gemini-proxy`:**
        *   `GEMINI_API_KEY`: Your Google AI API Key.
    
    *   ... (and other secrets for Pexels, ElevenLabs, Stripe, etc.)

4.  After setting or changing secrets, you **must redeploy** your Supabase Edge Functions for the changes to take effect.

---

## 2. Frontend: No Keys Required

The frontend application does not require any public API keys. The Shotstack Studio editor is initialized without a key, and all rendering calls are proxied securely through the `shotstack-render` Supabase function.

---

## Architectural Note: Editing & Rendering

-   **Shotstack Studio SDK:** All interactive video editing now happens in the browser. The SDK provides a fast, timeline-based experience.
-   **API-Based Rendering:** When a user is ready, the frontend sends the editor's final JSON state to the secure Supabase function (`shotstack-render`). This function uses your secret Shotstack API key to submit the render job and returns a render ID.

---

## Troubleshooting

-   **Editor Fails to Load:**
    -   Check the browser console for any errors related to the `@shotstack/shotstack-studio` package. Ensure your dependencies are installed correctly.
-   **Rendering Fails with a 4xx/5xx Error:**
    -   This is likely an issue with the `shotstack-render` function. Check its logs in the Supabase dashboard. Ensure the `SHOTSTACK_API_KEY` secret is set correctly and that you have redeployed the function after setting it.