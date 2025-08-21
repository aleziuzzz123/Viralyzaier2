import React from 'react';
import VideoEditor, { VideoEditorHandles } from './VideoEditor';
import { Project, ShotstackClipSelection } from '../types';

type Props = {
  editorRef: React.RefObject<VideoEditorHandles>;
  project: Project;
  onSelectionChange: (s: ShotstackClipSelection | null) => void;
  onPlaybackChange: (isPlaying: boolean) => void;
};

const ShotstackStudio: React.FC<Props> = ({ editorRef, project, onSelectionChange, onPlaybackChange }) => (
  <VideoEditor 
    ref={editorRef} 
    project={project} 
    onSelectionChange={onSelectionChange} 
    onPlaybackChange={onPlaybackChange}
  />
);

export default ShotstackStudio;