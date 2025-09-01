import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './types';
import Dashboard from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import ContentCalendar from './components/ContentCalendar';
import PricingPage from './components/PricingPage';
import UserMenu from './components/UserMenu';
import { LandingPage } from './components/Homepage';
import { DashboardIcon, CalendarIcon, GithubIcon, SparklesIcon, CheckCircleIcon, XCircleIcon, InfoIcon, ChartPieIcon, PhotoIcon, BellIcon, RocketLaunchIcon, WarningIcon, ScissorsIcon } from './components/Icons';
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
import { CreativeStudioNew as CreativeStudio } from './components/CreativeStudioNew';
import * as supabaseService from './services/supabaseService';

// Error Boundary Component - REMOVED TO ISOLATE REACT ERROR #310

type View = 'dashboard' | 'project' | 'calendar' | 'pricing' | 'channel' | 'assetLibrary' | 'autopilot' | 'settings' | 'kickoff';

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
        activeProjectDetails, isProjectDetailsLoading, setActiveProjectDetails,
        handleUpdateProject, addToast
    } = useAppContext();
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const isStudioActive = currentView === 'project' && activeProjectDetails?.workflowStep === 3;

    // TEMPORARY DEBUG: Force Creative Studio for testing
    const testModeRef = useRef(false);
    
    if (window.location.search.includes('test=shotstack') && !testModeRef.current) {
        testModeRef.current = true;
        console.log('🧪 PURE HTML/JS TEST MODE: Starting...');
        
        // Add timeout to prevent infinite loops
        setTimeout(() => {
            if (testModeRef.current) {
                console.log('🧪 Test mode timeout - preventing infinite loop');
                testModeRef.current = false;
            }
        }, 5000);
        
        try {
            const testProject = {
                id: 'test-' + Date.now(),
                name: 'Test Project',
                workflowStep: 3,
                videoSize: '16:9' as const,
                shotstackEditJson: null,
                script: null
            };
            console.log('🧪 PURE HTML/JS: Test project created:', testProject);
            
            // PURE HTML/JS VERSION - No React at all, just DOM manipulation
            return (
                <div className="min-h-screen bg-gray-900 text-white">
                    <div className="p-4 bg-green-900 text-center">
                        <h1 className="text-2xl font-bold">🧪 PURE HTML/JS TEST MODE</h1>
                        <p>If you see this, React is working without any context!</p>
                        <p className="text-sm mt-2">Project ID: {testProject.id}</p>
                    </div>
                    
                    {/* PURE HTML/JS - No React dependencies */}
                    <div className="p-8 text-center">
                        <h2 className="text-xl font-bold mb-4">Pure HTML/JS Test</h2>
                        <p className="mb-4">This bypasses ALL React rendering.</p>
                        <div className="bg-blue-900 p-4 rounded">
                            <p>Project: {testProject.name}</p>
                            <p>ID: {testProject.id}</p>
                            <p>Status: ✅ Working</p>
                        </div>
                        <button 
                            onClick={() => {
                                // Pure JavaScript alert
                                alert('Pure JS Button works! No React involved!');
                                console.log('🧪 Pure JS button clicked successfully');
                            }} 
                            className="mt-4 bg-white text-blue-900 px-4 py-2 rounded"
                        >
                            Test Pure JS Button
                        </button>
                        <div className="mt-4 p-4 bg-yellow-900 rounded">
                            <h3 className="font-bold">Pure JavaScript Test</h3>
                            <p>If you see this yellow box, React is rendering correctly.</p>
                            <p>If you see errors, the issue is in React itself.</p>
                        </div>
                    </div>
                </div>
            );
        } catch (error) {
            console.error('💥 Pure HTML/JS test mode failed:', error);
            return (
                <div className="bg-red-900 text-white p-8 text-center">
                    <h1 className="text-2xl font-bold mb-4">Pure HTML/JS Test Mode Failed</h1>
                    <p className="mb-4">Error: {String(error)}</p>
                    <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-4 py-2 rounded">
                        Reload Page
                    </button>
                </div>
            );
        }
    }

    useEffect(() => {
        if(activeProjectId) {
            setCurrentView('project');
        } else {
            if(currentView === 'project') {
                setCurrentView('dashboard');
            }
        }
    }, [activeProjectId, currentView]);

    const handleSetView = (view: View) => {
        if (view === 'pricing' && currentView === 'project') {
            // Do nothing to prevent navigation away from pricing when modal closes
        } else {
            setCurrentView(view);
        }
        if (view !== 'project' && view !== 'kickoff') {
            setActiveProjectId(null);
        }
    };

    const handleSelectProject = (projectId: string) => {
        setActiveProjectId(projectId);
    };
    
    const handleNewProject = () => {
        handleSetView('kickoff');
    };

    const handleGoToStudio = async () => {
        if (activeProjectId) {
            // A project is already active, just switch to studio view
            await handleUpdateProject(activeProjectId, { workflowStep: 3 });
            // The useEffect on activeProjectId already sets the view to 'project'
            // and the isStudioActive flag will become true.
        } else {
            // No active project, find the most recent one
            if (user) {
                addToast("Finding your most recent project...", "info");
                try {
                    const projects = await supabaseService.getProjectsForUser(user.id);
                    if (projects && projects.length > 0) {
                        const latestProject = projects[0];
                        // Setting this will trigger the useEffect to load details and set view to 'project'
                        setActiveProjectId(latestProject.id);
                        // Also ensure its workflow step is set to 3
                        await handleUpdateProject(latestProject.id, { workflowStep: 3 });
                    } else {
                        addToast("No projects found. Let's create one to get started!", "info");
                        handleSetView('kickoff');
                    }
                } catch (error) {
                    addToast("Failed to load your projects.", "error");
                }
            }
        }
    };

    const renderCurrentView = () => {
        if (!user) return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading_user')}</div>;
        
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
            case 'dashboard':
            default:
                return <Dashboard onSelectProject={handleSelectProject} onNewProject={handleNewProject} />;
        }
    };
    
    if (!session) {
        return <LandingPage />;
    }

    if (!user) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">{t('toast.loading')}</div>;
    }

    if (isStudioActive) {
        return <CreativeStudio />;
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
                        <button onClick={handleGoToStudio} className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${isStudioActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><ScissorsIcon className="w-5 h-5 inline mr-2"/>{t('nav.creative_studio')}</button>
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
          
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-7xl mx-auto h-full">{renderCurrentView()}</div>
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