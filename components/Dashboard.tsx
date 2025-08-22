
import React, { useState, useCallback, useEffect, useContext } from 'react';
import Joyride, { Step, CallBackProps } from 'react-joyride';
import { InputForm } from './InputForm';
import { ScriptDisplay } from './ScriptDisplay';
import { getOptimizationTrace, analyzeScriptVirality, enhanceTopic, generateVisualsForScript, remixScript, QUOTA_ERROR_MESSAGE } from '../services/geminiService';
import type { Script, Client, Folder, User, Notification, EnhancedTopic, Trend, OptimizationStep, Plan } from '../types';
import { SavedScriptsView } from './SavedScriptsView';
import { TrendingTopicsView } from './TrendingTopicsView';
import { DFYContentView } from './DFYContentView.tsx';
import { AgencyView } from './AgencyView';
import { AddClientModal } from './AddClientModal';
import { DashboardHomeView } from './DashboardHomeView';
import { AccountSettingsView } from './AccountSettingsView';
import { NotificationsPanel } from './NotificationsPanel';
import { PlaceholderView } from './PlaceholderView';
import { SaveScriptModal } from './SaveScriptModal';
import { EditClientModal } from './EditClientModal';
import { ConfirmationModal } from './ConfirmationModal';
import { VideoDeconstructorView } from './VideoDeconstructorView';
import { PersonalizationModal } from './PersonalizationModal';
import { AuthContext } from '../context/AuthContext.tsx';
import { DataContext } from '../context/DataContext.tsx';
import { UIContext } from '../context/UIContext.tsx';
import { QuotaErrorModal } from './QuotaErrorModal';
import { supabase } from '../services/supabaseClient.ts';
import { AIOptimizerView } from './AIOptimizerView.tsx';
import { UpgradeModal } from './UpgradeModal.tsx';
import { CrownIcon } from './icons/CrownIcon.tsx';

interface DashboardProps {
    impersonatingClient: Client | null;
    onLoginAsClient: (client: Client) => void;
    onLogoutClientView: () => void;
    onNavigate: (state: 'sales' | 'oto1' | 'oto2' | 'oto3' | 'app' | 'auth') => void;
}

interface MenuItem {
    name: string;
    icon: string;
    requiredPlan?: Plan;
    hasNew?: boolean;
}

const kebabCase = (str: string) => str.toLowerCase().replace(/\s+/g, '-');

const tourSteps: Step[] = [
  {
    target: '#new-project-btn',
    content: "Welcome to Vid Script Hub! Click here to start a new project and generate your first AI-optimized script.",
    placement: 'bottom',
  },
  {
    target: `#${kebabCase('Trending Topics')}-nav`,
    content: "Don't know what to post? Visit the Trending Topics Hub to see what's currently going viral in any niche.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('DFY Content Vault')}-nav`,
    content: "Need content FAST? Our DFY Vault is packed with ready-to-use scripts, hooks, and more.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Video Deconstructor')}-nav`,
    content: "Found a viral video you love? Paste its YouTube URL here to 'steal' its secret formula.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Saved Scripts')}-nav`,
    content: "All your saved creations are kept here. You can organize them into folders for easy access.",
    placement: 'right',
  },
  {
    target: `#${kebabCase('Account Settings')}-nav`,
    content: "Finally, you can manage your account details and preferences here.",
    placement: 'right',
  },
];

const joyrideStyles = {
    options: {
        arrowColor: '#2A1A5E',
        backgroundColor: '#2A1A5E',
        primaryColor: '#DAFF00',
        textColor: '#F0F0F0',
        zIndex: 10000,
    },
    tooltip: {
        border: '1px solid #4A3F7A',
        borderRadius: '8px'
    },
    buttonClose: { color: '#F0F0F0' },
    buttonNext: {
      backgroundColor: '#DAFF00',
      color: '#1A0F3C',
      fontWeight: 'bold',
      borderRadius: '6px'
    },
    buttonBack: { color: '#DAFF00' },
    buttonSkip: { color: '#a78bfa' }
};

export const Dashboard: React.FC<DashboardProps> = ({ impersonatingClient, onLoginAsClient, onLogoutClientView, onNavigate }) => {
  const { state: authState, dispatch: authDispatch } = useContext(AuthContext);
  const { user, isLoading: isAuthLoading, error: authError } = authState;
  const { state: dataState, dispatch: dataDispatch } = useContext(DataContext);
  const { savedScripts, folders, clients, watchedTrends, notifications } = dataState;
  const { state: uiState, dispatch: uiDispatch } = useContext(UIContext);
  const { movingScriptId, isNewDfyAvailable, runTour } = uiState;
  
  const isGuest = user?.id.startsWith('guest-') ?? false;

  const [generatedScript, setGeneratedScript] = useState<Script | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('Dashboard');
  const [initialTopic, setInitialTopic] = useState<string | undefined>(undefined);
  const [scoringScriptId, setScoringScriptId] = useState<string | null>(null);
  const [visualizingScriptId, setVisualizingScriptId] = useState<string | null>(null);
  const [speakingScriptId, setSpeakingScriptId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [enhancedTopics, setEnhancedTopics] = useState<EnhancedTopic[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isRemixing, setIsRemixing] = useState(false);

  const [optimizationTrace, setOptimizationTrace] = useState<OptimizationStep[] | null>(null);
  
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [scriptToSave, setScriptToSave] = useState<Script | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState({ onConfirm: () => {}, title: '', message: '' });
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalProps, setUpgradeModalProps] = useState<{ requiredPlan: Plan; featureName: string }>({ requiredPlan: 'unlimited', featureName: '' });

  const getNextPlan = (currentPlan: Plan): Plan | null => {
    const planHierarchy: Plan[] = ['basic', 'unlimited', 'dfy', 'agency'];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    if (currentIndex < planHierarchy.length - 1) {
        return planHierarchy[currentIndex + 1];
    }
    return null;
  };

  const getOtoNumber = (plan: Plan): number | null => {
      if(plan === 'unlimited') return 1;
      if(plan === 'dfy') return 2;
      if(plan === 'agency') return 3;
      return null;
  };

  const hasPlan = useCallback((requiredPlan: Plan): boolean => {
    if (isGuest || !user) return false;
    const planHierarchy: Plan[] = ['basic', 'unlimited', 'dfy', 'agency'];
    return planHierarchy.indexOf(user.plan) >= planHierarchy.indexOf(requiredPlan);
  }, [user, isGuest]);

  const menuItems: MenuItem[] = [
    { name: 'Dashboard', icon: 'fa-solid fa-house' },
    { name: 'Script Generator', icon: 'fa-solid fa-wand-magic-sparkles' },
    { name: 'Trending Topics', icon: 'fa-solid fa-arrow-trend-up', requiredPlan: 'unlimited' },
    { name: 'DFY Content Vault', icon: 'fa-solid fa-gem', requiredPlan: 'dfy', hasNew: isNewDfyAvailable },
    { name: 'Video Deconstructor', icon: 'fa-solid fa-person-burst', requiredPlan: 'unlimited' },
    { name: 'Saved Scripts', icon: 'fa-solid fa-bookmark' },
    { name: 'Manage Clients', icon: 'fa-solid fa-users', requiredPlan: 'agency' },
    { name: 'Account Settings', icon: 'fa-solid fa-gear' },
  ];

  const handleOpenUpgradeModal = (requiredPlan: Plan, featureName: string) => {
    setUpgradeModalProps({ requiredPlan, featureName });
    setIsUpgradeModalOpen(true);
  };
  
   const handleUpgrade = () => {
    setIsUpgradeModalOpen(false);
    if (isGuest) {
        onNavigate('auth');
    } else if (user) {
        const nextPlanValue = getNextPlan(user.plan);
        if (nextPlanValue) {
            onNavigate(`oto${getOtoNumber(nextPlanValue)}` as any);
        }
    }
  };


  useEffect(() => {
    const checkPersonalization = async () => {
        if (user && !user.isPersonalized && !isGuest) {
            setIsPersonalizationModalOpen(true);
        }
    };
    checkPersonalization();
  }, [user, isGuest]);
  
   useEffect(() => {
    const checkTourStatus = async () => {
        if (user && !isGuest) {
            const { data } = await supabase.storage.from('vsh_private_data').download(`${user.id}/tour_completed.json`).catch(() => ({data: null}));
            if (!data) {
                uiDispatch({ type: 'START_TOUR' });
            }
        }
    };
    checkTourStatus();
  }, [user, isGuest, uiDispatch]);

  const addNotification = useCallback((message: string) => {
    if(user && !isGuest) {
        dataDispatch({ type: 'ADD_NOTIFICATION_REQUEST', payload: { message, userId: user.id } });
    }
  }, [dataDispatch, user, isGuest]);

  const handleStartOptimization = useCallback(async (task: { mode: 'generate', data: { topic: string, tone: string, lengthInSeconds: number } } | { mode: 'optimize', data: { title: string, hook: string, script: string } }) => {
    setIsLoading(true);
    setError(null);
    setGeneratedScript(null);
    setOptimizationTrace(null);
    setEnhancedTopics([]);
    if (activeView !== 'Script Generator') setActiveView('Script Generator');
    
    try {
      const trace = await getOptimizationTrace(task);
      setOptimizationTrace(trace.steps);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      if (errorMessage === QUOTA_ERROR_MESSAGE) {
        uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
      } else {
        setError(errorMessage);
        addNotification(`Error generating script: ${errorMessage}`);
      }
      setIsLoading(false);
    }
  }, [addNotification, uiDispatch, activeView]);
  
  const handleOptimizationComplete = useCallback((finalScript: Script) => {
      const scriptWithMetadata: Script = {
          ...finalScript,
          id: crypto.randomUUID(), // Ensure a client-side ID
          isNew: true,
      };
      setGeneratedScript(scriptWithMetadata);
      setIsLoading(false);
      setOptimizationTrace(null);
  }, []);

  const handleEnhanceTopic = async (topic: string) => {
      setIsEnhancing(true);
      setEnhancedTopics([]);
      try {
          const suggestions = await enhanceTopic(topic);
          setEnhancedTopics(suggestions);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          if (errorMessage === QUOTA_ERROR_MESSAGE) {
            uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
          } else {
            addNotification(`Error enhancing topic: ${errorMessage}`);
          }
      } finally {
          setIsEnhancing(false);
      }
  }
  
  const handleSelectEnhancedTopic = (topic: string) => {
    setInitialTopic(topic);
    setEnhancedTopics([]);
  }

  const handleOpenSaveModal = useCallback((script: Script) => {
    if (isGuest) {
      addNotification('Please sign up to save your scripts!');
      return;
    }
    setScriptToSave(script);
    setIsSaveModalOpen(true);
  }, [addNotification, isGuest]);

  const handleConfirmSave = useCallback((script: Script, folderId: string | null) => {
    const scriptToSave: Script = { ...script, folder_id: folderId, isNew: false };
    dataDispatch({ type: 'ADD_SAVED_SCRIPT_REQUEST', payload: { script: scriptToSave }});
    addNotification(`Script "${script.title}" saved successfully!`);
    setIsSaveModalOpen(false);
    setScriptToSave(null);
  }, [dataDispatch, addNotification]);

  const handleUnsaveScript = useCallback((scriptId: string) => {
    dataDispatch({ type: 'UNSAVE_SCRIPT_REQUEST', payload: { scriptId } });
    addNotification('Script unsaved.');
  }, [dataDispatch, addNotification]);

  const isScriptSaved = useCallback((script: Script) => {
    return savedScripts.some(s => s.id === script.id || (s.title === script.title && s.script === script.script));
  }, [savedScripts]);

  const handleAddFolder = useCallback((folderName: string): string => {
    const newId = crypto.randomUUID();
    dataDispatch({ type: 'ADD_FOLDER_REQUEST', payload: { folder: { id: newId, name: folderName } } });
    addNotification(`Folder "${folderName}" created.`);
    return newId;
  }, [dataDispatch, addNotification]);

  const handleRenameFolder = useCallback((folderId: string, newName: string) => {
    dataDispatch({ type: 'RENAME_FOLDER_REQUEST', payload: { folderId, newName } });
    addNotification(`Folder renamed to "${newName}".`);
  }, [dataDispatch, addNotification]);

  const handleDeleteFolder = useCallback((folderId: string) => {
    setConfirmationProps({
        title: "Delete Folder?",
        message: "Are you sure you want to delete this folder? Scripts inside will not be deleted but will be moved to your main library.",
        onConfirm: () => {
            dataDispatch({ type: 'DELETE_FOLDER_REQUEST', payload: { folderId } });
            addNotification("Folder deleted.");
            setIsConfirmationModalOpen(false);
        }
    });
    setIsConfirmationModalOpen(true);
  }, [dataDispatch, addNotification]);

  const handleMoveScriptToFolder = useCallback((scriptId: string, folderId: string | null) => {
    uiDispatch({ type: 'SET_MOVING_SCRIPT_ID', payload: scriptId });
    dataDispatch({ type: 'MOVE_SCRIPT_TO_FOLDER_REQUEST', payload: { scriptId, folderId }});
    setTimeout(() => uiDispatch({ type: 'SET_MOVING_SCRIPT_ID', payload: null }), 1000);
  }, [dataDispatch, uiDispatch]);

  const handleAddClient = useCallback((clientData: Omit<Client, 'id' | 'status'>) => {
    dataDispatch({ type: 'ADD_CLIENT_REQUEST', payload: { clientData } });
    addNotification(`Client "${clientData.name}" added.`);
    setIsAddClientModalOpen(false);
  }, [dataDispatch, addNotification]);
  
  const handleUpdateClient = useCallback((client: Client) => {
    dataDispatch({ type: 'UPDATE_CLIENT_REQUEST', payload: { updatedClient: client }});
    addNotification(`Client "${client.name}" updated.`);
    setIsEditClientModalOpen(false);
    setClientToEdit(null);
  }, [dataDispatch, addNotification]);

  const handleOpenEditClientModal = (client: Client) => {
    setClientToEdit(client);
    setIsEditClientModalOpen(true);
  }

  const handleRemoveClient = useCallback((clientId: string) => {
     setConfirmationProps({
        title: "Remove Client?",
        message: "Are you sure you want to remove this client? This action cannot be undone.",
        onConfirm: () => {
            dataDispatch({ type: 'DELETE_CLIENT_REQUEST', payload: { clientId } });
            addNotification("Client removed.");
            setIsConfirmationModalOpen(false);
        }
    });
    setIsConfirmationModalOpen(true);
  }, [dataDispatch, addNotification]);

  const handleDeleteScript = useCallback((scriptId: string) => {
    setConfirmationProps({
        title: "Delete Script?",
        message: "Are you sure you want to permanently delete this script?",
        onConfirm: () => {
            dataDispatch({ type: 'UNSAVE_SCRIPT_REQUEST', payload: { scriptId } });
            addNotification("Script deleted.");
            setIsConfirmationModalOpen(false);
        }
    });
    setIsConfirmationModalOpen(true);
  }, [dataDispatch, addNotification]);

  const handleVisualize = useCallback(async (scriptId: string, artStyle: string) => {
    setVisualizingScriptId(scriptId);
    const scriptToVisualize = savedScripts.find(s => s.id === scriptId) || (generatedScript?.id === scriptId ? generatedScript : null);
    if (!scriptToVisualize) return;
    
    addNotification(`Generating visuals for "${scriptToVisualize.title}"...`);
    try {
        const visuals = await generateVisualsForScript(scriptToVisualize, artStyle);
        if (isScriptSaved(scriptToVisualize)) {
            dataDispatch({ type: 'UPDATE_SAVED_SCRIPT_VISUALS_REQUEST', payload: { scriptId, visuals } });
        } else if (generatedScript?.id === scriptId) {
            setGeneratedScript(prev => prev ? { ...prev, visuals } : null);
        }
        addNotification(`Visuals generated successfully!`);
    } catch (err) {
         const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
         if (errorMessage === QUOTA_ERROR_MESSAGE) {
            uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
         } else {
            addNotification(`Error generating visuals: ${errorMessage}`);
         }
    } finally {
        setVisualizingScriptId(null);
    }
  }, [savedScripts, generatedScript, isScriptSaved, dataDispatch, addNotification, uiDispatch]);

  const handleRemixScript = useCallback(async (baseScript: Script, newTopic: string) => {
      setIsRemixing(true);
      setError(null);
      setGeneratedScript(null);
      setOptimizationTrace(null);
      addNotification(`Remixing "${baseScript.title}"...`);
      if (activeView !== 'Script Generator') setActiveView('Script Generator');
      
      try {
          const newScript = await remixScript(baseScript, newTopic);
          setGeneratedScript(newScript);
          addNotification('Remix complete!');
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          if (errorMessage === QUOTA_ERROR_MESSAGE) {
            uiDispatch({ type: 'SET_QUOTA_ERROR', payload: errorMessage });
          } else {
             setError(errorMessage);
             addNotification(`Error remixing script: ${errorMessage}`);
          }
      } finally {
          setIsRemixing(false);
      }
  }, [addNotification, uiDispatch, activeView]);

  useEffect(() => {
    setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
  }, []);

  const handleToggleSpeech = useCallback((script: Script) => {
      const synth = window.speechSynthesis;
      if (speakingScriptId === script.id) {
          synth.cancel();
          setSpeakingScriptId(null);
      } else {
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(`${script.title}. ${script.hook}. ${script.script}`);
          const voice = voices.find(v => v.name.includes('Google US English'));
          if (voice) utterance.voice = voice;
          utterance.pitch = 1;
          utterance.rate = 1.1;
          utterance.onend = () => setSpeakingScriptId(null);
          synth.speak(utterance);
          setSpeakingScriptId(script.id);
      }
  }, [speakingScriptId, voices]);

  const handleGenerateForTrend = useCallback((topic: string) => {
    setInitialTopic(topic);
    setActiveView('Script Generator');
  }, []);

  const handleWatchTrend = useCallback((trend: Trend) => {
      dataDispatch({ type: 'ADD_WATCHED_TREND_REQUEST', payload: { trend } });
      addNotification(`Trend "${trend.topic}" added to your watchlist.`);
  }, [dataDispatch, addNotification]);

  const handleUnwatchTrend = useCallback((topic: string) => {
      dataDispatch({ type: 'REMOVE_WATCHED_TREND_REQUEST', payload: { topic } });
      addNotification(`Trend "${topic}" removed from your watchlist.`);
  }, [dataDispatch, addNotification]);

  const isTrendWatched = useCallback((topic: string) => {
      return watchedTrends.some(t => t.trend_data.topic === topic);
  }, [watchedTrends]);
  
  const handlePersonalizationComplete = (data: { niche: string, platforms: any, tone: string }) => {
      authDispatch({ type: 'COMPLETE_PERSONALIZATION_REQUEST', payload: data });
      setIsPersonalizationModalOpen(false);
      addNotification("Your profile has been personalized!");
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    if (['finished', 'skipped'].includes(status)) {
        uiDispatch({ type: 'STOP_TOUR' });
        if (user && !isGuest) {
            supabase.storage.from('vsh_private_data').upload(`${user.id}/tour_completed.json`, new Blob([JSON.stringify({completed: true})]), {
                cacheControl: '3600',
                upsert: true,
            });
        }
    }
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const renderView = () => {
    switch (activeView) {
      case 'Dashboard':
        return <DashboardHomeView
                  onNavigate={setActiveView}
                  recentScripts={savedScripts.slice(0, 3)}
                  onOpenSaveModal={handleOpenSaveModal}
                  onUnsaveScript={handleUnsaveScript}
                  isScriptSaved={isScriptSaved}
                  scoringScriptId={scoringScriptId}
                  onGenerateForTrend={handleGenerateForTrend}
                  agencyClientCount={clients.length}
                  watchedTrends={watchedTrends.map(wt => wt.trend_data)}
                  onWatchTrend={handleWatchTrend}
                  onUnwatchTrend={handleUnwatchTrend}
                  isTrendWatched={isTrendWatched}
                  onVisualize={handleVisualize}
                  visualizingScriptId={visualizingScriptId}
                  scriptOfTheDay={savedScripts.find(s => s.niche === user?.primary_niche)}
                  onToggleSpeech={handleToggleSpeech}
                  speakingScriptId={speakingScriptId}
                />;
      case 'Script Generator':
        return (
          <div>
            <InputForm 
              onStartOptimization={handleStartOptimization} 
              isLoading={isLoading} 
              initialTopic={initialTopic} 
              setInitialTopic={setInitialTopic}
              onEnhanceTopic={handleEnhanceTopic}
              isEnhancing={isEnhancing}
              enhancedTopics={enhancedTopics}
              onSelectEnhancedTopic={handleSelectEnhancedTopic}
              onOpenUpgradeModal={handleOpenUpgradeModal}
            />
            {isLoading && !optimizationTrace ? (
              <div className="text-center py-16 px-6 bg-[#2A1A5E] rounded-lg border-2 border-dashed border-[#4A3F7A]">
                 <div className="flex justify-center items-center"><svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-[#DAFF00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><h3 className="text-lg font-medium text-[#F0F0F0] animate-pulse">Contacting AI Oracle...</h3></div>
              </div>
            ) : optimizationTrace ? (
                <AIOptimizerView trace={optimizationTrace} onComplete={handleOptimizationComplete} />
            ) : (
                <ScriptDisplay 
                  script={generatedScript} 
                  isLoading={isLoading} 
                  error={error} 
                  onOpenSaveModal={handleOpenSaveModal} 
                  onUnsaveScript={handleUnsaveScript}
                  isScriptSaved={isScriptSaved}
                  scoringScriptId={scoringScriptId}
                  onVisualize={handleVisualize}
                  visualizingScriptId={visualizingScriptId}
                  onToggleSpeech={handleToggleSpeech}
                  speakingScriptId={speakingScriptId}
                />
            )}
          </div>
        );
      case 'Trending Topics':
        if (!hasPlan('unlimited')) return <PlaceholderView title="Upgrade to Unlimited" message="This feature requires the Unlimited plan to view trending topics." />;
        return <TrendingTopicsView onGenerateForTrend={handleGenerateForTrend} onWatchTrend={handleWatchTrend} onUnwatchTrend={handleUnwatchTrend} isTrendWatched={isTrendWatched} />;
      case 'DFY Content Vault':
         if (!hasPlan('dfy')) return <PlaceholderView title="Upgrade to DFY" message="This feature requires the Done-For-You Content Vault plan." />;
         return <DFYContentView 
                    onOpenSaveModal={handleOpenSaveModal}
                    onUnsaveScript={handleUnsaveScript}
                    isScriptSaved={isScriptSaved}
                    scoringScriptId={scoringScriptId}
                    onVisualize={handleVisualize}
                    visualizingScriptId={visualizingScriptId}
                    onToggleSpeech={handleToggleSpeech}
                    speakingScriptId={speakingScriptId}
                    onRemixScript={handleRemixScript}
                    isRemixing={isRemixing}
                />;
      case 'Video Deconstructor':
        if (!hasPlan('unlimited')) return <PlaceholderView title="Upgrade to Unlimited" message="This feature requires the Unlimited plan to deconstruct videos." />;
        return <VideoDeconstructorView 
                    onOpenSaveModal={handleOpenSaveModal}
                    onUnsaveScript={handleUnsaveScript}
                    isScriptSaved={isScriptSaved}
                    scoringScriptId={scoringScriptId}
                    onVisualize={handleVisualize}
                    visualizingScriptId={visualizingScriptId}
                    onToggleSpeech={handleToggleSpeech}
                    speakingScriptId={speakingScriptId}
                />;
      case 'Saved Scripts':
        return <SavedScriptsView
                  onAddNewFolder={handleAddFolder}
                  onOpenSaveModal={handleOpenSaveModal}
                  onUnsaveScript={handleUnsaveScript}
                  onDeleteScript={handleDeleteScript}
                  isScriptSaved={isScriptSaved}
                  scoringScriptId={scoringScriptId}
                  onMoveScriptToFolder={handleMoveScriptToFolder}
                  onRenameFolder={handleRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onVisualize={handleVisualize}
                  visualizingScriptId={visualizingScriptId}
                  onToggleSpeech={handleToggleSpeech}
                  speakingScriptId={speakingScriptId}
                />;
      case 'Manage Clients':
        if (!hasPlan('agency')) return <PlaceholderView title="Upgrade to Agency" message="This feature requires the Agency plan to manage clients." />;
        return <AgencyView 
                 onRemoveClient={handleRemoveClient}
                 onOpenAddClientModal={() => setIsAddClientModalOpen(true)}
                 onLoginAsClient={onLoginAsClient}
                 onOpenEditClientModal={handleOpenEditClientModal}
               />;
      case 'Account Settings':
        return <AccountSettingsView onUpgrade={handleUpgrade} />;
      default:
        return <div>View not found</div>;
    }
  };
  
    if (isAuthLoading || !user) {
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
    <>
      <Joyride
          steps={tourSteps}
          run={runTour}
          continuous
          showProgress
          showSkipButton
          callback={handleJoyrideCallback}
          styles={joyrideStyles}
      />
      <div className="flex min-h-screen bg-[#1A0F3C] text-[#F0F0F0] font-sans">
        {/* Sidebar */}
        <aside className="w-64 bg-[#2A1A5E]/30 flex-shrink-0 flex flex-col border-r border-[#4A3F7A]/30">
            <div className="h-20 flex items-center justify-center px-4 border-b border-[#4A3F7A]/30 flex-shrink-0">
               <img src="images/dashboard-logo.png" alt="Vid Script Hub Logo" className="h-8 w-auto" />
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-4">
                  <button id="new-project-btn" onClick={() => { setActiveView('Script Generator'); setGeneratedScript(null); setError(null); setInitialTopic(undefined); }} className="w-full flex items-center justify-center bg-[#DAFF00] text-[#1A0F3C] font-bold py-3 px-4 rounded-md hover:bg-opacity-90 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#DAFF00]/50">
                     <i className="fa-solid fa-plus mr-2"></i>New Project
                  </button>
                </div>
                <nav className="flex-1 px-4 pb-4 space-y-1">
                    {menuItems.map((item) => {
                        const isLocked = !!item.requiredPlan && !hasPlan(item.requiredPlan);
                        const isActive = activeView === item.name;

                        return (
                          <button
                            key={item.name}
                            id={`${kebabCase(item.name)}-nav`}
                            onClick={() => {
                              if (isLocked) {
                                handleOpenUpgradeModal(item.requiredPlan!, `${item.name}`);
                              } else {
                                setActiveView(item.name);
                              }
                            }}
                            className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors duration-200 group relative ${isActive ? 'bg-[#DAFF00] text-[#1A0F3C]' : 'text-purple-200 hover:bg-[#4A3F7A]/50 hover:text-white'}`}
                            disabled={isLocked && isGuest}
                          >
                            <i className={`${item.icon} w-5 text-center mr-3 transition-colors duration-200 ${isActive ? 'text-[#1A0F3C]' : 'text-purple-300 group-hover:text-white'}`}></i>
                            <span className="flex-1 text-left">{item.name}</span>
                            {isLocked && !isGuest && <CrownIcon className="w-4 h-4 text-yellow-400" />}
                            {item.hasNew && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                          </button>
                        );
                      })}
                </nav>
            </div>
            {/* User Profile / Logout */}
            <div className="p-4 border-t border-[#4A3F7A]/30 flex-shrink-0">
                <div className="flex items-center">
                    <img className="h-9 w-9 rounded-full object-cover" src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=DAFF00&color=1A0F3C`} alt="User avatar" />
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-white truncate">{impersonatingClient ? impersonatingClient.name : user.name}</p>
                        <p className="text-xs text-purple-300 truncate">{impersonatingClient ? `Viewing as client` : user.email}</p>
                    </div>
                    <div className="ml-auto relative">
                        <button onClick={() => setIsNotificationsOpen(o => !o)} className="text-purple-300 hover:text-white transition-colors p-2 rounded-full">
                           <i className="fa-regular fa-bell"></i>
                           {unreadNotificationsCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadNotificationsCount}</span>}
                        </button>
                        <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} onMarkAllAsRead={() => dataDispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ_REQUEST', payload: { userId: user.id } })} />
                    </div>
                </div>
            </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
             {impersonatingClient && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-200 text-sm font-bold px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
                    <span><i className="fa-solid fa-user-secret mr-3"></i>You are viewing the dashboard as <strong>{impersonatingClient.name}</strong>. All actions will be performed on their behalf.</span>
                    <button onClick={onLogoutClientView} className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-md hover:bg-yellow-300">Exit Client View</button>
                </div>
            )}
             {authError && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6" role="alert">
                    <strong className="font-bold">Authentication Error: </strong>
                    <span className="block sm:inline">{authError}</span>
                </div>
            )}
            {renderView()}
        </main>
      </div>

      <button
        onClick={() => uiDispatch({ type: 'START_TOUR' })}
        className="fixed bottom-6 right-6 z-30 bg-[#DAFF00] text-[#1A0F3C] w-14 h-14 rounded-full flex items-center justify-center shadow-lg animate-pulse hover:animate-none transform hover:scale-110 transition-transform duration-200"
        aria-label="Start Product Tour"
        title="Start Product Tour"
      >
        <i className="fa-solid fa-question text-2xl"></i>
      </button>
        
      {/* Modals */}
      <QuotaErrorModal />
      <UpgradeModal 
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onUpgrade={handleUpgrade}
          requiredPlan={upgradeModalProps.requiredPlan}
          featureName={upgradeModalProps.featureName}
      />
      <PersonalizationModal 
          isOpen={isPersonalizationModalOpen}
          onComplete={handlePersonalizationComplete}
      />
      <SaveScriptModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          scriptToSave={scriptToSave}
          onConfirmSave={handleConfirmSave}
          onAddNewFolder={handleAddFolder}
      />
      <AddClientModal
          isOpen={isAddClientModalOpen}
          onClose={() => setIsAddClientModalOpen(false)}
          onAddClient={handleAddClient}
      />
      <EditClientModal
          isOpen={isEditClientModalOpen}
          onClose={() => setIsEditClientModalOpen(false)}
          onUpdateClient={handleUpdateClient}
          client={clientToEdit}
      />
      <ConfirmationModal 
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
          onConfirm={confirmationProps.onConfirm}
          title={confirmationProps.title}
          message={confirmationProps.message}
      />
    </>
  );
};
