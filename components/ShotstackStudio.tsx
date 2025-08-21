import React from 'react';
import VideoEditor, { VideoEditorHandles } from './VideoEditor';
import { Project, ShotstackClipSelection } from '../types';

type Props = {
  editorRef: React.RefObject<VideoEditorHandles>;
  project: Project;
  onSelectionChange: (s: ShotstackClipSelection | null) => void;
};

const ShotstackStudio: React.FC<Props> = ({ editorRef, project, onSelectionChange }) => (
  <VideoEditor ref={editorRef} project={project} onSelectionChange={onSelectionChange} />
);

export default ShotstackStudio;
