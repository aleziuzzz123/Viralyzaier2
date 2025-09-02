import React from 'react';
import FinalShotstackStudio from './FinalShotstackStudio';
import { Project } from '../types';

interface CreativeStudioProps {
    project?: Project;
}

const CreativeStudio: React.FC<CreativeStudioProps> = ({ project }) => {
    console.log('🎬 CreativeStudio component loaded - rendering FinalShotstackStudio');
    console.log('🚀 CREATIVE STUDIO V2.0 - FORCE REBUILD - ' + new Date().toISOString());
    console.log('📋 Project data received:', project);
    
    return <FinalShotstackStudio project={project} />;
};

export default CreativeStudio;