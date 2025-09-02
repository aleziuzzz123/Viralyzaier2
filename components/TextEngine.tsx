import React, { useState, useEffect } from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { TypeIcon, SparklesIcon } from './Icons';
import * as fontService from '../services/fontService';

interface TextEngineProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const TextEngine: React.FC<TextEngineProps> = ({ studio, selection }) => {
    const { t } = useAppContext();
    const [text, setText] = useState('');
    const [fontFamily, setFontFamily] = useState('Inter');
    const [fontSize, setFontSize] = useState(50);
    const [color, setColor] = useState('#FFFFFF');
    const [availableFonts, setAvailableFonts] = useState<fontService.GoogleFont[]>([]);
    
    useEffect(() => {
        fontService.fetchGoogleFonts().then(setAvailableFonts);
    }, []);

    useEffect(() => {
        if (selection?.clip.asset.type === 'text') {
            const asset = selection.clip.asset;
            setText(asset.text || '');
            setFontFamily(asset.fontFamily || 'Inter');
            setFontSize(asset.fontSize || 50);
            setColor(asset.color || '#FFFFFF');
            fontService.loadGoogleFont(asset.fontFamily);
        }
    }, [selection]);

    const handleUpdate = (property: string, value: any) => {
        if (studio && selection) {
            if (property === 'fontFamily') {
                fontService.loadGoogleFont(value);
            }
            studio.updateClip(selection.trackIndex, selection.clipIndex, { [property]: value });
        }
    };

    if (!selection || selection.clip.asset.type !== 'text') {
        return <div className="p-4 text-center text-gray-500">Select a text clip on the timeline to edit its style.</div>;
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TypeIcon className="w-6 h-6 text-indigo-400" />
                {t('text_engine.title')}
            </h2>

            <div className="space-y-4">
                 <h3 className="font-semibold text-gray-200">Content</h3>
                 <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => handleUpdate('text', text)}
                    rows={3}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
                 />
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('text_engine.font_control')}</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-gray-400">Font Family</label>
                        <select
                            value={fontFamily}
                            onChange={(e) => { setFontFamily(e.target.value); handleUpdate('fontFamily', e.target.value); }}
                            className="w-full mt-1 bg-gray-900 border border-gray-600 rounded-lg p-2 text-white"
                        >
                            <option value="Inter, sans-serif">Inter</option>
                            {availableFonts.map(font => <option key={font.family} value={font.family}>{font.family}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-400">Size: {fontSize}</label>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                value={fontSize}
                                onChange={(e) => setFontSize(parseInt(e.target.value))}
                                onMouseUp={() => handleUpdate('fontSize', fontSize)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-400">Color</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => { setColor(e.target.value); handleUpdate('color', e.target.value); }}
                                className="w-full h-10 mt-1 p-0 bg-transparent border-none rounded cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
             <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors">
                    <SparklesIcon className="w-5 h-5"/>
                    {t('text_engine.ai_emphasis')}
                </button>
             </div>
        </div>
    );
};

export default TextEngine;