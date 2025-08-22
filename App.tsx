
import React, { useState, useEffect, useContext } from 'react';
import { AuthProvider, AuthContext, AuthDispatchableAction } from './context/AuthContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { UIProvider } from './context/UIContext.tsx';
import { supabase } from './services/supabaseClient.ts';
import type { Session, Plan, Client } from './types.ts';
import { SalesPage } from './components/SalesPage.tsx';
import { Oto1Page } from './components/Oto1Page.tsx';
import { Oto2Page } from './components/Oto2Page.tsx';
import { Oto3Page } from './components/Oto3Page.tsx';
import { AuthPage } from './components/AuthPage.tsx';
import { Dashboard } from './components/Dashboard.tsx';

type FlowState = 'sales' | 'oto1' | 'oto2' | 'oto3' | 'app' | 'auth';
type PostAuthAction = { planToUpgrade: Plan, nextFlowState: 'oto2' | 'oto3' | 'app' };

// The AppContent component contains the main routing logic and accesses context.
const AppContent: React.FC<{
    setGuestPlan: (plan: Plan | null) => void;
    setPendingUpgradePlan: (plan: Plan | null) => void;
}> = ({ setGuestPlan, setPendingUpgradePlan }) => {
    const { state, dispatch: authDispatch } = useContext(AuthContext);
    const { user } = state;

    const [flowState, setFlowState] = useState<FlowState>(() => user ? 'app' : 'sales');
    const [postAuthAction, setPostAuthAction] = useState<PostAuthAction | null>(null);
    const [impersonatingClient, setImpersonatingClient] = useState<Client | null>(null);

    // Effect to handle navigation after authentication and for user state changes (logout)
    useEffect(() => {
        if (user) {
            if (postAuthAction) {
                // User just logged in to complete an upgrade
                authDispatch({ type: 'UPGRADE_PLAN_REQUEST', payload: postAuthAction.planToUpgrade });
                setFlowState(postAuthAction.nextFlowState);
                setPostAuthAction(null);
                setPendingUpgradePlan(null);
            } else if (flowState === 'auth' || flowState === 'sales') {
                // User is logged in but on a logged-out page, redirect to app
                setFlowState('app');
            }
        } else {
            // User is logged out, reset to sales page.
            setFlowState('sales');
            setImpersonatingClient(null);
        }
    }, [user, postAuthAction, authDispatch, setPendingUpgradePlan, flowState]);
    
    // Handler for logged-out users who click an upgrade button.
    const handleRequireAuth = (action: PostAuthAction) => {
        setPostAuthAction(action);
        setPendingUpgradePlan(action.planToUpgrade);
        setFlowState('auth');
    };

    const handleLoginAsClient = (client: Client) => {
        setImpersonatingClient(client);
        window.scrollTo(0, 0);
    };

    const handleLogoutClientView = () => {
        setImpersonatingClient(null);
    };

    const renderFlow = () => {
        const dashboard = <Dashboard impersonatingClient={impersonatingClient} onLoginAsClient={handleLoginAsClient} onLogoutClientView={handleLogoutClientView} onNavigate={setFlowState} />;

        if (user) {
            // --- LOGGED-IN USER FLOW ---
            switch (flowState) {
                case 'oto1':
                    return <Oto1Page onUpgrade={() => { authDispatch({ type: 'UPGRADE_PLAN_REQUEST', payload: 'unlimited' }); setFlowState('oto2'); }} onDecline={() => setFlowState('oto2')} />;
                case 'oto2':
                    return <Oto2Page onUpgrade={() => { authDispatch({ type: 'UPGRADE_PLAN_REQUEST', payload: 'dfy' }); setFlowState('oto3'); }} onDecline={() => setFlowState('oto3')} />;
                case 'oto3':
                    return <Oto3Page onUpgrade={() => { authDispatch({ type: 'UPGRADE_PLAN_REQUEST', payload: 'agency' }); setFlowState('app'); }} onDecline={() => setFlowState('app')} />;
                case 'app':
                default:
                    return dashboard;
            }
        } else {
            // --- LOGGED-OUT USER FLOW ---
            switch (flowState) {
                case 'sales':
                    return <SalesPage onPurchaseClick={() => setFlowState('oto1')} onDashboardClick={() => setFlowState('auth')} />;
                case 'oto1':
                    return <Oto1Page onUpgrade={() => handleRequireAuth({ planToUpgrade: 'unlimited', nextFlowState: 'oto2' })} onDecline={() => setFlowState('oto2')} />;
                case 'oto2':
                    return <Oto2Page onUpgrade={() => handleRequireAuth({ planToUpgrade: 'dfy', nextFlowState: 'oto3' })} onDecline={() => setFlowState('oto3')} />;
                case 'oto3':
                    return <Oto3Page onUpgrade={() => handleRequireAuth({ planToUpgrade: 'agency', nextFlowState: 'app' })} onDecline={() => { setGuestPlan('basic'); setFlowState('app'); }} />;
                case 'auth':
                    return <AuthPage />;
                case 'app': // Guest mode
                default:
                    return dashboard;
            }
        }
    };
    
    return renderFlow();
};


// The main App component manages session state and provides contexts.
const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [guestPlan, setGuestPlan] = useState<Plan | null>(null);
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<Plan | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) { // User logged out
        setGuestPlan(null);
        setPendingUpgradePlan(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoadingSession) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#1A0F3C]">
             <svg className="animate-spin h-10 w-10 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  return (
    <AuthProvider session={session} guestPlan={guestPlan} pendingUpgradePlan={pendingUpgradePlan}>
        <UIProvider>
            <DataProvider>
                <AppContent setGuestPlan={setGuestPlan} setPendingUpgradePlan={setPendingUpgradePlan} />
            </DataProvider>
        </UIProvider>
    </AuthProvider>
  );
};

export default App;
