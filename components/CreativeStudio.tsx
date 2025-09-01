import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Project } from '../types';
import { supabase } from '../services/supabaseClient';

const CreativeStudio: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { activeProjectDetails, handleUpdateProject, addToast } = useAppContext();
    const [iframeKey, setIframeKey] = useState(Date.now());
    const [isFullScreenRoute, setIsFullScreenRoute] = useState(false);
    const [fullScreenProjectData, setFullScreenProjectData] = useState<Project | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(false);

    // Function to load project data for full-screen editor
    const loadProjectForFullScreen = async () => {
        setIsLoadingProject(true);
        try {
            // Try to get project ID from URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId');
            
            if (projectId) {
                console.log('🎬 Loading project for full-screen editor:', projectId);
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .eq('id', projectId)
                    .single();
                
                if (error) {
                    console.error('Error loading project:', error);
                    addToast('Failed to load project data', 'error');
                    return;
                }
                
                if (data) {
                    // Convert database row to Project type
                    const project: Project = {
                        id: data.id,
                        userId: data.user_id,
                        name: data.name,
                        topic: data.topic,
                        platform: data.platform,
                        videoSize: data.video_size || '16:9',
                        status: data.status,
                        title: data.title,
                        script: data.script,
                        analysis: data.analysis,
                        competitorAnalysis: data.competitor_analysis,
                        moodboard: data.moodboard,
                        assets: data.assets || {},
                        soundDesign: data.sound_design,
                        launchPlan: data.launch_plan,
                        performance: data.performance,
                        scheduledDate: data.scheduled_date,
                        publishedUrl: data.published_url,
                        lastUpdated: data.last_updated,
                        workflowStep: data.workflow_step,
                        voiceoverVoiceId: data.voiceover_voice_id,
                        lastPerformanceCheck: data.last_performance_check,
                        finalVideoUrl: data.final_video_url,
                        shotstackEditJson: data.shotstack_edit_json,
                        shotstackRenderId: data.shotstack_render_id,
                        videoUrl: data.video_url,
                        voiceoverUrls: data.voiceover_urls,
                    };
                    
                    setFullScreenProjectData(project);
                    console.log('🎬 Project loaded for full-screen editor:', project);
                }
            } else {
                // Try to get from localStorage as fallback
                const savedProject = localStorage.getItem('activeProject');
                if (savedProject) {
                    const project = JSON.parse(savedProject);
                    setFullScreenProjectData(project);
                    console.log('🎬 Project loaded from localStorage:', project);
                } else {
                    addToast('No project data found', 'error');
                }
            }
        } catch (error) {
            console.error('Error loading project for full-screen editor:', error);
            addToast('Failed to load project data', 'error');
        } finally {
            setIsLoadingProject(false);
        }
    };

    useEffect(() => {
        // Check if we're on the full-screen studio-editor route
        const isFullScreen = window.location.pathname === '/studio-editor';
        setIsFullScreenRoute(isFullScreen);
        
        console.log('🎬 CreativeStudio component mounted');
        console.log('🎬 Active project details:', activeProjectDetails);
        
        // If we're on the full-screen route, load project data from URL or localStorage
        if (isFullScreen && !activeProjectDetails) {
            loadProjectForFullScreen();
        }
        
        const handleMessage = (event: MessageEvent) => {
            console.log('🎬 CreativeStudio received message:', event.data);
            if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
                const { type, payload } = event.data;
                switch (type) {
                    // The editor is ready and requesting project data
                    case 'studio:ready':
                        const projectData = isFullScreenRoute ? fullScreenProjectData : activeProjectDetails;
                        console.log('🎬 Studio ready, sending project data:', projectData);
                        if (projectData) {
                            iframeRef.current.contentWindow?.postMessage({
                                type: 'app:load_project',
                                payload: projectData,
                            }, '*');
                        } else {
                            console.warn('🎬 No project data available to send to studio');
                        }
                        break;
                    // The editor is sending an updated timeline to be saved
                    case 'studio:save_project':
                        console.log('🎬 Saving project:', payload);
                        const currentProject = isFullScreenRoute ? fullScreenProjectData : activeProjectDetails;
                        if (currentProject && payload) {
                            handleUpdateProject(currentProject.id, { shotstackEditJson: payload });
                        }
                        break;
                    // The editor is requesting a toast notification
                    case 'studio:addToast':
                        console.log('🎬 Studio toast:', payload);
                        if (payload) {
                            addToast(payload.message, payload.type);
                        }
                        break;
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [activeProjectDetails, handleUpdateProject, addToast]);
    
    console.log('🎬 CreativeStudio rendering with project:', activeProjectDetails);
    
    // If we're on the full-screen route, render the full-screen editor
    if (isFullScreenRoute) {
        return (
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: 9999,
                background: '#0b1220',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Professional Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                        }}>
                            🎬
                        </div>
                        <div>
                            <h1 style={{ 
                                color: 'white', 
                                margin: 0, 
                                fontSize: '18px', 
                                fontWeight: '600' 
                            }}>
                                Creative Studio
                            </h1>
                            <p style={{ 
                                color: 'rgba(255, 255, 255, 0.7)', 
                                margin: 0, 
                                fontSize: '12px' 
                            }}>
                                Professional Video Editor
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => window.close()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {isLoadingProject ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            border: '3px solid rgba(255, 255, 255, 0.3)',
                            borderTop: '3px solid #667eea',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '16px'
                        }}></div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>
                            Loading Project Data...
                        </h3>
                        <p style={{ 
                            margin: '8px 0 0 0', 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '14px'
                        }}>
                            Preparing your video editor
                        </p>
                    </div>
                ) : (
                    <iframe
                        key={iframeKey}
                        ref={iframeRef}
                        src={`/studio.html?v=${iframeKey}`}
                        style={{
                            flex: 1,
                            width: '100%',
                            border: 0,
                            background: '#0b1220'
                        }}
                        allow="clipboard-write"
                        title="Creative Studio Editor - Full Screen"
                        onLoad={() => console.log('🎬 Studio iframe loaded (full screen)')}
                        onError={(e) => console.error('🎬 Studio iframe error:', e)}
                    />
                )}

                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }
    
    // Redirect directly to full-screen editor for better UX
    useEffect(() => {
        if (activeProjectDetails && !isFullScreenRoute) {
            const url = `/studio-editor?projectId=${activeProjectDetails.id}`;
            window.location.href = url;
        }
    }, [activeProjectDetails, isFullScreenRoute]);

    // Show loading state while redirecting
    return (
        <div style={{ 
            height: 'calc(100vh - 10rem)', 
            width: '100%', 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b1220',
            color: 'white'
        }}>
            <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '24px'
            }}></div>
            <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: '600',
                marginBottom: '8px'
            }}>
                Opening Creative Studio
            </h2>
            <p style={{ 
                margin: 0, 
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '16px'
            }}>
                Redirecting to full-screen editor...
            </p>
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default CreativeStudio;
