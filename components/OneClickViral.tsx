import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { getSmartDefaults, generateCompleteVideo, autoExportAndPublish } from '../services/smartDefaultsService';
import { SparklesIcon, RocketLaunchIcon, PlayIcon } from './Icons';

interface OneClickViralProps {
  onVideoCreated: (projectId: string) => void;
  onExit: () => void;
}

const OneClickViral: React.FC<OneClickViralProps> = ({ onVideoCreated, onExit }) => {
  const { user, consumeCredits, addToast, lockAndExecute } = useAppContext();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [smartDefaults, setSmartDefaults] = useState<any>(null);

  const handleTopicChange = async (newTopic: string) => {
    setTopic(newTopic);
    if (newTopic.trim().length > 10) {
      // Analyze topic and get smart defaults
      const defaults = await getSmartDefaults(newTopic, user?.id);
      setSmartDefaults(defaults);
    }
  };

  const handleOneClickCreate = () => lockAndExecute(async () => {
    if (!topic.trim()) {
      addToast("Please enter a topic for your viral video!", "error");
      return;
    }

    if (!user) {
      addToast("Please log in to create videos", "error");
      return;
    }

    // Check credits (One-click mode costs 15 credits total)
    if (!await consumeCredits(15)) {
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Analyzing your topic...');

    try {
      // Step 1: Get smart defaults
      setGenerationStep('Getting smart defaults...');
      const defaults = await getSmartDefaults(topic, user.id);
      
      // Step 2: Generate complete video
      setGenerationStep('Generating your viral video...');
      const project = await generateCompleteVideo(topic, defaults, user.id);
      
      // Step 3: Auto-export and publish
      setGenerationStep('Publishing your video...');
      const publishResult = await autoExportAndPublish(project);
      
      addToast("🎉 Your viral video is live! Check your dashboard for the link.", 'success');
      onVideoCreated(project.id);
      
    } catch (error) {
      console.error('One-click creation error:', error);
      addToast(`Failed to create video: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  });

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="animate-spin w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-4">Creating Your Viral Video</h2>
          <p className="text-gray-300 mb-6">{generationStep}</p>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              <SparklesIcon className="w-4 h-4" />
              <span>AI is working its magic...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-8 max-w-2xl w-full border border-gray-700">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <RocketLaunchIcon className="w-12 h-12 text-indigo-400 mr-3" />
            <h1 className="text-4xl font-bold text-white">One-Click Viral</h1>
          </div>
          <p className="text-gray-300 text-lg">
            Enter your topic and we'll create a viral video in seconds
          </p>
        </div>

        {/* Topic Input */}
        <div className="mb-8">
          <label className="block text-white font-semibold mb-3">
            What's your video about?
          </label>
          <textarea
            value={topic}
            onChange={(e) => handleTopicChange(e.target.value)}
            placeholder="e.g., How to make the perfect coffee, Top 5 productivity hacks, Why cats are amazing..."
            className="w-full h-24 bg-gray-700/50 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-400">
              {topic.length}/500 characters
            </span>
            {smartDefaults && (
              <div className="flex items-center text-sm text-green-400">
                <SparklesIcon className="w-4 h-4 mr-1" />
                <span>Smart defaults ready!</span>
              </div>
            )}
          </div>
        </div>

        {/* Smart Defaults Preview */}
        {smartDefaults && (
          <div className="mb-8 bg-gray-700/30 rounded-xl p-6 border border-gray-600">
            <h3 className="text-white font-semibold mb-4 flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-indigo-400" />
              AI-Powered Settings
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Platform:</span>
                <span className="text-white ml-2 font-medium">{smartDefaults.platform}</span>
              </div>
              <div>
                <span className="text-gray-400">Style:</span>
                <span className="text-white ml-2 font-medium">{smartDefaults.style}</span>
              </div>
              <div>
                <span className="text-gray-400">Voice:</span>
                <span className="text-white ml-2 font-medium">{smartDefaults.voiceName}</span>
              </div>
              <div>
                <span className="text-gray-400">Length:</span>
                <span className="text-white ml-2 font-medium">{smartDefaults.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onExit}
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={handleOneClickCreate}
            disabled={!topic.trim() || !smartDefaults}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            Create Viral Video (15 Credits)
          </button>
        </div>

        {/* Features List */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <h4 className="text-white font-semibold mb-3">What happens next:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
              <span>AI generates script & visuals</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
              <span>Creates professional voiceover</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
              <span>Edits video automatically</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3"></div>
              <span>Publishes to YouTube</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneClickViral;
