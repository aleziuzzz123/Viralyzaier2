import React, { useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

const CreativeStudio: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { activeProjectDetails, handleUpdateProject, addToast } = useAppContext();

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
                const { type, payload } = event.data;
                switch (type) {
                    // The editor is ready and requesting project data
                    case 'studio:ready':
                        iframeRef.current.contentWindow?.postMessage({
                            type: 'app:load_project',
                            payload: activeProjectDetails,
                        }, '*');
                        break;
                    // The editor is sending an updated timeline to be saved
                    case 'studio:save_project':
                        if (activeProjectDetails && payload) {
                            handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: payload });
                        }
                        break;
                    // The editor is requesting a toast notification
                    case 'studio:addToast':
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
    
    return (
        <div style={{ height: 'calc(100vh - 10rem)', width: '100%' }}>
            <iframe
                ref={iframeRef}
                src="/studio.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderRadius: '12px',
                    background: '#0b1220'
                }}
                allow="clipboard-write"
                title="Creative Studio Editor"
            />
        </div>
    );
};

export default CreativeStudio;
