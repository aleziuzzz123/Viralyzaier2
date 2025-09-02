import React from 'react';
import SimpleShotstackStudio from './SimpleShotstackStudio';
import MinimalShotstackTest from './MinimalShotstackTest';
import { Project } from '../types';

interface CreativeStudioProps {
    project?: Project;
}

const CreativeStudio: React.FC<CreativeStudioProps> = ({ project }) => {
    console.log('🎬 CreativeStudio component loaded - rendering SimpleShotstackStudio');
    console.log('🚀 CREATIVE STUDIO V2.0 - FORCE REBUILD - ' + new Date().toISOString());
    console.log('📋 Project data received:', project);
    
    return <MinimalShotstackTest />;
};

export default CreativeStudio;