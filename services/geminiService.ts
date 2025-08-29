import { Type } from "@google/genai";
import { Analysis, Blueprint, CompetitorAnalysisResult, Platform, Script, TitleAnalysis, ContentGapSuggestion, VideoPerformance, PerformanceReview, SceneAssets, SoundDesign, LaunchPlan, ChannelAudit, Opportunity, ScriptOptimization, ScriptGoal, Subtitle, BrandIdentity, VideoStyle, Scene, StockAsset, SubtitleWord, NormalizedStockAsset, JamendoTrack, GiphyAsset, ViralTrendSuggestion } from '../types.ts';
import * as supabase from './supabaseService.ts';

const parseGeminiJson = <T>(res: { text: string | null | undefined }, fallback: T | null = null): T => {
    try {
        const rawText = (res.text ?? '');
        if (!rawText.trim()) {
            if (fallback) return fallback;
            throw new Error("AI returned an empty response.");
        }
        // This is a more robust way to find JSON in a string that might have other text.
        const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*\])/);
        if (jsonMatch) {
            const jsonString = jsonMatch[1] || jsonMatch[2] || jsonMatch[3];
            if (jsonString) {
                return JSON.parse(jsonString) as T;
            }
        }
        // Fallback for cases where the string is just the JSON object without markers
        return JSON.parse(rawText) as T;
    } catch (e) {
        console.error("Failed to parse Gemini JSON response:", res.text, e);
        if (fallback) return fallback;
        throw new Error("AI returned invalid data format or no JSON was found.");
    }
};

const urlToDataUrl = async (url: string): Promise<string> => {
    // If it's already a data URL, return it directly.
    if (url.startsWith('data:')) {
        return url;
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${url} (status: ${response.status})`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const exploreViralTrends = async (niche: string): Promise<{ trends: ViralTrendSuggestion[], sources: any[] }> => {
    const prompt = `You are a viral trend analyst. Your task is to identify emerging and popular video ideas for a specific niche using Google Search.

**Niche:** "${niche}"

**Instructions:**
1.  Use the Google Search tool to find recent (last 30 days), highly engaging articles, blog posts, or popular videos related to the specified niche.
2.  Analyze the search results to identify 3 distinct, actionable, and timely video ideas that have high viral potential.
3.  For each idea, synthesize the information into a specific format.

**Output Format:**
Your response **MUST** be a valid JSON object. Do not include any other text or markdown formatting. The JSON object must contain a single key, "trends", which is an array of 3 objects. Each object must have the following structure:
{
  "topic": "The core subject of the video idea.",
  "angle": "The unique perspective or hook that makes this trend interesting.",
  "hook": "A short, punchy opening sentence for the video script.",
  "suggestedTitle": "A clickable, optimized title for the video."
}`;

    const response = await supabase.invokeEdgeFunction<{ text: string, candidates?: any[] }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        }
    });
    
    const trendsResult = parseGeminiJson<{ trends: Omit<ViralTrendSuggestion, 'source'>[] }>(response, { trends: [] });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title,
      }))
      .filter((source: any) => source.uri && source.title) || [];
      
    // Augment each trend with the most relevant source
    const finalTrends: ViralTrendSuggestion[] = trendsResult.trends.map((trend, index) => ({
        ...trend,
        source: sources[index % sources.length] || { title: 'General Web Search', uri: '#' }
    }));

    return { trends: finalTrends, sources };
};

export const generateVideoBlueprint = async (
    topicOrUrl: string, 
    platform: Platform,
    style: VideoStyle,
    onProgress: (message: string) => void,
    desiredLengthInSeconds: number,
    brandIdentity?: BrandIdentity | null,
    shouldGenerateMoodboard: boolean = true,
    isNarratorEnabled: boolean = true,
    creativeIntent?: string
): Promise<Blueprint> => {
    onProgress("Consulting AI Creative Director...");
    
    const formatDescription = platform === 'youtube_long' 
        ? "a horizontal, long-form YouTube video" 
        : "a vertical, short-form video for platforms like YouTube Shorts, TikTok, or Instagram Reels";
    
    let brandIdentityPrompt = "No specific brand identity provided. Use a generally engaging and effective style.";
    if (brandIdentity) {
        brandIdentityPrompt = `
- **Brand Name:** ${brandIdentity.name}
- **Tone of Voice:** ${brandIdentity.toneOfVoice}
- **Writing Style Guide:** ${brandIdentity.writingStyleGuide}
- **Target Audience:** ${brandIdentity.targetAudience}
- **Channel Mission:** ${brandIdentity.channelMission}
- **Visual Style Guide:** ${brandIdentity.visualStyleGuide}
- **Thumbnail Formula:** ${brandIdentity.thumbnailFormula}
        `;
    }

    const narratorInstruction = isNarratorEnabled
        ? "The 'voiceover' field for each scene should contain the spoken script for the narrator."
        : "CRITICAL: The narrator is disabled. All 'voiceover' fields in the 'scenes' array MUST be empty strings (''). The story must be told exclusively through compelling 'visual' descriptions and engaging 'onScreenText'.";

    const styleInstructions = {
        'High-Energy Viral': "Adopt a high-energy, fast-paced, and bold style. Use strong claims, quick cuts, and enthusiastic language. Visuals should be dynamic and eye-catching.",
        'Cinematic Documentary': "Adopt a thoughtful, narrative, and elegant style. Focus on storytelling, evocative language, and cinematic visual descriptions. The pacing should be deliberate.",
        'Clean & Corporate': "Adopt a clear, professional, and trustworthy tone. Structure information logically and use polished language. Visuals should be clean and modern.",
        'Animation': "The script's 'visual' descriptions must be written as directions for an animator. The 'moodboardDescription' prompts should generate concept art in a consistent style (e.g., 'concept art for a friendly robot character in a flat 2D style').",
        'Vlog': "Write the script in a first-person, conversational, and relatable tone. 'Visual' descriptions should suggest typical vlogging shots (e.g., 'Talking head shot, slightly off-center', 'Quick cut to a B-roll of making coffee').",
        'Historical Documentary': "Adopt a formal, narrative, and authoritative tone, like a historian. 'Visual' descriptions must call for archival-style footage, old maps, or historical recreations. 'MoodboardDescription' prompts should be for generating historically-styled images.",
        'Whiteboard': "The script should be educational and structured for a whiteboard animation. 'Visual' descriptions must detail what should be drawn on the whiteboard to illustrate the voiceover (e.g., 'A simple line drawing of a lightbulb turning on as the idea is explained').",
    };
        
    const textPrompt = `You are a world-class AI Creative Director for ${formatDescription}. Your task is to generate a complete video blueprint based on the following parameters:
**Topic/URL:** "${topicOrUrl}"
**Desired Video Length:** Approximately ${desiredLengthInSeconds} seconds. Your script's pacing and scene count must reflect this.
**Chosen Video Style:** "${style}". Your output MUST be deeply influenced by this style. Follow these specific instructions: ${styleInstructions[style] || styleInstructions['High-Energy Viral']}

**User's Creative Intent:** "${creativeIntent || 'No specific intent provided, follow the main style guide.'}"

**Brand Identity to Adhere To:**
${brandIdentityPrompt}

Your output MUST be a JSON object with the following structure:
1. "strategicSummary": A concise summary explaining WHY this video concept, in this style and for this brand, will perform well.
2. "suggestedTitles": An array of 5 S-Tier titles, tailored to the chosen style and brand identity.
3. "script": A full script object, with hooks, scenes, and a CTA, all written in the chosen style and brand voice. The total duration should match the desired length. ${narratorInstruction}
4. "moodboardDescription": An array of descriptive prompts for an AI image generator. CRITICAL: This array MUST have the exact same number of elements as the "script.scenes" array. Each prompt must correspond to the "visual" description of its respective scene and match the chosen video style.`;
    
    const systemInstruction = `You are a world-class viral video strategist and your response MUST be a valid JSON object that strictly adheres to the provided schema. Ensure all fields, especially arrays like 'scenes' and 'suggestedTitles', are populated with high-quality, relevant content and are never empty. The output must reflect the chosen video style, desired length, and brand identity.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: textPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        strategicSummary: { type: Type.STRING },
                        suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING } },
                        script: {
                            type: Type.OBJECT,
                            properties: {
                                hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            visual: { type: Type.STRING },
                                            voiceover: { type: Type.STRING },
                                            onScreenText: { type: Type.STRING },
                                            timecode: { type: Type.STRING }
                                        },
                                        required: ["visual", "voiceover", "timecode"]
                                    }
                                },
                                cta: { type: Type.STRING }
                            },
                            required: ["hooks", "scenes"]
                        },
                        moodboardDescription: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["strategicSummary", "suggestedTitles", "script", "moodboardDescription"]
                }
            }
        }
    });

    const blueprintResponse = parseGeminiJson<{
        strategicSummary: string;
        suggestedTitles: string[];
        script: Script;
        moodboardDescription: string[];
    }>(response);

    const moodboardImages: string[] = [];

    if (shouldGenerateMoodboard && blueprintResponse.moodboardDescription) {
        onProgress("Generating visual moodboard...");
        for (const [index, prompt] of blueprintResponse.moodboardDescription.entries()) {
            try {
                onProgress(`Generating image ${index + 1} of ${blueprintResponse.moodboardDescription.length}...`);
                const imageResponse = await supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
                    type: 'generateImages',
                    params: {
                        model: 'imagen-4.0-generate-001',
                        prompt: `A cinematic, visually stunning image for a video scene: ${prompt}. Style: ${style}.`,
                        config: {
                            numberOfImages: 1,
                            outputMimeType: 'image/jpeg',
                            aspectRatio: platform === 'youtube_long' ? '16:9' : '9:16'
                        }
                    }
                });
                if (imageResponse.generatedImages && imageResponse.generatedImages.length > 0) {
                    const base64 = imageResponse.generatedImages[0].image.imageBytes;
                    // The service expects a data URL for fetch()
                    moodboardImages.push(`data:image/jpeg;base64,${base64}`);
                }
            } catch (e) {
                console.error(`Failed to generate moodboard image for prompt: "${prompt}"`, e);
                // Continue even if one image fails, so the user gets something.
            }
        }
    }

    onProgress("Blueprint complete!");

    return {
        strategicSummary: blueprintResponse.strategicSummary,
        suggestedTitles: blueprintResponse.suggestedTitles,
        script: blueprintResponse.script,
        moodboard: moodboardImages,
        platform: platform,
    };
};
// FIX: Export all the functions that are used by other components
export const rewriteScriptScene = async (scene: Scene, action: string): Promise<Partial<Scene>> => {
    const prompt = `You are an expert scriptwriter. Rewrite the following video scene to be more "${action}".
Original Scene:
- Visual: "${scene.visual}"
- Voiceover: "${scene.voiceover}"

Respond ONLY with a JSON object with the rewritten "visual" and "voiceover" fields.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT, properties: { visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, },
                }
            }
        }
    });

    return parseGeminiJson<Partial<Scene>>(response);
};

export const analyzeTitles = async (topic: string, titles: string[], platform: Platform): Promise<{ analysis: TitleAnalysis[], suggestions: string[] }> => {
    const prompt = `Analyze these ${titles.length} video titles for a video about "${topic}" on ${platform}.
For each title, provide a virality score (0-100), pros, and cons.
Then, provide 3 new, S-tier title suggestions based on the analysis.
Titles to analyze: ${titles.map(t => `"${t}"`).join(', ')}

Respond ONLY with a JSON object: { "analysis": [{ "title": "...", "score": ..., "pros": [...], "cons": [...] }], "suggestions": [...] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        }
    });

    return parseGeminiJson<{ analysis: TitleAnalysis[], suggestions: string[] }>(response);
};

export const analyzeCompetitorVideo = async (url: string): Promise<CompetitorAnalysisResult> => {
    const prompt = `You are a viral video strategist. Analyze this YouTube video: ${url}
Deconstruct its success. Provide its title, a summary of its viral strategy, its narrative structure, keywords, and 3 upgraded title suggestions.
Respond ONLY with a JSON object: { "videoTitle": "...", "viralityDeconstruction": "...", "stealableStructure": [{ "step": "...", "description": "..." }], "extractedKeywords": [...], "suggestedTitles": [...] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string, candidates: any[] }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        }
    });
    
    const result = parseGeminiJson<CompetitorAnalysisResult>(response);
    result.sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((source: any) => source?.uri && source?.title) || [];
        
    return result;
};

export const generateSeo = async (title: string, script: Script, platform: Platform): Promise<{ description: string, tags: string[] }> => {
    const scriptText = script.scenes.map(s => s.voiceover).join(' ');
    const prompt = `Generate an optimized YouTube description and tags for a video titled "${title}".
The video script is about: ${scriptText.substring(0, 500)}...
Respond ONLY with a JSON object: { "description": "...", "tags": [...] }`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
            }
        }
    });
    return parseGeminiJson<{ description: string, tags: string[] }>(response);
};

export const analyzeAndGenerateThumbnails = async (title: string, platform: Platform): Promise<string[]> => {
    const prompt = `Based on the video title "${title}", generate 2 distinct, highly clickable thumbnail concepts. Focus on bold visuals, clear emotions, and minimal text.`;
    
    const response = await supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
        type: 'generateImages',
        params: {
            model: 'imagen-4.0-generate-001', prompt: prompt,
            config: {
                numberOfImages: 2,
                outputMimeType: 'image/jpeg',
                aspectRatio: platform === 'youtube_long' ? '16:9' : '9:16'
            }
        }
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("AI failed to generate thumbnail images.");
    }
    
    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
};

export const performChannelAudit = async (videos: { title: string, views: number, likes: number, comments: number }[]): Promise<ChannelAudit> => {
    const videoData = videos.map(v => `Title: ${v.title}, Views: ${v.views}`).join('\n');
    const prompt = `Analyze this list of YouTube videos to determine the channel's core content pillars, audience persona, a "viral formula," and 3 specific growth opportunities.
Video data:\n${videoData}
Respond ONLY with a JSON object: { "contentPillars": [...], "audiencePersona": "...", "viralFormula": "...", "opportunities": [{ "idea": "...", "reason": "...", "suggestedTitle": "...", "type": "Quick Win|Growth Bet|Experimental" }] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });

    return parseGeminiJson<ChannelAudit>(response);
};

export const reviewVideoPerformance = async (performance: VideoPerformance, title: string): Promise<PerformanceReview> => {
    const prompt = `Analyze the performance data for the video "${title}".
Data: Views: ${performance.views}, Likes: ${performance.likes}, Comments: ${performance.comments}, Retention: ${performance.retention}%.
Provide a summary, what worked well, and what to improve.
Respond ONLY with a JSON object: { "summary": "...", "whatWorked": [...], "whatToImprove": [...] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });

    return parseGeminiJson<PerformanceReview>(response);
};

export const suggestContentGaps = async (successfulTopics: string[], currentProjectTopic: string): Promise<ContentGapSuggestion[]> => {
    const prompt = `Based on these successful video topics: ${successfulTopics.join(', ')}, and avoiding the current topic of "${currentProjectTopic}", suggest 3 new video ideas that fill content gaps.
For each, provide the idea, the reason it will work, and 3 potential titles.
Respond ONLY with a JSON array of objects: [{ "idea": "...", "reason": "...", "potentialTitles": [...] }]`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });
    
    return parseGeminiJson<ContentGapSuggestion[]>(response);
};

export const getSchedulingSuggestion = async (topic: string): Promise<string> => {
    const prompt = `For a video about "${topic}", what is the absolute best day and time to post for maximum engagement? Provide a concise recommendation and a brief reason why. Example: 'Post on Saturday at 11 AM EST. This is peak time for your likely audience.'`;
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt }
    });
    return response.text ?? "Could not determine a suggestion.";
};

export const repurposeProject = async (script: Script, title: string, fromPlatform: Platform, toPlatform: Platform): Promise<Script> => {
    const from = fromPlatform === 'youtube_long' ? 'long-form horizontal' : 'short-form vertical';
    const to = toPlatform === 'youtube_long' ? 'long-form horizontal' : 'short-form vertical';
    const scriptText = script.scenes.map(s => s.voiceover).join(' ');
    
    const prompt = `Adapt this ${from} video script about "${title}" into a script for a ${to} video.
Original script: ${scriptText}
Condense the key points, rewrite the hook for the new format, and structure it into scenes with visuals and voiceovers.
Respond ONLY with a JSON object matching the Script schema: { "hooks": [...], "scenes": [{ "visual": "...", "voiceover": "...", "timecode": "..." }], "cta": "..." }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });
    return parseGeminiJson<Script>(response);
};

export const generateAutopilotBacklog = async (platform: Platform, pillars: string[], audit: ChannelAudit): Promise<Blueprint[]> => {
    const prompt = `You are an AI content strategist. Generate 3 complete video blueprints for ${platform} based on the user's channel audit.
Channel Pillars: ${pillars.join(', ')}
Audience Persona: ${audit.audiencePersona}
Viral Formula: ${audit.viralFormula}
Respond ONLY with a JSON object containing a "blueprints" array. Each item in the array must be a complete blueprint object: { "suggestedTitles": [...], "script": {...}, "moodboard": [...], "strategicSummary": "...", "platform": "${platform}" }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });
    const result = parseGeminiJson<{ blueprints: Blueprint[] }>(response);
    return result.blueprints;
};

export const analyzeScriptVirality = async (script: Script, title: string, platform: Platform): Promise<Analysis> => {
    const scriptText = script.scenes.map(s => s.voiceover).join(' ');
    const prompt = `Analyze this video script for its viral potential on ${platform}. Title: "${title}". Script: "${scriptText.substring(0, 1000)}...".
Provide an overall score (0-100), scores for hook, pacing, audio, and CTA. Also give a summary, a "golden nugget" improvement, strengths, and a list of improvements with reasons.
Respond ONLY with a JSON object: { "scores": { "overall": ..., "hook": ..., "pacing": ..., "audio": ..., "cta": ... }, "summary": "...", "goldenNugget": "...", "strengths": [...], "improvements": [{ "suggestion": "...", "reason": "..." }] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent', params: { model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } }
    });

    return parseGeminiJson<Analysis>(response);
};

export const generateSoundDesign = async (script: Script, style: VideoStyle, topic: string): Promise<SoundDesign> => {
    const scriptSummary = script.scenes.map((s, i) => `Scene ${i + 1} (${s.timecode}): ${s.visual} - ${s.voiceover}`).join('\n');
    const prompt = `You are a sound designer for a "${style}" style video about "${topic}".
Based on this script, suggest a single search query for background music on a stock audio site, and a list of 3-5 specific sound effects with their target timecodes.
Script:\n${scriptSummary}

Respond ONLY with a JSON object: { "musicQuery": "...", "sfx": [{ "description": "...", "timecode": "start-end" }] }`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        musicQuery: { type: Type.STRING },
                        sfx: { type: Type.ARRAY, items: { 
                            type: Type.OBJECT, 
                            properties: { description: { type: Type.STRING }, timecode: { type: Type.STRING } }
                        }}
                    }
                }
            }
        }
    });

    return parseGeminiJson<SoundDesign>(response);
};