import React, { useState, useEffect, useRef } from 'react';
import { Script } from '../types';


interface TimelineProps {
    script: Script | null;
    onSceneSelect: (sceneIndex: number) => void;
    player: any | null;
}

const Timeline: React.FC<TimelineProps> = ({ script, onSceneSelect, player }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const timelineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!player) return;
        const onTimeUpdate = (time: number) => setCurrentTime(time);
        const onDurationChange = (d: number) => setDuration(d);

        player.on('timeupdate', onTimeUpdate);
        player.on('durationchange', onDurationChange);
        
        // Initial values
        setDuration(player.getDuration());
        // FIX: The Shotstack Studio SDK uses the `currentTime` property, not a `getCurrentTime()` method.
        setCurrentTime(player.currentTime);

        return () => {
            player.off('timeupdate', onTimeUpdate);
            player.off('durationchange', onDurationChange);
        };
    }, [player]);

    const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || !duration) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        player?.setCurrentTime(duration * percentage);
    };

    if (!script) return null;

    return (
        <div className="h-full flex flex-col justify-center relative" ref={timelineRef} onClick={handleScrub}>
            <div className="w-full h-12 bg-gray-900/50 rounded-md flex items-center relative cursor-pointer">
                {script.scenes.map((scene, index) => {
                     const sceneDuration = parseFloat(scene.timecode.split('-')[1] || '5') - parseFloat(scene.timecode.split('-')[0] || '0');
                     const sceneStart = parseFloat(scene.timecode.split('-')[0] || '0');
                     
                     // Fallback in case duration isn't available from player yet
                     const totalDuration = duration || script.scenes.reduce((acc, s) => acc + (parseFloat(s.timecode.split('-')[1] || '5') - parseFloat(s.timecode.split('-')[0] || '0')), 0);

                    return (
                        <div
                            key={index}
                            onClick={(e) => { e.stopPropagation(); onSceneSelect(index); }}
                            className="h-full flex items-center justify-center px-2 border-r border-gray-600/50 hover:bg-indigo-500/20"
                            style={{ width: `${(sceneDuration / totalDuration) * 100}%` }}
                            title={`Scene ${index + 1}: ${scene.visual}`}
                        >
                            <div className="text-gray-400 text-xs font-medium">
                                Scene {index + 1}
                            </div>
                        </div>
                    );
                })}

                {/* Playhead */}
                {duration > 0 && (
                     <div 
                        className="absolute top-0 bottom-0 w-1 bg-red-500 pointer-events-none"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                     >
                         <div className="absolute -top-2 -left-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                     </div>
                )}
            </div>
        </div>
    );
};

export default Timeline;