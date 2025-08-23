import React from 'react';

const CreativeStudio: React.FC = () => {
    // By embedding the standalone studio page in an iframe, we ensure a completely
    // isolated environment for the Shotstack SDK, preventing any dependency conflicts
    // (like double-loading Pixi.js) with the main application. This is the most
    // robust way to integrate a complex third-party editor.
    return (
        <div style={{ height: 'calc(100vh - 10rem)', width: '100%' }}>
            <iframe
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