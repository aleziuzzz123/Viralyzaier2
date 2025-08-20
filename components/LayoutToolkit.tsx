import React from 'react';
import { ShotstackClipSelection } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { ViewColumnsIcon } from './Icons';

interface LayoutToolkitProps {
    studio: any | null;
    selection: ShotstackClipSelection | null;
}

const LayoutToolkit: React.FC<LayoutToolkitProps> = ({ studio, selection }) => {
    const { t } = useAppContext();

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ViewColumnsIcon className="w-6 h-6 text-indigo-400" />
                {t('layout_toolkit.title')}
            </h2>
            
            <div className="space-y-4">
                <h3 className="font-semibold text-gray-200">{t('layout_toolkit.smart_layouts')}</h3>
                <p className="text-sm text-gray-500">{t('layout_toolkit.no_broll_selected')}</p>
                {/* Future layout buttons will go here */}
            </div>
        </div>
    );
};

export default LayoutToolkit;