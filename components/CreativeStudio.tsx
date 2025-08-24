import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const CreativeStudio: React.FC = () => {
    const { activeProjectDetails, session, handleUpdateProject, handleRenderProject, addToast } = useAppContext();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isIframeReady, setIsIframeReady] = useState(false);

    // Effect for handling all incoming messages from the iframe
    useEffect(() => {
        const handleMessageFromIframe = (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) {
                return;
            }

            const { type, payload } = event.data;

            switch (type) {
                case 'studio:ready':
                    setIsIframeReady(true);
                    break;
                case 'studio:save_project':
                    if (activeProjectDetails) {
                        handleUpdateProject(activeProjectDetails.id, { shotstackEditJson: payload });
                    }
                    break;
                case 'studio:request_render':
                    if (activeProjectDetails) {
                        handleRenderProject(activeProjectDetails.id, payload);
                    }
                    break;
                case 'studio:addToast':
                    if (payload.message && payload.type) {
                        addToast(payload.message, payload.type);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessageFromIframe);
        return () => window.removeEventListener('message', handleMessageFromIframe);
    }, [activeProjectDetails, handleUpdateProject, handleRenderProject, addToast]);
    
    // Effect for sending the initial project data once all conditions are met
    useEffect(() => {
        if (isIframeReady && iframeRef.current?.contentWindow && activeProjectDetails && session) {
            iframeRef.current.contentWindow.postMessage(
                { type: 'app:load_project', payload: { project: activeProjectDetails, session } },
                '*'
            );
        }
    }, [isIframeReady, activeProjectDetails, session]);

    if (!activeProjectDetails) {
        return <div className="text-center py-10">Loading project...</div>;
    }

    // By keying the iframe on the project ID, we ensure it fully reloads if the user switches projects,
    // preventing any state leakage between different edits.
    return (
        <div style={{ width: '100%', height: 'calc(100vh - 12rem)', border: 'none' }}>
            <iframe
                key={activeProjectDetails.id}
                ref={iframeRef}
                src="/studio.html" // This path is correctly handled by vercel.json rewrite
                width="100%"
                height="100%"
                style={{ border: 'none', borderRadius: '0.5rem' }}
                title="Creative Studio"
                allow="autoplay; fullscreen; camera; microphone"
            ></iframe>
        </div>
    );
};

export default CreativeStudio;