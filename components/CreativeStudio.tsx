import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const CreativeStudio: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { activeProjectDetails, handleUpdateProject, addToast } = useAppContext();
    const [iframeKey, setIframeKey] = useState(Date.now());
    const [isFullScreenRoute, setIsFullScreenRoute] = useState(false);

    useEffect(() => {
        // Check if we're on the full-screen studio-editor route
        const isFullScreen = window.location.pathname === '/studio-editor';
        setIsFullScreenRoute(isFullScreen);
        
        console.log('🎬 CreativeStudio component mounted');
        console.log('🎬 Active project details:', activeProjectDetails);
        
        const handleMessage = (event: MessageEvent) => {
            console.log('🎬 CreativeStudio received message:', event.data);
            if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
                const { type, payload } = event.data;
                switch (type) {
                    // The editor is ready and requesting project data
                    case 'studio:ready':
                        console.log('🎬 Studio ready, sending project data:', activeProjectDetails);
                        iframeRef.current.contentWindow?.postMessage({
                            type: 'app:load_project',
                            payload: activeProjectDetails,
                        }, '*');
                        break;
                    // The editor is sending an updated timeline to be saved
                    case 'studio:save_project':
                        console.log('🎬 Saving project:', payload);
                        if (activeProjectDetails && payload) {
                            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: payload });
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
                background: '#0b1220'
            }}>
                <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    src={`/studio.html?v=${iframeKey}`}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 0,
                        background: '#0b1220'
                    }}
                    allow="clipboard-write"
                    title="Creative Studio Editor - Full Screen"
                    onLoad={() => console.log('🎬 Studio iframe loaded (full screen)')}
                    onError={(e) => console.error('🎬 Studio iframe error:', e)}
                />
            </div>
        );
    }
    
    // Regular embedded editor
    return (
        <div style={{ height: 'calc(100vh - 10rem)', width: '100%', position: 'relative' }}>
            {/* Full Screen Button */}
            <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1000
            }}>
                <button
                    onClick={() => window.open('/studio-editor', '_blank')}
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    }}
                >
                    🖥️ Full Screen Editor
                </button>
            </div>
            
            <iframe
                key={iframeKey}
                ref={iframeRef}
                src={`/studio.html?v=${iframeKey}`}
                style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderRadius: '12px',
                    background: '#0b1220'
                }}
                allow="clipboard-write"
                title="Creative Studio Editor"
                onLoad={() => console.log('🎬 Studio iframe loaded')}
                onError={(e) => console.error('🎬 Studio iframe error:', e)}
            />
        </div>
    );
};

export default CreativeStudio;
