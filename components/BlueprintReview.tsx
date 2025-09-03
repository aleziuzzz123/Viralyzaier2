import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Project, Script, Scene } from '../types';
import { invokeEdgeFunction } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { SparklesIcon } from './Icons';
import KeyboardShortcuts from './KeyboardShortcuts';

interface BlueprintReviewProps {
    project: Project;
    onApprove: () => void;
    onBack: () => void;
}

const BlueprintReview: React.FC<BlueprintReviewProps> = ({ project, onApprove, onBack }) => {
    const { addToast, handleUpdateProject } = useAppContext();
    const [editedScript, setEditedScript] = useState<Script | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>(project.voiceoverVoiceId || 'pNInz6obpgDQGcFmaJgB');
    const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [voiceoverProgress, setVoiceoverProgress] = useState<{ current: number; total: number } | null>(null);
    const [selectedHookIndex, setSelectedHookIndex] = useState<number>(0);
    const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
    const [expandedScene, setExpandedScene] = useState<number | null>(null);
    const [selectedMoodboardImage, setSelectedMoodboardImage] = useState<number | null>(null);
    const [selectedVisualStyle, setSelectedVisualStyle] = useState<string>('modern');
    const [editingHookIndex, setEditingHookIndex] = useState<number | null>(null);
    const [editingHookText, setEditingHookText] = useState('');
    const [processingStyle, setProcessingStyle] = useState<string | null>(null);
    const [styleApplicationMode, setStyleApplicationMode] = useState<'all' | 'specific'>('all');
    const [selectedSceneForStyle, setSelectedSceneForStyle] = useState<number | null>(null);
    const [showStoryboardModal, setShowStoryboardModal] = useState<{ sceneIndex: number; imageUrl: string } | null>(null);
    const [hoveredStoryboard, setHoveredStoryboard] = useState<{ sceneIndex: number; imageUrl: string; x: number; y: number } | null>(null);
    const [showCartoonSubstyles, setShowCartoonSubstyles] = useState(false);
    const [selectedCartoonStyle, setSelectedCartoonStyle] = useState<string>('anime');
    const [isAddingScene, setIsAddingScene] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Quality scoring system
  const [qualityScores, setQualityScores] = useState<{
    script: number;
    visual: number;
    viral: number;
    overall: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [improvementSuggestions, setImprovementSuggestions] = useState<string[]>([]);

  // Quality analysis function
  const analyzeBlueprintQuality = (script: Script) => {
    if (!script || !script.scenes || script.scenes.length === 0) return null;
    
    let scriptScore = 0;
    let visualScore = 0;
    let viralScore = 0;
    const suggestions: string[] = [];
    
    // Analyze script quality
    const totalScenes = script.scenes.length;
    const hasHook = script.hook && script.hook.length > 0;
    const hasCTA = script.cta && script.cta.length > 0;
    
    // Calculate average scene length safely
    const scenesWithVoiceover = script.scenes.filter(scene => scene.voiceover && scene.voiceover.length > 0);
    const avgSceneLength = scenesWithVoiceover.length > 0 
      ? scenesWithVoiceover.reduce((acc, scene) => acc + (scene.voiceover?.length || 0), 0) / scenesWithVoiceover.length
      : 0;
    
    // Script scoring (0-10) - More sophisticated scoring with caps
    if (hasHook) scriptScore += 3;
    if (hasCTA) scriptScore += 2;
    if (totalScenes >= 3 && totalScenes <= 8) scriptScore += 2;
    if (avgSceneLength >= 10 && avgSceneLength <= 30) scriptScore += 2;
    if (project.title && project.title.length > 0) scriptScore += 1;
    
    // Additional quality checks (with caps to prevent exceeding 10)
    if (hasHook && script.hook.length > 20 && scriptScore < 10) scriptScore += 1; // Detailed hook
    if (hasCTA && script.cta.length > 10 && scriptScore < 10) scriptScore += 1; // Detailed CTA
    
    // Cap script score at 10
    scriptScore = Math.min(scriptScore, 10);
    
    // Visual scoring (0-10) with caps
    const hasVisuals = script.scenes.some(scene => scene.visual && scene.visual.length > 0);
    const hasMoodboard = project.moodboard && project.moodboard.length > 0;
    if (hasVisuals) visualScore += 4;
    if (hasMoodboard) visualScore += 3;
    if (totalScenes >= 3) visualScore += 2;
    if (selectedVisualStyle === 'vibrant') visualScore += 1;
    
    // Cap visual score at 10
    visualScore = Math.min(visualScore, 10);
    
    // Viral scoring (0-10) with caps
    if (hasHook && script.hook.includes('!')) viralScore += 2;
    if (project.title && (project.title.includes('!') || project.title.includes('?'))) viralScore += 2;
    if (selectedVisualStyle === 'vibrant') viralScore += 3;
    if (project.videoSize === '9:16') viralScore += 2;
    if (hasCTA) viralScore += 1;
    
    // Cap viral score at 10
    viralScore = Math.min(viralScore, 10);
    
    // Generate more specific and actionable suggestions
    if (!hasHook) suggestions.push("🎯 Add a compelling hook in the first 3 seconds to grab attention");
    if (hasHook && script.hook.length < 20) suggestions.push("💡 Expand your hook with more details to increase engagement");
    if (!hasCTA) suggestions.push("📢 Add a clear call-to-action at the end to drive engagement");
    if (hasCTA && script.cta.length < 10) suggestions.push("🎯 Make your CTA more specific and actionable");
    if (totalScenes < 3) suggestions.push("📈 Add 2-3 more scenes for better story structure");
    if (totalScenes > 8) suggestions.push("✂️ Consider combining similar scenes for better focus");
    if (avgSceneLength < 10 && avgSceneLength > 0) suggestions.push("📝 Add more detail to scenes for better engagement");
    if (avgSceneLength > 30) suggestions.push("⚡ Keep scenes under 30 words for better retention");
    if (!hasVisuals) suggestions.push("🎨 Add visual descriptions to each scene for better storytelling");
    if (!hasMoodboard) suggestions.push("🖼️ Generate a moodboard for consistent visual style");
    if (project.videoSize === '16:9' && project.platform === 'youtube_short') suggestions.push("📱 Consider 9:16 format for better mobile viewing");
    if (scenesWithVoiceover.length === 0) suggestions.push("🎤 Add voiceover content to make your video more engaging");
    
    const overallScore = Math.round((scriptScore + visualScore + viralScore) / 3);
    
    return {
      script: scriptScore,
      visual: visualScore,
      viral: viralScore,
      overall: overallScore,
      suggestions
    };
  };

  // One-click improvement functions
  const handleImproveBlueprint = async () => {
    if (!editedScript) return;
    
    setIsAnalyzing(true);
    try {
      // Use AI to improve the blueprint
      const improvementPrompt = `You are a viral video expert. Improve this video script for maximum viral potential on ${project.platform || 'social media'}.

Current Script:
Title: ${project.title || 'Untitled'}
Hook: ${editedScript.hook || 'No hook'}
Scenes: ${editedScript.scenes.map((s, i) => `${i + 1}. ${s.voiceover || s.visual || 'No content'}`).join('\n')}
CTA: ${editedScript.cta || 'No CTA'}

Improve this script by:
1. Making the hook more compelling and attention-grabbing
2. Adding viral elements to scenes (emotions, surprises, relatability)
3. Creating a stronger call-to-action
4. Optimizing for ${project.platform || 'social media'} algorithms

Return a JSON object with: hook, scenes (array with voiceover and visual), cta`;

      const response = await invokeEdgeFunction('openai-proxy', {
        type: 'generateContent',
        params: {
          model: 'gpt-4o',
          contents: improvementPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        }
      });

      if ((response as any).text) {
        const improvedData = JSON.parse((response as any).text);
        const improvedScript = {
          ...editedScript,
          hook: improvedData.hook || editedScript.hook,
          scenes: improvedData.scenes || editedScript.scenes,
          cta: improvedData.cta || editedScript.cta
        };
        
        setEditedScript(improvedScript);
        setHasUnsavedChanges(true);
        addToast("Blueprint improved with AI analysis! 🚀", "success");
      } else {
        throw new Error('No improvement data received');
      }
    } catch (error) {
      console.error('Blueprint improvement error:', error);
      addToast("Failed to improve blueprint. Please try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOptimizeForViral = async () => {
    if (!editedScript) return;
    
    setIsAnalyzing(true);
    try {
      // Use AI to optimize for viral potential
      const viralOptimizationPrompt = `You are a viral content strategist. Optimize this video script specifically for viral potential on ${project.platform || 'social media'}.

Current Script:
Title: ${project.title || 'Untitled'}
Hook: ${editedScript.hook || 'No hook'}
Scenes: ${editedScript.scenes.map((s, i) => `${i + 1}. ${s.voiceover || s.visual || 'No content'}`).join('\n')}
CTA: ${editedScript.cta || 'No CTA'}

Apply viral optimization techniques:
1. Hook: Make it irresistible, create curiosity gap, add emotional trigger
2. Scenes: Add viral elements (shock, surprise, relatability, controversy, humor)
3. CTA: Make it urgent and action-oriented
4. Platform-specific: Optimize for ${project.platform || 'social media'} algorithm preferences

Return a JSON object with: hook, scenes (array with voiceover and visual), cta`;

      const response = await invokeEdgeFunction('openai-proxy', {
        type: 'generateContent',
        params: {
          model: 'gpt-4o',
          contents: viralOptimizationPrompt,
          config: {
            responseMimeType: 'application/json'
          }
        }
      });

      if ((response as any).text) {
        const optimizedData = JSON.parse((response as any).text);
        const optimizedScript = {
          ...editedScript,
          hook: optimizedData.hook || editedScript.hook,
          scenes: optimizedData.scenes || editedScript.scenes,
          cta: optimizedData.cta || editedScript.cta
        };
        
        setEditedScript(optimizedScript);
        setHasUnsavedChanges(true);
        addToast("Blueprint optimized for viral potential! 🔥", "success");
      } else {
        throw new Error('No optimization data received');
      }
    } catch (error) {
      console.error('Viral optimization error:', error);
      addToast("Failed to optimize blueprint. Please try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Memoize quality analysis to prevent unnecessary recalculations
  const qualityAnalysis = useMemo(() => {
    if (!editedScript) return null;
    return analyzeBlueprintQuality(editedScript);
  }, [editedScript, selectedVisualStyle, project.moodboard, project.videoSize, project.platform]);

  // Update quality scores when analysis changes
  useEffect(() => {
    if (qualityAnalysis) {
      setQualityScores({
        script: qualityAnalysis.script,
        visual: qualityAnalysis.visual,
        viral: qualityAnalysis.viral,
        overall: qualityAnalysis.overall
      });
      setImprovementSuggestions(qualityAnalysis.suggestions);
    } else {
      setQualityScores(null);
      setImprovementSuggestions([]);
    }
  }, [qualityAnalysis]);

  // Visual Style Options
  const visualStyles = [
    { id: 'modern', name: 'Modern & Clean', description: 'Sleek, contemporary visuals with clean lines', emoji: '✨' },
    { id: 'cinematic', name: 'Cinematic', description: 'Dramatic, movie-like visuals with depth', emoji: '🎬' },
    { id: 'vibrant', name: 'Vibrant & Colorful', description: 'Bright, energetic colors and dynamic compositions', emoji: '🌈' },
    { id: 'minimalist', name: 'Minimalist', description: 'Simple, clean designs with focus on content', emoji: '⚪' },
    { id: 'corporate', name: 'Corporate', description: 'Professional, business-focused imagery', emoji: '💼' },
    { id: 'artistic', name: 'Artistic', description: 'Creative, expressive visuals with artistic flair', emoji: '🎨' },
    { id: 'cartoon', name: 'Cartoon', description: 'Fun, animated style with playful characters', emoji: '🎭' }
  ];

  const cartoonStyles = [
    { id: 'anime', name: 'Anime', description: 'Japanese animation style with expressive characters', emoji: '🌸' },
    { id: 'disney', name: 'Disney', description: 'Classic Disney animation with magical storytelling', emoji: '🏰' },
    { id: 'pixar', name: 'Pixar', description: '3D animated style with realistic textures', emoji: '💡' },
    { id: 'comic', name: 'Comic Book', description: 'Bold, dynamic comic book art style', emoji: '💥' },
    { id: 'retro', name: 'Retro Cartoon', description: 'Vintage cartoon style from classic animation', emoji: '📺' },
    { id: 'kawaii', name: 'Kawaii', description: 'Cute, adorable style with pastel colors', emoji: '✨' }
  ];

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !project) return;
    
    try {
      setIsSaving(true);
      await handleUpdateProject(project.id, {
        script: project.script,
        moodboard: project.moodboard,
        voiceoverUrls: project.voiceoverUrls,
        assets: project.assets
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, project, handleUpdateProject]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Mark changes when user makes edits
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

    // Available voice options with enhanced descriptions
    const voiceOptions = [
        { 
            id: 'pNInz6obpgDQGcFmaJgB', 
            name: 'Sarah', 
            type: 'Professional Female',
            description: 'Clear, professional female voice perfect for business content, educational videos, and corporate presentations.',
            icon: '👩‍💼',
            color: 'bg-blue-500'
        },
        { 
            id: 'EXAVITQu4vr4xnSDxMaL', 
            name: 'Josh', 
            type: 'Friendly Male',
            description: 'Warm, friendly male voice great for casual content, vlogs, and conversational videos.',
            icon: '👨‍💻',
            color: 'bg-green-500'
        },
        { 
            id: 'VR6AewLTigWG4xSOukaG', 
            name: 'Arnold', 
            type: 'Deep Male',
            description: 'Deep, authoritative male voice perfect for dramatic content, documentaries, and serious topics.',
            icon: '🎭',
            color: 'bg-purple-500'
        },
        { 
            id: 'AZnzlk1XvdvUeBnXmlld', 
            name: 'Domi', 
            type: 'Energetic Female',
            description: 'An energetic, upbeat female voice great for dynamic content, tutorials, and motivational videos.',
            icon: '⚡',
            color: 'bg-yellow-500'
        },
        { 
            id: 'ErXwobaYiN019PkySvjV', 
            name: 'Antoni', 
            type: 'Smooth Male',
            description: 'A smooth, charismatic male voice perfect for lifestyle content, reviews, and entertainment.',
            icon: '🎤',
            color: 'bg-indigo-500'
        }
    ];

    // Voice preview function
    const previewVoice = useCallback(async (voiceId: string) => {
        if (previewingVoice === voiceId) {
            setPreviewingVoice(null);
            return;
        }
        
        setPreviewingVoice(voiceId);
        try {
            const sampleText = "This is a preview of how your voiceover will sound. Listen to the tone and style.";
            const response = await invokeEdgeFunction('elevenlabs-proxy', {
                type: 'tts',
                text: sampleText,
                voiceId
            });
            
            if (response && (response as any).audioUrl) {
                const audio = new Audio((response as any).audioUrl);
                audio.play();
                audio.onended = () => setPreviewingVoice(null);
            }
        } catch (error) {
            console.error('Error previewing voice:', error);
            setPreviewingVoice(null);
        }
    }, [previewingVoice]);

    useEffect(() => {
        if (project.script) {
            setEditedScript(project.script);
            
            // Auto-generate hooks if they don't exist
            if (!project.script.hooks || project.script.hooks.length === 0) {
                generateInitialHooks();
            }
        }
    }, [project.script]);

    // Auto-generate hooks when component loads
    const generateInitialHooks = async () => {
        if (!project.topic) return;
        
        try {
            setIsRegenerating('hook');
            const response = await invokeEdgeFunction('openai-proxy', {
                type: 'generateContent',
                params: {
                    model: 'gpt-4o',
                    contents: `Generate 5 engaging hooks for a video about "${project.topic}". Each hook should be 1-2 sentences and designed to capture attention immediately. Make them diverse, compelling, and viral-worthy.`,
                    config: {
                        systemInstruction: 'You are a viral video expert. Generate hooks that are attention-grabbing, emotional, and designed to make viewers want to watch more. Each hook should be unique and target different emotional triggers. Return only the hooks, one per line.'
                    }
                }
            });

            if ((response as any).text) {
                const newHooks = (response as any).text.split('\n').filter((hook: string) => hook.trim()).slice(0, 5);
                if (editedScript) {
                    setEditedScript({ ...editedScript, hooks: newHooks });
                }
                setSelectedHookIndex(0);
                addToast('Hooks generated! Choose your favorite to continue.', 'success');
            }
        } catch (error) {
            console.error('Error generating initial hooks:', error);
            addToast('Failed to generate hooks. You can generate them manually.', 'error');
        } finally {
            setIsRegenerating(null);
        }
    };

    const handleScriptChange = (field: string, value: any, sceneIndex?: number) => {
        if (!editedScript) return;

        if (sceneIndex !== undefined) {
            // Editing a specific scene
            const updatedScenes = [...editedScript.scenes];
            updatedScenes[sceneIndex] = { ...updatedScenes[sceneIndex], [field]: value };
            setEditedScript({ ...editedScript, scenes: updatedScenes });
        } else {
            // Editing script-level fields
            setEditedScript({ ...editedScript, [field]: value });
        }
    };

    // Handle inline hook editing
    const startEditingHook = (index: number, currentText: string) => {
        setEditingHookIndex(index);
        setEditingHookText(currentText);
    };

    const saveHookEdit = () => {
        if (editingHookIndex !== null && editedScript) {
            const newHooks = [...(editedScript.hooks || [])];
            newHooks[editingHookIndex] = editingHookText.trim();
            setEditedScript({ ...editedScript, hooks: newHooks });
            setEditingHookIndex(null);
            setEditingHookText('');
            setHasUnsavedChanges(true);
        }
    };

    const cancelHookEdit = () => {
        setEditingHookIndex(null);
        setEditingHookText('');
    };

    // Scene management functions
    const deleteScene = (sceneIndex: number) => {
        if (!editedScript || !editedScript.scenes) return;
        
        const newScenes = editedScript.scenes.filter((_, index) => index !== sceneIndex);
        setEditedScript({ ...editedScript, scenes: newScenes });
        setHasUnsavedChanges(true);
        addToast(`Scene ${sceneIndex + 1} deleted successfully`, 'success');
    };

    const addNewScene = async () => {
        if (!editedScript) return;
        
        setIsAddingScene(true);
        try {
            // Generate a new scene using AI
            const response = await invokeEdgeFunction('openai-proxy', {
                type: 'generateContent',
                params: {
                    model: 'gpt-4o',
                    contents: `Generate a new video scene for a viral video about "${project.topic}". Create a compelling visual description and voiceover text that fits with the existing scenes. Make it engaging and likely to go viral.`,
                    config: {
                        systemInstruction: 'You are a viral video expert. Generate a new scene with visual description and voiceover text. Return a JSON object with "visual" and "voiceover" fields.',
                        responseMimeType: 'application/json'
                    }
                }
            });

            if ((response as any).text) {
                let newScene;
                try {
                    const cleanedResponse = (response as any).text.replace(/```json|```/g, '').trim();
                    newScene = JSON.parse(cleanedResponse);
                } catch {
                    // Fallback if JSON parsing fails
                    newScene = {
                        visual: `A compelling visual scene for ${project.topic}`,
                        voiceover: `Engaging voiceover for this scene`
                    };
                }

                // Add the new scene
                const newScenes = [...(editedScript.scenes || []), newScene];
                setEditedScript({ ...editedScript, scenes: newScenes });
                setHasUnsavedChanges(true);
                addToast('New scene added successfully!', 'success');
            }
        } catch (error) {
            console.error('Error adding new scene:', error);
            addToast('Failed to add new scene - please try again', 'error');
        } finally {
            setIsAddingScene(false);
        }
    };

    // Regenerate individual hook
    const regenerateIndividualHook = async (index: number) => {
        if (!editedScript) return;
        
        setIsRegenerating(`hook-${index}`);
        try {
            const response = await invokeEdgeFunction('openai-proxy', {
                type: 'generateContent',
                params: {
                    model: 'gpt-4o',
                    contents: `Generate a new compelling hook for a viral video about "${project.topic}". Make it engaging, attention-grabbing, and likely to go viral. Keep it under 100 characters.`,
                    config: {
                        systemInstruction: 'You are a viral video expert. Generate a compelling hook that grabs attention in the first 3 seconds. Return only the hook text, nothing else.',
                        responseMimeType: 'text/plain'
                    }
                }
            });

            if ((response as any).text) {
                const newHooks = [...(editedScript.hooks || [])];
                newHooks[index] = (response as any).text.trim();
                setEditedScript({ ...editedScript, hooks: newHooks });
                addToast(`Hook ${index + 1} regenerated!`, 'success');
                setHasUnsavedChanges(true);
            }
        } catch (error) {
            console.error('Error regenerating hook:', error);
            addToast('Failed to regenerate hook - please try again', 'error');
        } finally {
            setIsRegenerating(null);
        }
    };

    const regenerateContent = async (type: 'title' | 'hook' | 'scene' | 'moodboard' | 'visual' | 'voiceover', sceneIndex?: number, styleId?: string) => {
        if (!editedScript) return;

        setIsRegenerating(type);
        try {
            if (type === 'hook') {
                // Regenerate hooks using OpenAI - FREE for users
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Generate 5 engaging hooks for a video about "${project.topic}". Each hook should be 1-2 sentences and designed to capture attention immediately. Make them diverse, compelling, and viral-worthy.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Generate hooks that are attention-grabbing, emotional, and designed to make viewers want to watch more. Each hook should be unique and target different emotional triggers. Return only the hooks, one per line.'
                        }
                    }
                });

                if ((response as any).text) {
                    const newHooks = (response as any).text.split('\n').filter((hook: string) => hook.trim()).slice(0, 5);
                    setEditedScript({ ...editedScript, hooks: newHooks });
                    setSelectedHookIndex(0); // Reset to first hook
                    addToast('New hooks generated successfully! Choose your favorite.', 'success');
                }
            } else if (type === 'moodboard') {
                if (sceneIndex !== undefined) {
                    // Regenerate individual scene storyboard
                    const styleToUse = styleId || selectedVisualStyle;
                    let selectedStyle, styleName, styleDescription;
                    
                    if (styleToUse && styleToUse.startsWith('cartoon-')) {
                        // Handle cartoon sub-styles
                        const cartoonSubStyle = cartoonStyles.find(style => style.id === styleToUse.replace('cartoon-', ''));
                        selectedStyle = cartoonSubStyle;
                        styleName = cartoonSubStyle?.name || 'Anime';
                        styleDescription = cartoonSubStyle?.description || 'Japanese animation style';
                    } else {
                        // Handle regular styles
                        selectedStyle = visualStyles.find(style => style.id === styleToUse);
                        styleName = selectedStyle?.name || 'Modern & Clean';
                        styleDescription = selectedStyle?.description || 'Clean and modern visuals';
                    }
                    
                    const scene = editedScript.scenes[sceneIndex];
                    
                    const response = await invokeEdgeFunction('openai-proxy', {
                        type: 'generateImages',
                        params: {
                            prompt: `Create a ${styleName.toLowerCase()} style storyboard image for this video scene: "${scene.visual}". The image should be visually striking, professional, and suitable for social media. Style: ${styleDescription}. Aspect ratio: ${project.videoSize || '16:9'}.`,
                            config: {
                                numberOfImages: 1,
                                aspectRatio: project.videoSize || '16:9'
                            }
                        }
                    });
                    
                    if ((response as any).generatedImages && (response as any).generatedImages[0]) {
                        const base64Data = (response as any).generatedImages[0].image.imageBytes;
                        const fileName = `storyboard-${Date.now()}-${sceneIndex}.png`;
                        const filePath = `${project.userId}/${project.id}/${fileName}`;
                        
                        const { data, error } = await supabase.storage
                            .from('assets')
                            .upload(filePath, Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)), {
                                contentType: 'image/png',
                                upsert: true
                            });
                        
                        if (!error && data) {
                            const { data: urlData } = supabase.storage
                                .from('assets')
                                .getPublicUrl(filePath);
                            
                            // Update the specific scene's storyboard image
                            const updatedScenes = [...editedScript.scenes];
                            updatedScenes[sceneIndex] = {
                                ...updatedScenes[sceneIndex],
                                storyboardImageUrl: urlData.publicUrl
                            };
                            setEditedScript({ ...editedScript, scenes: updatedScenes });
                            addToast(`Scene ${sceneIndex + 1} storyboard regenerated!`, 'success');
                        }
                    }
                } else {
                    // Regenerate all scene storyboards with new visual style
                    let selectedStyle, styleName, styleDescription;
                    
                    if (styleId && styleId.startsWith('cartoon-')) {
                        // Handle cartoon sub-styles
                        const cartoonSubStyle = cartoonStyles.find(style => style.id === styleId.replace('cartoon-', ''));
                        selectedStyle = cartoonSubStyle;
                        styleName = cartoonSubStyle?.name || 'Anime';
                        styleDescription = cartoonSubStyle?.description || 'Japanese animation style';
                    } else {
                        // Handle regular styles
                        selectedStyle = visualStyles.find(style => style.id === (styleId || selectedVisualStyle));
                        styleName = selectedStyle?.name || 'Modern & Clean';
                        styleDescription = selectedStyle?.description || 'Clean and modern visuals';
                    }
                    
                    // Generate storyboards for each scene
                    const imagePromises = editedScript.scenes?.map((scene, index) => 
                    invokeEdgeFunction('openai-proxy', {
                        type: 'generateImages',
                        params: {
                                prompt: `Create a ${styleName.toLowerCase()} style storyboard image for this video scene: "${scene.visual}". The image should be visually striking, professional, and suitable for social media. Style: ${styleDescription}. Aspect ratio: ${project.videoSize || '16:9'}.`,
                            config: {
                                numberOfImages: 1,
                                aspectRatio: project.videoSize || '16:9'
                            }
                        }
                    })
                    ) || [];

                const imageResponses = await Promise.all(imagePromises);
                    
                    // Update each scene with its new storyboard
                    const updatedScenes = [...editedScript.scenes];
                    for (let i = 0; i < imageResponses.length; i++) {
                        const response = imageResponses[i];
                        if ((response as any).generatedImages && (response as any).generatedImages[0]) {
                            const base64Data = (response as any).generatedImages[0].image.imageBytes;
                            const fileName = `storyboard-${Date.now()}-${i}.png`;
                        const filePath = `${project.userId}/${project.id}/${fileName}`;
                        
                        const { data, error } = await supabase.storage
                            .from('assets')
                            .upload(filePath, Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)), {
                                contentType: 'image/png',
                                upsert: true
                            });
                        
                        if (!error && data) {
                            const { data: urlData } = supabase.storage
                                .from('assets')
                                .getPublicUrl(filePath);
                                
                                // Update the specific scene's storyboard
                                updatedScenes[i] = {
                                    ...updatedScenes[i],
                                    storyboardImageUrl: urlData.publicUrl
                                };
                            }
                        }
                    }
                    
                    // Update the script with new storyboards
                    setEditedScript({ ...editedScript, scenes: updatedScenes });
                    addToast(`Visual style "${styleName}" applied to all scenes!`, 'success');
                }
            } else if (type === 'scene' && sceneIndex !== undefined) {
                // Regenerate specific scene - use separate visual and voiceover calls for better reliability
                const scene = editedScript.scenes[sceneIndex];
                
                try {
                    // Generate improved visual description
                    const visualResponse = await invokeEdgeFunction('openai-proxy', {
                        type: 'generateContent',
                        params: {
                            model: 'gpt-4o',
                            contents: `Improve this visual description for a viral video about "${project.topic}": "${scene.visual}". Make it more engaging, specific, and visually striking. Keep it concise and under 50 words.`,
                            config: {
                                systemInstruction: 'You are a viral video expert. Improve the visual description to make it more engaging and likely to go viral. Return only the improved visual description text, nothing else. Keep it short and punchy.',
                                responseMimeType: 'text/plain'
                            }
                        }
                    });

                    // Generate improved voiceover
                    const voiceoverResponse = await invokeEdgeFunction('openai-proxy', {
                        type: 'generateContent',
                        params: {
                            model: 'gpt-4o',
                            contents: `Improve this voiceover text for a viral video about "${project.topic}": "${scene.voiceover}". Make it more engaging, emotional, and likely to go viral. Keep it short and punchy, under 30 words.`,
                            config: {
                                systemInstruction: 'You are a viral video expert. Improve the voiceover text to make it more engaging and likely to go viral. Return only the improved voiceover text, nothing else. Keep it short and punchy.',
                                responseMimeType: 'text/plain'
                            }
                        }
                    });

                    const improvedVisual = (visualResponse as any).text?.trim() || scene.visual;
                    const improvedVoiceover = (voiceoverResponse as any).text?.trim() || scene.voiceover;

                    const updatedScenes = [...editedScript.scenes];
                    updatedScenes[sceneIndex] = {
                        ...updatedScenes[sceneIndex],
                        visual: improvedVisual,
                        voiceover: improvedVoiceover
                    };
                    setEditedScript({ ...editedScript, scenes: updatedScenes });
                    addToast('Scene regenerated successfully!', 'success');
                    
                } catch (error) {
                    console.error('Error regenerating scene:', error);
                    addToast('Failed to regenerate scene - please try again', 'error');
                }
            } else if (type === 'visual' && sceneIndex !== undefined) {
                // Regenerate only visual description
                const scene = editedScript.scenes[sceneIndex];
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Create a more engaging visual description for this video scene about "${project.topic}". Current visual: "${scene.visual}". Make it more vivid, emotional, and viral-worthy.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Create a compelling visual description that will grab attention and make viewers want to watch. Return only the improved visual description text, no JSON or formatting.',
                            responseMimeType: 'text/plain'
                        }
                    }
                });

                if ((response as any).text) {
                    const improvedVisual = (response as any).text.trim();
                        const updatedScenes = [...editedScript.scenes];
                        updatedScenes[sceneIndex] = {
                            ...updatedScenes[sceneIndex],
                        visual: improvedVisual
                        };
                        setEditedScript({ ...editedScript, scenes: updatedScenes });
                    addToast('Visual description improved!', 'success');
                } else {
                    addToast('Failed to regenerate visual description', 'error');
                }
            } else if (type === 'voiceover' && sceneIndex !== undefined) {
                // Regenerate only voiceover text
                const scene = editedScript.scenes[sceneIndex];
                const response = await invokeEdgeFunction('openai-proxy', {
                    type: 'generateContent',
                    params: {
                        model: 'gpt-4o',
                        contents: `Create a more engaging voiceover script for this video scene about "${project.topic}". Current voiceover: "${scene.voiceover}". Make it more compelling, emotional, and viral-worthy.`,
                        config: {
                            systemInstruction: 'You are a viral video expert. Create a compelling voiceover script that will engage viewers and make them want to watch more. Return only the improved voiceover text, no JSON or formatting.',
                            responseMimeType: 'text/plain'
                        }
                    }
                });

                if ((response as any).text) {
                    const improvedVoiceover = (response as any).text.trim();
                    const updatedScenes = [...editedScript.scenes];
                    updatedScenes[sceneIndex] = {
                        ...updatedScenes[sceneIndex],
                        voiceover: improvedVoiceover
                    };
                    setEditedScript({ ...editedScript, scenes: updatedScenes });
                    addToast('Voiceover text improved!', 'success');
                } else {
                    addToast('Failed to regenerate voiceover text', 'error');
                }
            }
        } catch (error) {
            console.error(`Error regenerating ${type}:`, error);
            addToast(`Failed to regenerate ${type}`, 'error');
        } finally {
            setIsRegenerating(null);
        }
    };

    const handleVoiceChange = async (voiceId: string) => {
        setSelectedVoiceId(voiceId);
        
        try {
            // Regenerate voiceovers with new voice - SEQUENTIALLY to avoid rate limiting
            if (editedScript && editedScript.scenes) {
                const voiceoverUrls: (string | null)[] = [];
                const totalScenes = editedScript.scenes.length;
                
                // Set initial progress
                setVoiceoverProgress({ current: 0, total: totalScenes });
                
                console.log(`🎤 Starting sequential voiceover generation for ${totalScenes} scenes...`);
                
                for (let index = 0; index < editedScript.scenes.length; index++) {
                    const scene = editedScript.scenes[index];
                    
                    // Update progress
                    setVoiceoverProgress({ current: index + 1, total: totalScenes });
                    
                    if (!scene.voiceover) {
                        console.log(`⏭️ Skipping scene ${index + 1}/${totalScenes} - no voiceover text`);
                        voiceoverUrls.push(null);
                        continue;
                    }

                    // Sanitize text content to avoid ElevenLabs issues
                    const sanitizedText = scene.voiceover
                        .replace(/[^\w\s.,!?;:'"()-]/g, '') // Remove special characters
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();

                    if (!sanitizedText || sanitizedText.length < 3) {
                        console.warn(`Scene ${index + 1}/${totalScenes} has invalid text content, skipping:`, scene.voiceover);
                        voiceoverUrls.push(null);
                        continue;
                    }

                    // Additional debugging for scene 3 specifically
                    if (index === 3) {
                        console.log(`🔍 SCENE 3 DEBUG:`, {
                            originalText: scene.voiceover,
                            sanitizedText: sanitizedText,
                            originalLength: scene.voiceover.length,
                            sanitizedLength: sanitizedText.length,
                            hasSpecialChars: /[^\w\s.,!?;:'"()-]/.test(scene.voiceover),
                            voiceId
                        });
                    }

                    // Retry logic for failed voiceovers
                    const maxRetries = 2;
                    let lastError = null;
                    let success = false;

                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            console.log(`🎤 Generating voiceover for scene ${index + 1}/${totalScenes} (attempt ${attempt}/${maxRetries}):`, {
                                originalText: scene.voiceover,
                                sanitizedText: sanitizedText,
                                textLength: sanitizedText.length,
                                voiceId
                            });
                            
                            const response = await invokeEdgeFunction('elevenlabs-proxy', {
                                type: 'tts',
                                text: sanitizedText,
                                voiceId
                            });
                            
                            console.log(`🎤 Voiceover response for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, response);

                            if (response && (response as any).audioUrl) {
                                voiceoverUrls.push((response as any).audioUrl);
                                success = true;
                                console.log(`✅ Successfully generated voiceover for scene ${index + 1}/${totalScenes}`);
                                break;
                            } else {
                                console.error(`No audio URL returned for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, response);
                                lastError = new Error(`No audio URL returned for scene ${index + 1}`);
                            }
                        } catch (voiceError) {
                            console.error(`Error generating voiceover for scene ${index + 1}/${totalScenes} (attempt ${attempt}):`, voiceError);
                            lastError = voiceError;
                            
                            // Check if it's a subscription error
                            const errorMessage = voiceError?.message || voiceError?.toString() || '';
                            if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                                console.error('ElevenLabs subscription issue detected for scene', index + 1);
                                // Don't retry subscription errors
                                break;
                            }
                            
                            // Wait before retrying
                            if (attempt < maxRetries) {
                                const delay = 2000; // 2 second delay between retries
                                console.log(`⏳ Waiting ${delay}ms before retry for scene ${index + 1}/${totalScenes}...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                    }
                    
                    // If all retries failed, log the final error
                    if (!success) {
                        voiceoverUrls.push(null);
                        if (lastError) {
                            const errorMessage = lastError?.message || lastError?.toString() || '';
                            if (errorMessage.includes('subscription') || errorMessage.includes('payment')) {
                                console.error(`Scene ${index + 1}/${totalScenes} failed with subscription issue:`, errorMessage);
                            }
                        }
                    }
                    
                    // Add delay between scenes to avoid rate limiting (except for the last scene)
                    if (index < editedScript.scenes.length - 1) {
                        const delayBetweenScenes = 3000; // 3 second delay between scenes
                        console.log(`⏳ Waiting ${delayBetweenScenes}ms before processing next scene...`);
                        await new Promise(resolve => setTimeout(resolve, delayBetweenScenes));
                    }
                }
                
                console.log(`🎤 Completed sequential voiceover generation. Results: ${voiceoverUrls.filter(url => url !== null).length}/${totalScenes} successful`);
                
                // Clear progress
                setVoiceoverProgress(null);
                
                const validUrls = voiceoverUrls.filter(url => url !== null);
                const successCount = validUrls.length;
                
                if (validUrls.length > 0) {
                    // Convert array to object with string keys
                    const voiceoverUrlsObject: { [key: string]: string } = {};
                    validUrls.forEach((url, index) => {
                        if (url) {
                            voiceoverUrlsObject[index.toString()] = url;
                        }
                    });
                    
                    await handleUpdateProject(project.id, { 
                        voiceoverUrls: voiceoverUrlsObject,
                        voiceoverVoiceId: voiceId
                    });
                    
                    if (successCount === totalScenes) {
                        addToast('Voiceover updated with new narrator!', 'success');
                    } else {
                        addToast(`Voiceover updated! ${successCount}/${totalScenes} scenes generated successfully. You can still proceed to the editor.`, 'info');
                    }
                } else {
                    // Still update the voice ID even if voiceovers failed
                    await handleUpdateProject(project.id, { 
                        voiceoverVoiceId: voiceId
                    });
                    addToast('Voiceover generation failed, but you can still proceed to the editor. Voiceovers can be added later.', 'info');
                }
            }
        } catch (error) {
            console.error('Error updating voiceover:', error);
            addToast('Failed to update voiceover', 'error');
            setVoiceoverProgress(null); // Clear progress on error
        }
    };

    const handleSaveAndContinue = async () => {
        if (!editedScript) return;

        setIsSaving(true);
        try {
            await handleUpdateProject(project.id, { 
                script: editedScript,
                voiceoverVoiceId: selectedVoiceId,
                workflowStep: 4 // Move to Creative Studio
            });
            
            addToast('Blueprint saved successfully!', 'success');
            onApprove();
        } catch (error) {
            console.error('Error saving blueprint:', error);
            addToast('Failed to save blueprint', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!editedScript) {
        return (
            <div className="text-center py-20 px-6 bg-gray-800/50 rounded-2xl max-w-2xl mx-auto space-y-6 animate-fade-in">
                <h2 className="text-3xl font-bold text-white">Loading Your Blueprint</h2>
                <p className="text-gray-400">Preparing your content for review...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-6">
            <KeyboardShortcuts 
                onSave={autoSave}
                onNext={onApprove}
                onPrevious={onBack}
            />
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Professional Header */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                        <SparklesIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white">Review Your Blueprint</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Perfect your content before creating your video. Make it viral-worthy.
                    </p>
                    {/* Auto-save status */}
                    <div className="flex items-center justify-center gap-2 text-sm">
                        {isSaving ? (
                            <span className="text-yellow-400 flex items-center gap-1">
                                <div className="w-3 h-3 border border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                            </span>
                        ) : hasUnsavedChanges ? (
                            <span className="text-orange-400">● Unsaved changes</span>
                        ) : lastSaved ? (
                            <span className="text-green-400">✓ Saved {lastSaved.toLocaleTimeString()}</span>
                        ) : null}
                    </div>
                </div>

                {/* Quality Scoring System */}
                {qualityScores && (
                    <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 p-6 rounded-2xl border border-indigo-500/30">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-indigo-400" />
                                Blueprint Quality Score
                            </h3>
                            <div className="text-right">
                                <div className="text-3xl font-bold text-white">{qualityScores.overall || 0}/10</div>
                                <div className="text-sm text-gray-400">Overall Score</div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-300">Script Quality</span>
                                    <span className="text-lg font-bold text-white">{qualityScores.script || 0}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${((qualityScores.script || 0) / 10) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-300">Visual Appeal</span>
                                    <span className="text-lg font-bold text-white">{qualityScores.visual || 0}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${((qualityScores.visual || 0) / 10) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-800/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-300">Viral Potential</span>
                                    <span className="text-lg font-bold text-white">{qualityScores.viral || 0}/10</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${((qualityScores.viral || 0) / 10) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                        
                        {/* One-Click Improvement Buttons */}
                        <div className="flex flex-wrap gap-3 mb-4">
                            <button
                                onClick={handleImproveBlueprint}
                                disabled={isAnalyzing}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                {isAnalyzing ? 'Improving...' : 'Improve Blueprint'}
                                <span className="ml-2 text-xs bg-blue-500/30 px-2 py-1 rounded-full">2 Credits</span>
                            </button>
                            
                            <button
                                onClick={handleOptimizeForViral}
                                disabled={isAnalyzing}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <SparklesIcon className="w-4 h-4 mr-2" />
                                {isAnalyzing ? 'Optimizing...' : 'Optimize for Viral'}
                                <span className="ml-2 text-xs bg-purple-500/30 px-2 py-1 rounded-full">3 Credits</span>
                            </button>
                        </div>
                        
                        {/* Improvement Suggestions */}
                        {improvementSuggestions.length > 0 && (
                            <div className="bg-gray-800/30 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-yellow-400 mb-2">💡 Improvement Suggestions:</h4>
                                <ul className="space-y-1">
                                    {improvementSuggestions.map((suggestion, index) => (
                                        <li key={index} className="text-sm text-gray-300 flex items-start gap-2">
                                            <span className="text-yellow-400 mt-0.5">•</span>
                                            {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Progress Indicator */}
                <div className="flex justify-center">
                    <div className="flex items-center space-x-4 bg-gray-800/50 rounded-2xl px-6 py-3 border border-gray-700">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">3</span>
                            </div>
                            <span className="text-white font-semibold">Review & Edit</span>
                        </div>
                        <div className="w-px h-6 bg-gray-600"></div>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5, 6].map((step) => (
                                <div
                                    key={step}
                                    className={`w-2 h-2 rounded-full ${
                                        step <= 3 ? 'bg-indigo-600' : 'bg-gray-600'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            
                {/* Professional Hook Selection Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎯 Choose Your Hook</h2>
                            <p className="text-gray-300">Pick the most compelling hook from the options below, or generate new ones if needed</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('hook')}
                            disabled={isRegenerating === 'hook'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'hook' ? 'Generating...' : 'Generate Different Hooks (FREE)'}
                        </button>
                    </div>
                    
                    {/* Hook Selection Grid */}
                    {isRegenerating === 'hook' ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                                <p className="text-gray-300">Generating compelling hooks for your video...</p>
                            </div>
                        </div>
                    ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(editedScript.hooks || []).map((hook, index) => (
                            <div 
                                key={index} 
                                className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                    selectedHookIndex === index 
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                                }`}
                                onClick={() => setSelectedHookIndex(index)}
                            >
                                {/* Selection Indicator */}
                                {selectedHookIndex === index && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-semibold text-gray-300">Hook {index + 1}</span>
                                    <div className="flex gap-2">
                                        {/* Regenerate Icon */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                regenerateIndividualHook(index);
                                            }}
                                            disabled={isRegenerating === `hook-${index}`}
                                            className="text-xs text-purple-400 hover:text-purple-300 p-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                                            title="Regenerate this hook"
                                        >
                                            {isRegenerating === `hook-${index}` ? (
                                                <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-400"></div>
                                            ) : (
                                                <SparklesIcon className="w-3 h-3" />
                                            )}
                                        </button>
                                        
                                        {/* Edit Icon */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditingHook(index, hook);
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 transition-colors"
                                            title="Edit this hook"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Hook Content - Inline Editing */}
                                {editingHookIndex === index ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={editingHookText}
                                            onChange={(e) => setEditingHookText(e.target.value)}
                                            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm resize-none focus:border-indigo-500 focus:outline-none"
                                            rows={3}
                                            placeholder="Enter your hook..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    saveHookEdit();
                                                }}
                                                className="text-xs text-green-400 hover:text-green-300 px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    cancelHookEdit();
                                                }}
                                                className="text-xs text-gray-400 hover:text-gray-300 px-3 py-1 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                <p className="text-white text-sm leading-relaxed">{hook}</p>
                                )}
                            </div>
                        ))}
                    </div>
                    )}
                    
                    {/* Selected Hook Preview */}
                    {!isRegenerating && editedScript.hooks && editedScript.hooks[selectedHookIndex] && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-indigo-400 font-semibold">Selected Hook:</span>
                                <span className="text-white font-bold">#{selectedHookIndex + 1}</span>
                            </div>
                            <p className="text-white text-lg leading-relaxed">
                                "{editedScript.hooks[selectedHookIndex]}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Professional Video Scenes Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎬 Video Scenes</h2>
                            <p className="text-gray-300">Review and edit your video script content. Use the sparkle icons to regenerate individual scene text.</p>
                        </div>
                        <button
                            onClick={() => regenerateContent('scene')}
                            disabled={isRegenerating === 'scene'}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                        >
                            <SparklesIcon className="w-5 h-5 mr-2" />
                            {isRegenerating === 'scene' ? 'Regenerating...' : 'Regenerate All Scripts (FREE)'}
                        </button>
                    </div>

                    {/* Global Visual Style Selection */}
                    <div className={`mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700 relative ${processingStyle ? 'opacity-75' : ''}`}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-white">🎨 Choose Your Visual Style</h3>
                            <div className="flex items-center gap-2">
                                {processingStyle && (
                                    <div className="flex items-center gap-2 text-indigo-400">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b border-indigo-400"></div>
                                        <span className="text-sm">Applying style...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Application Mode Selection */}
                        <div className="mb-4">
                            <div className="flex items-center gap-4 mb-3">
                                <span className="text-sm text-gray-300">Apply to:</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStyleApplicationMode('all')}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            styleApplicationMode === 'all'
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        }`}
                                    >
                                        All Scenes
                                    </button>
                                    <button
                                        onClick={() => setStyleApplicationMode('specific')}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            styleApplicationMode === 'specific'
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                        }`}
                                    >
                                        Specific Scene
                                    </button>
                                </div>
                            </div>
                            
                            {styleApplicationMode === 'specific' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-300">Select scene:</span>
                                    <select
                                        value={selectedSceneForStyle || ''}
                                        onChange={(e) => setSelectedSceneForStyle(parseInt(e.target.value))}
                                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Choose scene...</option>
                                        {editedScript.scenes?.map((_, index) => (
                                            <option key={index} value={index}>
                                                Scene {index + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {visualStyles.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={async () => {
                                        if (style.id === 'cartoon') {
                                            // Show cartoon sub-styles instead of applying immediately
                                            setShowCartoonSubstyles(true);
                                            setSelectedVisualStyle('cartoon');
                                            return;
                                        }
                                        
                                        if (styleApplicationMode === 'specific' && selectedSceneForStyle === null) {
                                            addToast('Please select a scene first', 'error');
                                            return;
                                        }
                                        
                                        setProcessingStyle(style.id);
                                        setSelectedVisualStyle(style.id);
                                        setShowCartoonSubstyles(false);
                                        
                                        if (styleApplicationMode === 'all') {
                                            // Regenerate all storyboards with new style
                                            await regenerateContent('moodboard', undefined, style.id);
                                        } else {
                                            // Regenerate specific scene storyboard
                                            await regenerateContent('moodboard', selectedSceneForStyle, style.id);
                                        }
                                        
                                        setProcessingStyle(null);
                                    }}
                                    disabled={isRegenerating === 'moodboard' || processingStyle !== null}
                                    className={`p-3 rounded-lg border transition-all duration-300 text-left disabled:opacity-50 ${
                                        selectedVisualStyle === style.id
                                            ? 'border-indigo-500 bg-indigo-500/20 shadow-lg'
                                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700/70'
                                    }`}
                                >
                                    {processingStyle === style.id ? (
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mb-2"></div>
                                            <div className="text-sm font-semibold text-indigo-400">Processing...</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xl mb-2">{style.emoji}</div>
                                            <div className="text-sm font-semibold text-white mb-1">{style.name}</div>
                                            <div className="text-xs text-gray-400 leading-tight">{style.description}</div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                        
                        {/* Cartoon Sub-styles */}
                        {showCartoonSubstyles && (
                            <div className="mt-6 p-4 bg-purple-900/20 rounded-xl border border-purple-500/30">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-white">🎭 Choose Cartoon Style</h4>
                                    <button
                                        onClick={() => {
                                            setShowCartoonSubstyles(false);
                                            setSelectedVisualStyle('modern'); // Reset to default
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {cartoonStyles.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={async () => {
                                                if (styleApplicationMode === 'specific' && selectedSceneForStyle === null) {
                                                    addToast('Please select a scene first', 'error');
                                                    return;
                                                }
                                                
                                                setProcessingStyle(`cartoon-${style.id}`);
                                                setSelectedCartoonStyle(style.id);
                                                
                                                // Use cartoon style with specific sub-style
                                                const combinedStyle = `cartoon-${style.id}`;
                                                
                                                if (styleApplicationMode === 'all') {
                                                    await regenerateContent('moodboard', undefined, combinedStyle);
                                                } else {
                                                    await regenerateContent('moodboard', selectedSceneForStyle, combinedStyle);
                                                }
                                                
                                                setProcessingStyle(null);
                                                setShowCartoonSubstyles(false);
                                            }}
                                            disabled={isRegenerating === `cartoon-${style.id}` || processingStyle !== null}
                                            className={`p-3 rounded-lg border transition-all duration-300 text-left disabled:opacity-50 ${
                                                selectedCartoonStyle === style.id
                                                    ? 'border-purple-500 bg-purple-500/20 shadow-lg'
                                                    : 'border-purple-600 bg-purple-700/30 hover:border-purple-500 hover:bg-purple-700/50'
                                            }`}
                                        >
                                            {processingStyle === `cartoon-${style.id}` ? (
                                                <div className="flex flex-col items-center justify-center py-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mb-2"></div>
                                                    <div className="text-sm font-semibold text-purple-400">Processing...</div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="text-xl mb-2">{style.emoji}</div>
                                                    <div className="text-sm font-semibold text-white mb-1">{style.name}</div>
                                                    <div className="text-xs text-gray-300 leading-tight">{style.description}</div>
                                                </>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid lg:grid-cols-2 gap-6">
                        {editedScript.scenes?.map((scene, index) => (
                            <div key={index} className="bg-gray-700/30 rounded-xl p-6 border border-gray-600 hover:border-gray-500 transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Scene {index + 1}</h3>
                                    </div>
                                    <button
                                        onClick={() => setExpandedScene(expandedScene === index ? null : index)}
                                        className="text-gray-400 hover:text-white transition-colors"
                                    >
                                        {expandedScene === index ? '▼' : '▶'}
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Storyboard Image - 16:9 Aspect Ratio */}
                                    {scene.storyboardImageUrl && (
                                        <div className="relative group">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-gray-300 text-sm font-semibold">Storyboard</label>
                                                <button
                                                    onClick={() => regenerateContent('moodboard', index)}
                                                    disabled={isRegenerating === 'moodboard'}
                                                    className="p-1 text-gray-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                                                    title="Regenerate storyboard image"
                                                >
                                                    {isRegenerating === 'moodboard' ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b border-indigo-400"></div>
                                                    ) : (
                                                        <SparklesIcon className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            
                                            <div 
                                                className="relative cursor-pointer rounded-lg overflow-hidden border-2 border-gray-600 hover:border-indigo-500 transition-all duration-300 group-hover:shadow-lg"
                                                onClick={() => {
                                                    setShowStoryboardModal({ 
                                                        sceneIndex: index, 
                                                        imageUrl: scene.storyboardImageUrl 
                                                    });
                                                }}
                                                onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoveredStoryboard({
                                                        sceneIndex: index,
                                                        imageUrl: scene.storyboardImageUrl,
                                                        x: rect.left + rect.width / 2,
                                                        y: rect.top - 10
                                                    });
                                                }}
                                                onMouseLeave={() => setHoveredStoryboard(null)}
                                                title="Click to view full size"
                                            >
                                                <img 
                                                    src={scene.storyboardImageUrl} 
                                                    alt={`Scene ${index + 1} storyboard`}
                                                    className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${project.videoSize === '9:16' ? 'aspect-[9/16]' : 'aspect-video'}`}
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                                    <div className="text-center">
                                                        <svg className="w-6 h-6 text-white mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                        </svg>
                                                        <span className="text-white text-sm font-semibold">Click to View Full</span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                    
                                    {/* Visual Description */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-gray-300 text-sm font-semibold">Visual Description</label>
                                            <button
                                                onClick={() => regenerateContent('visual', index)}
                                                disabled={isRegenerating === 'visual'}
                                                className="p-1 text-gray-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                                                title="Regenerate visual description"
                                            >
                                                {isRegenerating === 'visual' ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-indigo-400"></div>
                                                ) : (
                                                    <SparklesIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <textarea
                                            value={scene.visual}
                                            onChange={(e) => handleScriptChange('visual', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                                            rows={3}
                                            placeholder="Describe what viewers will see..."
                                        />
                                    </div>
                                    
                                    {/* Voiceover Text */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-gray-300 text-sm font-semibold">🎤 Voiceover Script</label>
                                            <button
                                                onClick={() => regenerateContent('voiceover', index)}
                                                disabled={isRegenerating === 'voiceover'}
                                                className="p-1 text-gray-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                                                title="Regenerate voiceover text"
                                            >
                                                {isRegenerating === 'voiceover' ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-indigo-400"></div>
                                                ) : (
                                                    <SparklesIcon className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <textarea
                                            value={scene.voiceover}
                                            onChange={(e) => handleScriptChange('voiceover', e.target.value, index)}
                                            className="w-full bg-gray-800/50 text-white placeholder-gray-400 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                                            rows={3}
                                            placeholder="What will be said in this scene..."
                                        />
                                    </div>
                                    
                                    {/* Scene Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => regenerateContent('scene', index)}
                                            disabled={isRegenerating === 'scene'}
                                            className="flex-1 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Regenerate Script
                                        </button>
                                        <button
                                            onClick={() => deleteScene(index)}
                                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors text-sm"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {/* Add Scene Button */}
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={addNewScene}
                                disabled={isAddingScene}
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                {isAddingScene ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        Adding Scene...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        Add New Scene
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Professional Voice Selection Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">🎤 Choose Your Voice</h2>
                            <p className="text-gray-300">Select the perfect voice for your video. Click the play button to preview each voice.</p>
                        </div>
                        {voiceoverProgress && (
                            <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-2">
                                <div className="text-indigo-400 font-semibold text-sm">
                                    Generating voiceover {voiceoverProgress.current}/{voiceoverProgress.total}...
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voiceOptions.map((voice) => (
                            <div
                                key={voice.id}
                                className={`relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                    selectedVoiceId === voice.id 
                                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' 
                                        : 'border-gray-600 bg-gray-700/30 hover:border-gray-500 hover:bg-gray-700/50'
                                }`}
                                onClick={() => handleVoiceChange(voice.id)}
                            >
                                {/* Selection Indicator */}
                                {selectedVoiceId === voice.id && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-sm">✓</span>
                                    </div>
                                )}
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${voice.color}`}>
                                        {voice.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-white text-lg">{voice.name}</h3>
                                        <p className="text-gray-400 text-sm">{voice.type}</p>
                                    </div>
                                </div>
                                
                                <p className="text-gray-300 text-sm leading-relaxed mb-4">
                                    {voice.description}
                                </p>
                                
                                {/* Preview Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        previewVoice(voice.id);
                                    }}
                                    disabled={previewingVoice === voice.id}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/50 hover:bg-gray-600/70 disabled:bg-gray-700/50 text-white font-medium rounded-lg transition-colors"
                                >
                                    {previewingVoice === voice.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Playing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>▶️</span>
                                            <span>Preview Voice</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    {/* Selected Voice Info */}
                    {selectedVoiceId && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm">✓</span>
                                </div>
                                <div>
                                    <span className="text-indigo-400 font-semibold">Selected Voice:</span>
                                    <span className="text-white font-bold ml-2">
                                        {voiceOptions.find(v => v.id === selectedVoiceId)?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>



                {/* Professional Action Section */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700 shadow-2xl">
                    <div className="text-center space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Create Your Video?</h2>
                            <p className="text-gray-300">Your blueprint is ready! Click below to proceed to the Creative Studio.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button 
                                onClick={onBack}
                                className="inline-flex items-center justify-center px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                <span className="mr-2">←</span>
                                Back to Blueprint
                            </button>
                            
                            <button 
                                onClick={handleSaveAndContinue}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                            >
                                <SparklesIcon className="w-6 h-6 mr-3" />
                                {isSaving ? 'Saving...' : 'Continue to Creative Studio →'}
                            </button>
                        </div>
                        
                        {/* Progress Summary */}
                        <div className="flex justify-center">
                            <div className="flex items-center space-x-4 bg-gray-700/50 rounded-xl px-6 py-3 border border-gray-600">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                    <span className="text-emerald-400 font-semibold text-sm">Blueprint Complete</span>
                                </div>
                                <div className="w-px h-4 bg-gray-600"></div>
                                <div className="text-gray-400 text-sm">
                                    Stage 3 of 6 • Ready for Creative Studio
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Hover Preview Tooltip */}
            {hoveredStoryboard && (
                <div 
                    className="fixed z-40 pointer-events-none"
                    style={{
                        left: `${hoveredStoryboard.x}px`,
                        top: `${hoveredStoryboard.y}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 p-2 max-w-sm">
                        <img 
                            src={hoveredStoryboard.imageUrl} 
                            alt={`Scene ${hoveredStoryboard.sceneIndex + 1} preview`}
                            className="w-64 h-36 object-cover rounded"
                        />
                        <div className="text-center mt-2">
                            <p className="text-white text-sm font-semibold">Scene {hoveredStoryboard.sceneIndex + 1}</p>
                            <p className="text-gray-400 text-xs">Click to view full size</p>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Fullscreen Storyboard Modal */}
            {showStoryboardModal && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="relative max-w-4xl max-h-[90vh] w-full">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowStoryboardModal(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        {/* Image Container */}
                        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-xl font-bold text-white">Scene {showStoryboardModal.sceneIndex + 1} Storyboard</h3>
                                <p className="text-gray-400 text-sm">Click regenerate to create a new storyboard image</p>
                            </div>
                            
                            <div className="p-4">
                                <img 
                                    src={showStoryboardModal.imageUrl} 
                                    alt={`Scene ${showStoryboardModal.sceneIndex + 1} storyboard`}
                                    className="w-full max-h-[60vh] object-contain rounded-lg"
                                />
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="p-4 border-t border-gray-700 flex gap-3">
                                <button
                                    onClick={async () => {
                                        await regenerateContent('moodboard', showStoryboardModal.sceneIndex);
                                        setShowStoryboardModal(null);
                                    }}
                                    disabled={isRegenerating === 'moodboard'}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    {isRegenerating === 'moodboard' ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b border-white"></div>
                                            Regenerating...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-4 h-4" />
                                            Regenerate Storyboard
                                        </>
                                    )}
                                </button>
                                
                                <button
                                    onClick={() => setShowStoryboardModal(null)}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlueprintReview;