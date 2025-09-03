import React from 'react';
import SimpleShotstackStudio from './SimpleShotstackStudio';
import MinimalShotstackTest from './MinimalShotstackTest';
import WorkingShotstackStudio from './WorkingShotstackStudio';
import { Project } from '../types';

interface CreativeStudioProps {
    project?: Project;
    onProceedToAnalysis?: () => void;
}

const CreativeStudio: React.FC<CreativeStudioProps> = ({ project, onProceedToAnalysis }) => {
    console.log('🎬 CreativeStudio component loaded - rendering SimpleShotstackStudio');
    console.log('🚀 CREATIVE STUDIO V2.0 - FORCE REBUILD - ' + new Date().toISOString());
    console.log('📋 Project data received:', project);
    
    return <WorkingShotstackStudio project={project} onProceedToAnalysis={onProceedToAnalysis} />;
};

export default CreativeStudio;