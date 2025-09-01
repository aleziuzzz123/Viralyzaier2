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
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStep, setLoadingStep] = useState('');
    const [isStudioReady, setIsStudioReady] = useState(false);
    const [assetsLoaded, setAssetsLoaded] = useState({
        script: false,
        moodboard: false,
        voiceovers: false,
        studio: false
    });

    // Function to load project data for full-screen editor with progress tracking
    const loadProjectForFullScreen = async () => {
        setIsLoadingProject(true);
        setLoadingProgress(0);
        setLoadingStep('Initializing...');
        
        try {
            // Step 1: Get project ID
            setLoadingProgress(10);
            setLoadingStep('Locating project...');
            
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId');
            
            if (projectId) {
                console.log('🎬 Loading project for full-screen editor:', projectId);
                
                // Step 2: Fetch project data
                setLoadingProgress(30);
                setLoadingStep('Loading project data...');
                
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
                    // Step 3: Convert and validate project data
                    setLoadingProgress(50);
                    setLoadingStep('Processing project data...');
                    
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
                    
                    // Step 4: Validate assets
                    setLoadingProgress(70);
                    setLoadingStep('Validating assets...');
                    
                    // Check if we have all required assets
                    const hasScript = project.script && project.script.scenes && project.script.scenes.length > 0;
                    const hasMoodboard = project.moodboard && project.moodboard.length > 0;
                    const hasVoiceovers = project.voiceoverUrls && Object.keys(project.voiceoverUrls).length > 0;
                    
                    setAssetsLoaded({
                        script: hasScript,
                        moodboard: hasMoodboard,
                        voiceovers: hasVoiceovers,
                        studio: false
                    });
                    
                    // Step 5: Ready to load studio
                    setLoadingProgress(90);
                    setLoadingStep('Preparing video editor...');
                    
                    // Wait a moment for smooth UX
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    setLoadingProgress(100);
                    setLoadingStep('Ready!');
                    
                }
            } else {
                // Try to get from localStorage as fallback
                setLoadingProgress(50);
                setLoadingStep('Loading from cache...');
                
                const savedProject = localStorage.getItem('activeProject');
                if (savedProject) {
                    const project = JSON.parse(savedProject);
                    setFullScreenProjectData(project);
                    console.log('🎬 Project loaded from localStorage:', project);
                    
                    setLoadingProgress(100);
                    setLoadingStep('Ready!');
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
        
        // Also load project data if we're on full-screen route and don't have project data yet
        if (isFullScreen && !fullScreenProjectData && !isLoadingProject) {
            loadProjectForFullScreen();
        }
        
        const handleMessage = (event: MessageEvent) => {
            console.log('🎬 CreativeStudio received message:', event.data);
            if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
                const { type, payload } = event.data;
                switch (type) {
                    // The editor is ready and requesting project data
                    case 'studio:ready':
                        setIsStudioReady(true);
                        setAssetsLoaded(prev => ({ ...prev, studio: true }));
                        
                        const projectData = isFullScreenRoute ? fullScreenProjectData : activeProjectDetails;
                        console.log('🎬 Studio ready, sending project data:', projectData);
                        console.log('🎬 Project data details:', {
                            hasScript: !!projectData?.script,
                            hasScenes: !!projectData?.script?.scenes,
                            sceneCount: projectData?.script?.scenes?.length || 0,
                            hasMoodboard: !!projectData?.moodboard,
                            moodboardCount: projectData?.moodboard?.length || 0,
                            hasVoiceovers: !!projectData?.voiceoverUrls,
                            voiceoverCount: Object.keys(projectData?.voiceoverUrls || {}).length,
                            isFullScreenRoute,
                            hasFullScreenData: !!fullScreenProjectData,
                            hasActiveProject: !!activeProjectDetails
                        });
                        
                        // If we're in full-screen mode but don't have project data yet, wait for it
                        if (isFullScreenRoute && !fullScreenProjectData) {
                            console.log('🎬 Full-screen mode but no project data yet, waiting...');
                            // The project data will be sent when it's loaded
                        } else if (projectData) {
                            console.log('🎬 Sending project data to studio...');
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

    // Send project data to iframe when it becomes available in full-screen mode
    useEffect(() => {
        if (isFullScreenRoute && fullScreenProjectData && isStudioReady && iframeRef.current) {
            console.log('🎬 Project data loaded, sending to studio...');
            iframeRef.current.contentWindow?.postMessage({
                type: 'app:load_project',
                payload: fullScreenProjectData,
            }, '*');
        }
    }, [isFullScreenRoute, fullScreenProjectData, isStudioReady]);
    
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
                    backdropFilter: 'blur(10px)',
                    zIndex: 10000,
                    position: 'relative'
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
                                Stage 4: Professional Video Editor
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Workflow Progress Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                                color: 'rgba(255, 255, 255, 0.7)', 
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                Stage 4 of 6
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[1, 2, 3, 4, 5, 6].map((step) => (
                                    <div
                                        key={step}
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: step <= 4 ? '#667eea' : 'rgba(255, 255, 255, 0.3)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <button
                            onClick={() => {
                                const currentProject = isFullScreenRoute ? fullScreenProjectData : activeProjectDetails;
                                if (currentProject) {
                                    handleUpdateProject(currentProject.id, { workflowStep: 5 }); // Move to Analysis & Report
                                    window.close();
                                }
                            }}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                            }}
                        >
                            <span>🚀</span>
                            Proceed to Analysis
                        </button>
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

                {/* Workflow Progress Indicator */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px'
                }}>
                    {[
                        { step: 1, label: 'Spark', completed: true },
                        { step: 2, label: 'Blueprint', completed: true },
                        { step: 3, label: 'Review', completed: true },
                        { step: 4, label: 'Studio', completed: false, current: true },
                        { step: 5, label: 'Analysis', completed: false },
                        { step: 6, label: 'Launch', completed: false }
                    ].map((item, index) => (
                        <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: item.completed 
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : item.current 
                                        ? 'rgba(102, 126, 234, 0.3)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: item.completed || item.current ? 'white' : 'rgba(255, 255, 255, 0.5)',
                                border: item.current ? '2px solid #667eea' : 'none'
                            }}>
                                {item.completed ? '✓' : item.step}
                            </div>
                            <span style={{
                                fontSize: '12px',
                                color: item.completed || item.current ? 'white' : 'rgba(255, 255, 255, 0.5)',
                                fontWeight: item.current ? '600' : '400'
                            }}>
                                {item.label}
                            </span>
                            {index < 5 && (
                                <div style={{
                                    width: '16px',
                                    height: '2px',
                                    background: item.completed ? '#667eea' : 'rgba(255, 255, 255, 0.2)',
                                    margin: '0 8px'
                                }}></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Professional Loading State with Progress */}
                {isLoadingProject || !isStudioReady ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        padding: '40px'
                    }}>
                        {/* Main Loading Animation */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            border: '4px solid rgba(255, 255, 255, 0.1)',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            marginBottom: '32px'
                        }}></div>
                        
                        {/* Progress Bar */}
                        <div style={{
                            width: '100%',
                            maxWidth: '400px',
                            height: '8px',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginBottom: '24px'
                        }}>
                            <div style={{
                                width: `${loadingProgress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '4px',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        
                        {/* Progress Text */}
                        <h2 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '24px', 
                            fontWeight: '600',
                            textAlign: 'center'
                        }}>
                            {loadingStep}
                        </h2>
                        
                        <p style={{ 
                            margin: '0 0 32px 0', 
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '16px',
                            textAlign: 'center'
                        }}>
                            {loadingProgress}% Complete
                        </p>
                        
                        {/* Asset Status Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '16px',
                            width: '100%',
                            maxWidth: '400px'
                        }}>
                            {[
                                { key: 'script', label: 'Script', icon: '📝' },
                                { key: 'moodboard', label: 'Images', icon: '🎨' },
                                { key: 'voiceovers', label: 'Voiceovers', icon: '🎤' },
                                { key: 'studio', label: 'Editor', icon: '🎬' }
                            ].map(({ key, label, icon }) => (
                                <div key={key} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    backgroundColor: assetsLoaded[key as keyof typeof assetsLoaded] 
                                        ? 'rgba(34, 197, 94, 0.1)' 
                                        : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${assetsLoaded[key as keyof typeof assetsLoaded] 
                                        ? 'rgba(34, 197, 94, 0.3)' 
                                        : 'rgba(255, 255, 255, 0.1)'}`,
                                    borderRadius: '8px',
                                    transition: 'all 0.3s ease'
                                }}>
                                    <div style={{
                                        fontSize: '20px',
                                        opacity: assetsLoaded[key as keyof typeof assetsLoaded] ? 1 : 0.5
                                    }}>
                                        {assetsLoaded[key as keyof typeof assetsLoaded] ? '✅' : icon}
                                    </div>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: assetsLoaded[key as keyof typeof assetsLoaded] 
                                            ? '#22c55e' 
                                            : 'rgba(255, 255, 255, 0.7)'
                                    }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        
                        {/* Project Info */}
                        {fullScreenProjectData && (
                            <div style={{
                                marginTop: '32px',
                                padding: '16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '12px',
                                textAlign: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <h4 style={{ 
                                    margin: '0 0 8px 0', 
                                    fontSize: '16px', 
                                    fontWeight: '600',
                                    color: '#667eea'
                                }}>
                                    {fullScreenProjectData.title || fullScreenProjectData.name}
                                </h4>
                                <p style={{ 
                                    margin: '0', 
                                    fontSize: '14px', 
                                    color: 'rgba(255, 255, 255, 0.6)'
                                }}>
                                    {fullScreenProjectData.platform} • {fullScreenProjectData.videoSize}
                                </p>
                            </div>
                        )}
                    </div>
                                ) : fullScreenProjectData ? (
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
                        onLoad={() => {
                            console.log('🎬 Studio iframe loaded (full screen)');
                            // Mark studio as ready when iframe loads
                            setIsStudioReady(true);
                        }}
                        onError={(e) => console.error('🎬 Studio iframe error:', e)}
                    />
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>
                                No Project Data Found
                            </h3>
                            <p style={{ 
                                margin: '0', 
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '16px'
                            }}>
                                Please go back and select a project to edit.
                            </p>
                        </div>
                    </div>
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
