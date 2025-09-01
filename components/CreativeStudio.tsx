import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';

const CreativeStudio: React.FC = () => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { activeProjectDetails, handleUpdateProject, addToast } = useAppContext();
    const [iframeKey, setIframeKey] = useState(Date.now());

    useEffect(() => {
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
    
    return (
        <div style={{ height: 'calc(100vh - 10rem)', width: '100%' }}>
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
