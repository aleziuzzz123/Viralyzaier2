import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './types';
import Dashboard from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import ContentCalendar from './components/ContentCalendar';
import PricingPage from './components/PricingPage';
import UserMenu from './components/UserMenu';
import { LandingPage } from './components/Homepage';
import { DashboardIcon, CalendarIcon, GithubIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChartPieIcon, PhotoIcon, BellIcon, RocketLaunchIcon, WarningIcon } from './components/Icons';
import ChannelHub from './components/ChannelHub';
import AssetLibrary from './components/AssetLibrary';
import { AppProvider, useAppContext } from './contexts/AppContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import NotificationsPanel from './components/NotificationsPanel';
import Autopilot from './components/Autopilot';
import Settings from './components/Settings';
import ScheduleModal from './components/ScheduleModal';
import UpgradeModal from './components/UpgradeModal';
import ConfirmationModal from './components/ConfirmationModal';
import ProjectKickoff from './components/ProjectKickoff';
import Loader from './components/Loader';
import CreativeStudio from './components/CreativeStudio';
import LegalPages from './components/LegalPages';

// import FinalShotstackStudio from './components/FinalShotstackStudio'; // Temporarily disabled
import SimpleShotstackStudio from './components/SimpleShotstackStudio';
import MinimalShotstackTest from './components/MinimalShotstackTest';
import WorkingShotstackStudio from './components/WorkingShotstackStudio';


type View = 'dashboard' | 'project' | 'calendar' | 'pricing' | 'channel' | 'assetLibrary' | 'autopilot' | 'settings' | 'kickoff' | 'privacy' | 'terms' | 'cookies' | 'refund';

const BackendErrorModal: React.FC = () => {
    const { backendError, clearBackendError, t } = useAppContext();

    if (!backendError) return null;
    
    const isTimeoutError = backendError.message.toLowerCase().includes('timed out');
    
    return (
         <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]" 
            onClick={clearBackendError}
            role="dialog"
            aria-modal="true"
            aria-labelledby="backend-error-modal-title"
        >
            <div 
                className="bg-gray-800 border border-red-500/50 rounded-2xl shadow-2xl w-full max-w-2xl m-4 p-8 text-center transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={clearBackendError} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <XCircleIcon className="w-8 h-8"/>
                </button>
                <div className="mx-auto bg-red-900/50 border border-red-500/50 p-3 rounded-full w-fit mb-6">
                   <WarningIcon className="w-10 h-10 text-red-400" />
                </div>
                <h2 id="backend-error-modal-title" className="text-2xl font-bold text-white mb-3">{backendError.title}</h2>
                <p className="text-gray-300 mb-6">
                    {t('backend_error.description')}
                </p>
                <div className="mt-4 text-left bg-gray-900 p-4 rounded-md">
                    <p className="text-sm text-gray-400 font-semibold">{t('backend_error.server_error_details')}</p>
                    <p className="mt-4 text-sm text-red-300 font-mono bg-red-900/50 p-2 rounded">
                        {backendError.message}
                    </p>
                    {isTimeoutError ? (
                        <div className="mt-4 text-sm text-amber-300 bg-amber-900/50 p-3 rounded-lg">
                            <p className="font-bold">What does this mean?</p>
                            <p className="mt-2 text-amber-200">
                               The server took too long to respond to a request. This can happen due to high traffic or a temporary issue. Please try refreshing the page in a few moments.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 text-sm text-amber-300 bg-amber-900/50 p-3 rounded-lg">
                            <p className="font-bold">{t('backend_error.how_to_fix_title')}</p>
                            <p className="mt-2 text-amber-200">
                               {t('backend_error.how_to_fix_intro')}
                            </p>
                            <ul className="list-disc list-inside mt-2 text-amber-200 text-xs space-y-1">
                                <li>{t('backend_error.how_to_fix_step1')}</li>
                                <li>{t('backend_error.how_to_fix_step2')}</li>
                                <li>{t('backend_error.how_to_fix_step3')}</li>
                                <li>{t('backend_error.how_to_fix_step4')}</li>
                            </ul>
                        </div>
                    )}
                </div>
                <button
                    onClick={clearBackendError}
                    className="w-full max-w-xs mx-auto mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all"
                >
                    {t('backend_error.close_button')}
                </button>
            </div>
        </div>
    );
};

interface ToastComponentProps {
    toast: Toast;
    onDismiss: (id: number) => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast, onDismiss]);

    const icons = {
        success: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
        error: <XCircleIcon className="w-6 h-6 text-red-400" />,
        info: <InfoIcon className="w-6 h-6 text-blue-400" />,
    };

    return (
        <div className="toast bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 flex items-center space-x-4 max-w-sm">
            <div className="flex-shrink-0">{icons[toast.type]}</div>
            <div className="flex-grow">
                <p className="text-gray-200 text-sm font-medium">{toast.message}</p>
                <div className="bg-gray-700 h-1 rounded-full mt-2">
                    <div className="bg-indigo-500 h-1 rounded-full animate-progress-bar"></div>
                </div>
            </div>
        </div>
    );
};

const MainApp = () => {
    const { 
        session, user,
        toasts, dismissToast, activeProjectId, setActiveProjectId,
        t,
        confirmation, handleConfirmation, handleCancelConfirmation,
        activeProjectDetails, isProjectDetailsLoading
    } = useAppContext();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isStudioEditor, setIsStudioEditor] = useState(false);

    useEffect(() => {
        // Check if we're on the studio-editor route
        const isStudioRoute = window.location.pathname === '/studio-editor';
        setIsStudioEditor(isStudioRoute);
        
        // Handle all page routes - only run on initial load or URL changes
        const path = window.location.pathname;
        if (path === '/privacy') {
            setCurrentView('privacy');
        } else if (path === '/terms') {
            setCurrentView('terms');
        } else if (path === '/cookies') {
            setCurrentView('cookies');
        } else if (path === '/refund') {
            setCurrentView('refund');
        } else if (path === '/dashboard') {
            setCurrentView('dashboard');
        } else if (path === '/autopilot') {
            setCurrentView('autopilot');
        } else if (path === '/calendar') {
            setCurrentView('calendar');
        } else if (path === '/channel') {
            setCurrentView('channel');
        } else if (path === '/asset-library') {
            setCurrentView('assetLibrary');
        } else if (path === '/settings') {
            setCurrentView('settings');
        } else if (activeProjectId) {
            setCurrentView('project');
        }
    }, [activeProjectId]); // Removed currentView from dependencies to prevent conflicts

    // Switch to project view when project details are loaded
    useEffect(() => {
        console.log('🔄 Project view check:', { activeProjectId, hasActiveProjectDetails: !!activeProjectDetails, isProjectDetailsLoading, currentView });
        if (activeProjectId && activeProjectDetails && !isProjectDetailsLoading) {
            console.log('✅ Switching to project view from:', currentView);
            setCurrentView('project');
        }
    }, [activeProjectId, activeProjectDetails, isProjectDetailsLoading, currentView]);

    // Listen for URL changes (for browser back/forward buttons)
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path === '/privacy') {
                setCurrentView('privacy');
            } else if (path === '/terms') {
                setCurrentView('terms');
            } else if (path === '/cookies') {
                setCurrentView('cookies');
            } else if (path === '/refund') {
                setCurrentView('refund');
            } else if (path === '/dashboard') {
                setCurrentView('dashboard');
            } else if (path === '/autopilot') {
                setCurrentView('autopilot');
            } else if (path === '/calendar') {
                setCurrentView('calendar');
            } else if (path === '/channel') {
                setCurrentView('channel');
            } else if (path === '/asset-library') {
                setCurrentView('assetLibrary');
            } else if (path === '/settings') {
                setCurrentView('settings');
            } else if (path === '/studio-editor') {
                setIsStudioEditor(true);
            } else {
                setIsStudioEditor(false);
                if (activeProjectId) {
                    setCurrentView('project');
                } else {
                    setCurrentView('dashboard');
                }
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [activeProjectId]);

    const handleSetView = (view: View) => {
        if (view === 'pricing' && currentView === 'project') {
            // Do nothing to prevent navigation away from pricing when modal closes
        } else {
            setCurrentView(view);
            
            // Update URL for all views
            if (view === 'privacy') {
                window.history.pushState({}, '', '/privacy');
            } else if (view === 'terms') {
                window.history.pushState({}, '', '/terms');
            } else if (view === 'cookies') {
                window.history.pushState({}, '', '/cookies');
            } else if (view === 'refund') {
                window.history.pushState({}, '', '/refund');
            } else if (view === 'dashboard') {
                window.history.pushState({}, '', '/dashboard');
            } else if (view === 'autopilot') {
                window.history.pushState({}, '', '/autopilot');
            } else if (view === 'calendar') {
                window.history.pushState({}, '', '/calendar');
            } else if (view === 'channel') {
                window.history.pushState({}, '', '/channel');
            } else if (view === 'assetLibrary') {
                window.history.pushState({}, '', '/asset-library');
            } else if (view === 'settings') {
                window.history.pushState({}, '', '/settings');
            }
        }
        if (view !== 'project' && view !== 'kickoff') {
            setActiveProjectId(null);
        }
    };

    const handleSelectProject = (projectId: string) => {
        console.log('🎯 Project selected:', projectId);
        setActiveProjectId(projectId);
        // Don't immediately switch to project view - let the useEffect handle it
        // when activeProjectDetails is loaded
    };
    
    const handleNewProject = () => {
        handleSetView('kickoff');
    };

    const renderCurrentView = () => {
        console.log('🎨 Rendering view:', currentView, { activeProjectId, hasActiveProjectDetails: !!activeProjectDetails, isProjectDetailsLoading });
        
        // Allow legal pages to be accessible without authentication
        if (!user && !['privacy', 'terms', 'cookies', 'refund'].includes(currentView)) {
            return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading_user')}</div>;
        }
        
        // If we're on the studio-editor route, show the full-screen editor
        if (isStudioEditor) {
            // Check if we're inside an iframe
            console.log('🎬 Studio editor route detected');
            console.log('🎬 Window self:', window.self);
            console.log('🎬 Window top:', window.top);
            console.log('🎬 Is iframe:', window.self !== window.top);
            
            if (window.self !== window.top) {
                // We're inside an iframe, render the StudioPage component directly
                console.log('🎬 Rendering StudioPage component (inside iframe)');
                return <WorkingShotstackStudio />;
            } else {
                // We're in the main window, render the CreativeStudio component
                console.log('🎬 Rendering CreativeStudio component (main window)');
                return <CreativeStudio />;
            }
        }
        
        switch (currentView) {
            case 'project':
                if (isProjectDetailsLoading) {
                    return <div className="flex justify-center items-center h-64"><Loader /></div>;
                }
                if (activeProjectDetails) {
                    return <ProjectView project={activeProjectDetails} />;
                }
                handleSetView('dashboard'); 
                return null;
            case 'kickoff':
                return <ProjectKickoff onProjectCreated={handleSelectProject} onExit={() => handleSetView('dashboard')} />;
            case 'calendar':
                return <ContentCalendar />;
            case 'pricing':
                return <PricingPage />;
            case 'channel':
                return <ChannelHub />;
            case 'assetLibrary':
                return <AssetLibrary />;
            case 'autopilot':
                return <Autopilot />;
            case 'settings':
                return <Settings />;
            case 'privacy':
                return <LegalPages page="privacy" />;
            case 'terms':
                return <LegalPages page="terms" />;
            case 'cookies':
                return <LegalPages page="cookies" />;
            case 'refund':
                return <LegalPages page="refund" />;

            case 'dashboard':
            default:
                return <Dashboard 
                    onSelectProject={handleSelectProject} 
                    onNewProject={handleNewProject}
                />;
        }
    };
    
    // Show landing page for logged out users, except for legal pages
    if (!user && !['privacy', 'terms', 'cookies', 'refund'].includes(currentView)) {
        return <LandingPage />;
    }
    
    // For legal pages without authentication, show minimal layout
    if (!user && ['privacy', 'terms', 'cookies', 'refund'].includes(currentView)) {
        return (
            <div className="min-h-screen bg-gray-900 text-white">
                <div className="w-full max-w-7xl mx-auto">{renderCurrentView()}</div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            <header className="bg-black/30 border-b border-gray-700/50 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center space-x-6">
                    <a href="#" onClick={(e) => { e.preventDefault(); handleSetView('dashboard'); }} className="flex items-center space-x-2 text-white">
                        <SparklesIcon className="w-7 h-7 text-indigo-500" />
                        <span className="font-bold text-lg hidden sm:inline">{t('app.name')}</span>
                    </a>
                    <nav className="hidden md:flex items-center space-x-2">
                        <button onClick={() => handleSetView('dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'dashboard' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><DashboardIcon className="w-5 h-5 inline mr-2"/>{t('nav.dashboard')}</button>
                        <button onClick={() => handleSetView('autopilot')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'autopilot' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><RocketLaunchIcon className="w-5 h-5 inline mr-2"/>{t('nav.autopilot')}</button>
                        <button onClick={() => handleSetView('calendar')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><CalendarIcon className="w-5 h-5 inline mr-2"/>{t('nav.calendar')}</button>
                        <button onClick={() => handleSetView('channel')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'channel' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><ChartPieIcon className="w-5 h-5 inline mr-2"/>{t('nav.my_channel')}</button>
                        <button onClick={() => handleSetView('assetLibrary')} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${currentView === 'assetLibrary' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><PhotoIcon className="w-5 h-5 inline mr-2"/>{t('nav.asset_library')}</button>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <LanguageSwitcher variant="header" />
                    <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white" title={t('nav.powered_by')}><GithubIcon className="w-6 h-6" /></a>
                    <div className="relative">
                        <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="text-gray-400 hover:text-white relative" title={t('nav.notifications')}>
                            <NotificationsPanel onPanelToggle={setIsNotificationsOpen} />
                        </button>
                    </div>
                    <UserMenu onNavigate={handleSetView} />
                </div>
            </header>
          
            <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                <div className="w-full max-w-7xl mx-auto">{renderCurrentView()}</div>
            </main>
            
            <ScheduleModal />
            <UpgradeModal />
            {confirmation.isOpen && (
                <ConfirmationModal 
                    isOpen={confirmation.isOpen} 
                    onClose={handleCancelConfirmation} 
                    onConfirm={handleConfirmation} 
                    title={confirmation.title}
                >
                    {confirmation.message}
                </ConfirmationModal>
            )}

            <BackendErrorModal />
    
            {document.getElementById('toast-container') && createPortal(toasts.map(toast => <ToastComponent key={toast.id} toast={toast} onDismiss={dismissToast} />), document.getElementById('toast-container')!)}
        </div>
    );
};

function App() {
    return (
        <AppProvider>
            <MainApp />
        </AppProvider>
    )
}

export default App;