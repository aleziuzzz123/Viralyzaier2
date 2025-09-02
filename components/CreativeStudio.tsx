import React from 'react';
import FinalShotstackStudio from './FinalShotstackStudio';

const CreativeStudio: React.FC = () => {
    console.log('🎬 CreativeStudio component loaded - rendering FinalShotstackStudio');
    console.log('🚀 CREATIVE STUDIO V2.0 - FORCE REBUILD - ' + new Date().toISOString());
    
    return <FinalShotstackStudio />;
};

export default CreativeStudio;