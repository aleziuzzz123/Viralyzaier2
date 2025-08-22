import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode, useRef } from 'react';
import * as supabaseService from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { getErrorMessage } from '../utils';
import { translations, Language, TranslationKey } from '../translations';
import { 
    Project, User, PlanId, Blueprint, Toast, Platform, Opportunity, PerformanceReview, ContentGapSuggestion, 
    BrandIdentity, Notification, Script
} from '../types';
import { createCheckoutSession, PLANS } from '../services/paymentService';
import { v4 as uuidv4 } from 'uuid';


interface ConfirmationState {
    isOpen: boolean;
    title: string;
    message: ReactNode;
    onConfirm: () => void;
}

interface UpgradeReason {
    title: string;
    description: string;
}

interface BackendError {
    title: string;
    message: string;
}

interface AppContextType {
    session: any | null;
    user: User | null;
    activeProjectId: string | null;
    activeProjectDetails: Project | null;
    isProjectDetailsLoading: boolean;
    toasts: Toast[];
    isInitialLoading: boolean;
    isUpgradeModalOpen: boolean;
    upgradeReason: UpgradeReason;
    isScheduleModalOpen: boolean;
    projectToSchedule: string | null;
    confirmation: ConfirmationState;
    backendError: BackendError | null;
    dismissedTutorials: string[];
    language: Language;
    
    t: (key: TranslationKey, replacements?: { [key: string]: string | number }) => string;
    setLanguage: (lang: Language) => void;
    addToast: (message: string, type: 'success' | 'error' | 'info') => void;
    dismissToast: (id: number) => void;
    setActiveProjectId: (id: string | null) => void;
    handleLogout: () => void;
    handleSubscriptionChange: (planId: PlanId) => void;
    consumeCredits: (amount: number) => Promise<boolean>;
    requirePermission: (requiredPlan: PlanId) => boolean;
    setUpgradeModalOpen: (isOpen: boolean) => void;
    openScheduleModal: (projectId: string) => void;
    closeScheduleModal: () => void;
    openConfirmationModal: (title: string, message: ReactNode, onConfirm: () => void) => void;
    handleConfirmation: () => void;
    handleCancelConfirmation: () => void;
    clearBackendError: () => void;
    dismissTutorial: (id: string) => void;
    lockAndExecute: <T>(asyncFunction: () => Promise<T>) => Promise<T | undefined>;

    // Project Actions
    handleUpdateProject: (projectId: string, updates: Partial<Project>) => Promise<boolean>;
    handleDeleteProject: (projectId: string) => void;
    handleCreateProjectForBlueprint: (topic: string, platform: Platform, title: string, voiceId: string | null, videoSize: '16:9'|'9:16'|'1:1', blueprint: Blueprint) => Promise<string | null>;
    handleCreateProjectFromIdea: (idea: Opportunity | ContentGapSuggestion, platform: Platform) => void;
    handleCreateProjectFromInsights: (review: PerformanceReview, project: Project) => void;
    
    // User Actions
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [session, setSession] = useState<any | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [activeProjectDetails, setActiveProjectDetails] = useState<Project | null>(null);
    const [isProjectDetailsLoading, setIsProjectDetailsLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isUpgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [upgradeReason, setUpgradeReason] = useState<UpgradeReason>({ title: '', description: '' });
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [projectToSchedule, setProjectToSchedule] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    const [backendError, setBackendError] = useState<BackendError | null>(null);
    const [dismissedTutorials, setDismissedTutorials] = useState<string[]>([]);
    const [language, setLanguageState] = useState<Language>('en');

    const executionLock = useRef(false);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('appLanguage', lang);
    }, []);

    const t = useCallback((key: TranslationKey, replacements?: { [key: string]: string | number }) => {
        let translation = translations[language][key] || translations.en[key] || key;
        if (replacements) {
            Object.entries(replacements).forEach(([k, v]) => {
                translation = translation.replace(`{${k}}`, String(v));
            });
        }
        return translation;
    }, [language]);

    useEffect(() => {
        const savedLang = localStorage.getItem('appLanguage') as Language;
        if (savedLang && translations[savedLang]) {
            setLanguageState(savedLang);
        }
    }, []);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        const newToast: Toast = { id: Date.now(), message, type };
        setToasts(prev => [...prev, newToast]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const loadInitialData = useCallback(async (userId: string) => {
        setIsInitialLoading(true);
        try {
            // Refactored: Only fetches essential user data now.
            const { user: userData } = await supabaseService.invokeEdgeFunction<{ user: User }>('get-initial-data', {});
            setUser(userData);
        } catch (e) {
            setBackendError({ title: "Failed to Load User Profile", message: getErrorMessage(e) });
        } finally {
            setIsInitialLoading(false);
        }
    }, [setIsInitialLoading, setUser, setBackendError]);

    useEffect(() => {
        supabaseService.getSession().then(({ session }) => setSession(session));
        const authListener = supabaseService.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                loadInitialData(session.user.id);
            } else {
                setUser(null);
                setIsInitialLoading(false);
            }
        });
        return () => authListener.subscription.unsubscribe();
    }, [loadInitialData]);
    
    useEffect(() => {
        const fetchDetails = async () => {
            if (!activeProjectId) {
                setActiveProjectDetails(null);
                return;
            }
            setIsProjectDetailsLoading(true);
            try {
                const details = await supabaseService.getProjectDetails(activeProjectId);
                setActiveProjectDetails(details);
            } catch (e) {
                addToast(t('toast.failed_fetch_projects'), 'error');
            } finally {
                setIsProjectDetailsLoading(false);
            }
        };
        fetchDetails();
    }, [activeProjectId, t, addToast]);
    
    useEffect(() => {
        const storedDismissed = localStorage.getItem('dismissedTutorials');
        if (storedDismissed) {
            setDismissedTutorials(JSON.parse(storedDismissed));
        }
    }, []);
    
    const dismissTutorial = (id: string) => {
        const newDismissed = [...dismissedTutorials, id];
        setDismissedTutorials(newDismissed);
        localStorage.setItem('dismissedTutorials', JSON.stringify(newDismissed));
    };

    const openConfirmationModal = useCallback((title: string, message: ReactNode, onConfirm: () => void) => {
        setConfirmation({ isOpen: true, title, message, onConfirm });
    }, []);

    const handleLogout = useCallback(() => {
        const confirmLogout = () => {
            supabaseService.signOut().then(() => addToast(t('toast.logged_out'), 'success'));
        };
        openConfirmationModal(t('confirmation_modal.logout_title'), t('confirmation_modal.logout_message'), confirmLogout);
    }, [t, addToast, openConfirmationModal]);
    
    const lockAndExecute = useCallback(async (asyncFunction: () => Promise<any>): Promise<any | undefined> => {
        if (executionLock.current) {
            addToast('Another AI process is already running. Please wait.', 'info');
            return;
        }
        executionLock.current = true;
        try {
            return await asyncFunction();
        } catch (error) {
            const message = getErrorMessage(error);
            if (!message.includes('insufficient_credits')) {
                setBackendError({ title: "AI Operation Failed", message });
            }
        } finally {
            executionLock.current = false;
        }
    }, [addToast, setBackendError]);

    const consumeCredits = useCallback(async (amount: number) => {
        if (!user) return false;
        if ((user.aiCredits || 0) < amount) {
            setUpgradeReason({ title: t('upgrade_modal.credits_title'), description: t('upgrade_modal.credits_description') });
            setUpgradeModalOpen(true);
            return false;
        }
        try {
            const { success, newCredits, message } = await supabaseService.invokeEdgeFunction<{success: boolean, newCredits: number, message?: string}>('consume-credits', { amount_to_consume: amount });
            if (success) {
                setUser(prevUser => prevUser ? { ...prevUser, aiCredits: newCredits } : null);
                return true;
            } else {
                 if (message === 'insufficient_credits') {
                    setUpgradeReason({ title: t('upgrade_modal.credits_title'), description: t('upgrade_modal.credits_description') });
                    setUpgradeModalOpen(true);
                }
                return false;
            }
        } catch (e) {
            addToast(getErrorMessage(e), 'error');
            return false;
        }
    }, [user, t, addToast, setUser, setUpgradeReason, setUpgradeModalOpen]);
    
    const requirePermission = useCallback((requiredPlan: PlanId) => {
        if (!user) return false;
        const userPlanIndex = PLANS.findIndex(p => p.id === user.subscription.planId);
        const requiredPlanIndex = PLANS.findIndex(p => p.id === requiredPlan);
        if (userPlanIndex >= requiredPlanIndex) return true;
        
        const planName = PLANS[requiredPlanIndex].name;
        setUpgradeReason({
            title: `Upgrade to ${planName}`,
            description: `This feature requires the ${planName} plan. Please upgrade to continue.`
        });
        setUpgradeModalOpen(true);
        return false;
    }, [user, setUpgradeReason, setUpgradeModalOpen]);

    const handleSubscriptionChange = useCallback(async (planId: PlanId) => {
        if (!user || user.subscription.planId === planId) {
            addToast(t('toast.already_on_plan'), 'info');
            return;
        }
        if (planId === 'free') {
            // Handle cancellation logic here, perhaps a different modal
            return;
        }
        try {
            const { checkoutUrl } = await createCheckoutSession(planId);
            window.location.href = checkoutUrl;
        } catch (e) {
            addToast(t('toast.subscription_failed', { error: getErrorMessage(e) }), 'error');
        }
    }, [user, addToast, t]);

    const handleUpdateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
        try {
            const updatedProject = await supabaseService.updateProject(projectId, updates);
            // setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updatedProject } : p));
            if (activeProjectId === projectId) {
                setActiveProjectDetails(updatedProject);
            }
            return true;
        } catch (e) {
            addToast(t('toast.failed_update_project'), 'error');
            return false;
        }
    }, [t, addToast, activeProjectId, setActiveProjectDetails]);

    const handleCreateProjectForBlueprint = useCallback(async (topic: string, platform: Platform, title: string, voiceoverVoiceId: string | null, videoSize: '16:9'|'9:16'|'1:1', blueprint: Blueprint): Promise<string | null> => {
        if (!user) return null;
        try {
            const tempProjectData: Omit<Project, 'id' | 'lastUpdated'> = { name: title, topic, platform, videoSize, status: 'Scripting', workflowStep: 2, title, script: blueprint.script, moodboard: [], analysis: null, competitorAnalysis: null, scheduledDate: null, assets: {}, soundDesign: null, launchPlan: null, performance: null, publishedUrl: null, voiceoverVoiceId, lastPerformanceCheck: null, finalVideoUrl: null };
            const tempProject = await supabaseService.createProject(tempProjectData, user.id);

            const moodboardUrls = await Promise.all(
                blueprint.moodboard.map(async (base64Img: string, index: number) => {
                    const blob = await supabaseService.dataUrlToBlob(base64Img);
                    const path = `${user!.id}/${tempProject.id}/moodboard_${index}.jpg`;
                    return supabaseService.uploadFile(blob, path);
                })
            );
            
            const enrichedScript = { ...blueprint.script };
            enrichedScript.scenes.forEach((scene, index) => {
                if (moodboardUrls[index]) {
                    scene.storyboardImageUrl = moodboardUrls[index];
                }
            });

            await supabaseService.updateProject(tempProject.id, { 
                moodboard: moodboardUrls,
                script: enrichedScript
            });

            addToast(t('toast.project_created_blueprint'), 'success');
            return tempProject.id;
        } catch (e) {
            addToast(getErrorMessage(e), 'error');
            return null;
        }
    }, [user, addToast, t]);
    
    const handleCreateProjectFromIdea = useCallback(async (idea: Opportunity | ContentGapSuggestion, platform: Platform) => {
        if (!user) return;
        try {
            const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: (idea as Opportunity).idea || (idea as ContentGapSuggestion).idea,
                topic: idea.reason,
                platform,
                videoSize: platform === 'youtube_long' ? '16:9' : '9:16',
                status: 'Idea',
                workflowStep: 2,
                title: (idea as Opportunity).suggestedTitle || (idea as ContentGapSuggestion).potentialTitles[0] || 'New Idea',
                script: null, analysis: null, competitorAnalysis: null, moodboard: null, assets: {},
                soundDesign: null, launchPlan: null, performance: null, scheduledDate: null, publishedUrl: null,
                voiceoverVoiceId: null, lastPerformanceCheck: null
            };
            const newProject = await supabaseService.createProject(newProjectData, user.id);
            setActiveProjectId(newProject.id);
            addToast(t('toast.project_created_idea'), 'success');
        } catch(e) {
             addToast(getErrorMessage(e), 'error');
        }
    }, [user, addToast, t, setActiveProjectId]);

    const handleCreateProjectFromInsights = useCallback(async (review: PerformanceReview, oldProject: Project) => {
        if (!user) return;
        try {
            const newTopic = `Based on insights from "${oldProject.title}": ${review.summary}`;
            const newName = `Improved Version: ${oldProject.title}`;
            const newProjectData: Omit<Project, 'id' | 'lastUpdated'> = {
                name: newName.substring(0, 50),
                topic: newTopic,
                platform: oldProject.platform,
                videoSize: oldProject.videoSize,
                status: 'Idea',
                workflowStep: 2,
                title: newName,
                script: null, analysis: null, competitorAnalysis: null, moodboard: null, assets: {},
                soundDesign: null, launchPlan: null, performance: null, scheduledDate: null, publishedUrl: null,
                voiceoverVoiceId: null, lastPerformanceCheck: null
            };
            const newProject = await supabaseService.createProject(newProjectData, user.id);
            setActiveProjectId(newProject.id);
            addToast(t('toast.project_created_idea'), 'success');
        } catch (e) {
            addToast(getErrorMessage(e), 'error');
        }
    }, [user, addToast, t, setActiveProjectId]);

    const handleDeleteProject = useCallback((projectId: string) => {
        const confirmDelete = async () => {
            try {
                await supabaseService.deleteProject(projectId);
                if (activeProjectId === projectId) setActiveProjectId(null);
                addToast(t('toast.project_deleted'), 'success');
            } catch(e) {
                addToast(t('toast.failed_delete_project'), 'error');
            }
        };
        openConfirmationModal(t('confirmation_modal.delete_project_title'), t('confirmation_modal.delete_project_message'), confirmDelete);
    }, [activeProjectId, t, addToast, openConfirmationModal, setActiveProjectId]);
    
    const openScheduleModal = (projectId: string) => { setProjectToSchedule(projectId); setIsScheduleModalOpen(true); };
    const closeScheduleModal = () => { setIsScheduleModalOpen(false); setProjectToSchedule(null); };
    const clearBackendError = () => setBackendError(null);
    
    const handleConfirmation = () => { if (confirmation.isOpen) { confirmation.onConfirm(); } setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} }); };
    const handleCancelConfirmation = () => setConfirmation({ isOpen: false, title: '', message: '', onConfirm: () => {} });
    
    return (
        <AppContext.Provider value={{
            session, user, activeProjectId, activeProjectDetails, isProjectDetailsLoading,
            toasts, isInitialLoading, isUpgradeModalOpen, upgradeReason,
            isScheduleModalOpen, projectToSchedule, confirmation, backendError, dismissedTutorials, language,
            t, setLanguage, addToast, dismissToast, setActiveProjectId, handleLogout,
            handleSubscriptionChange, consumeCredits, requirePermission, setUpgradeModalOpen,
            openScheduleModal, closeScheduleModal, openConfirmationModal, handleConfirmation,
            handleCancelConfirmation, clearBackendError, dismissTutorial, lockAndExecute, handleUpdateProject,
            handleDeleteProject, handleCreateProjectForBlueprint, handleCreateProjectFromIdea,
            handleCreateProjectFromInsights,
            setUser
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};