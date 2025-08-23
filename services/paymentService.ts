import { PlanId } from '../types';
import * as supabase from './supabaseService';

// This function now calls a Supabase Edge Function to create a Stripe checkout session
export const createCheckoutSession = async (planId: PlanId): Promise<{ checkoutUrl: string }> => {
    if (planId === 'free') {
        throw new Error("Cannot create a checkout session for a free plan.");
    }
    
    // Pass the client's origin in the body for the function to use.
    // This is more reliable than depending on the Origin header.
    const data = await supabase.invokeEdgeFunction<{ checkoutUrl: string }>('stripe-checkout', { 
        planId,
        origin: window.location.origin,
    });
    
    if (!data || !data.checkoutUrl) {
        console.error("The checkout function did not return a URL. Response:", data);
        throw new Error("The checkout function did not return a URL.");
    }
    
    return { checkoutUrl: data.checkoutUrl };
};
