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
                        strategicSummary: { type: Type.STRING, description: "The core strategy behind why this video will be successful." },
                        suggestedTitles: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 high-CTR title options." },
                        script: {
                            type: Type.OBJECT,
                            properties: {
                                hooks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 viral hook options based on psychological triggers." },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: { 
                                            timecode: { type: Type.STRING, description: "A string representing the start and end time of the scene in seconds, formatted as 'start-end' (e.g., '0-5', '5-12.5'). DO NOT include units like 's' or use minute:second formats." }, 
                                            visual: { type: Type.STRING }, 
                                            voiceover: { type: Type.STRING }, 
                                            onScreenText: { type: Type.STRING } 
                                        },
                                        required: ["timecode", "visual", "voiceover", "onScreenText"]
                                    }
                                },
                                cta: { type: Type.STRING, description: "A clear and compelling call to action." }
                            },
                            required: ["hooks", "scenes", "cta"]
                        },
                        moodboardDescription: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of descriptive prompts for an AI image generator. There must be one prompt per scene." }
                    },
                    required: ["strategicSummary", "suggestedTitles", "script", "moodboardDescription"]
                }
            }
        }
    });

    const blueprintContent = parseGeminiJson<{strategicSummary: string, suggestedTitles: string[], script: Script, moodboardDescription: string[]}>(response);
    
    onProgress("Strategic plan and script generated successfully!");

    if (!shouldGenerateMoodboard) {
        onProgress("Skipping moodboard generation as requested.");
        return { ...blueprintContent, moodboard: [], platform };
    }

    const moodboardUrls: string[] = [];
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '16:9';

    for (let i = 0; i < blueprintContent.moodboardDescription.length; i++) {
        const prompt = blueprintContent.moodboardDescription[i];
        onProgress(`Generating moodboard image ${i + 1} of ${blueprintContent.moodboardDescription.length}...`);
        
        const imageResult = await supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard in a ${style} style: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
            }
        });
        moodboardUrls.push(`data:image/jpeg;base64,${imageResult.generatedImages[0].image.imageBytes}`);
    }

    onProgress("Finalizing your blueprint...");
    
    return { ...blueprintContent, moodboard: moodboardUrls, platform };
};

export const generateAutopilotBacklog = async (
    platform: Platform,
    contentPillars: string[],
    channelAudit: ChannelAudit
): Promise<Blueprint[]> => {
    const prompt = `You are an AI YouTube Channel Manager. Your goal is to proactively generate a content backlog for a creator.

**Creator's Strategic Data:**
- **Platform:** ${platform}
- **Core Content Pillars:** ${contentPillars.join(', ')}
- **Audience Persona:** ${channelAudit.audiencePersona}
- **Proven Viral Formula:** ${channelAudit.viralFormula}

**Task:**
Generate a content backlog of **3 diverse video blueprints**. Each blueprint must be a complete, high-quality plan that aligns with the creator's strategic data. The ideas should be fresh, engaging, and have a high potential for success.

**Output Format:**
Your response **MUST** be a JSON array containing exactly 3 blueprint objects. Each object must follow this structure:
{
  "strategicSummary": "A concise summary explaining why this specific video concept will work for this channel.",
  "suggestedTitles": ["An array of 3-5 S-Tier, high-CTR titles for this video."],
  "script": {
    "hooks": ["An array of 3 distinct, psychologically-driven hook options."],
    "scenes": [
      {
        "timecode": "e.g., '0-8'",
        "visual": "A description of the visual elements.",
        "voiceover": "The voiceover script for this scene.",
        "onScreenText": "Any text overlays for this scene."
      }
    ],
    "cta": "A strong, clear call to action."
  },
  "moodboardDescription": ["An array of 3 descriptive prompts for an AI image generator to create a visual moodboard."]
}`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
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
                                            properties: { timecode: { type: Type.STRING }, visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, onScreenText: { type: Type.STRING } },
                                            required: ["timecode", "visual", "voiceover", "onScreenText"]
                                        }
                                    },
                                    cta: { type: Type.STRING }
                                },
                                required: ["hooks", "scenes", "cta"]
                            },
                            moodboardDescription: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["strategicSummary", "suggestedTitles", "script", "moodboardDescription"]
                    }
                }
            }
        }
    });

    const blueprintContents = parseGeminiJson<(Omit<Blueprint, 'moodboard' | 'platform'> & { moodboardDescription: string[] })[]>(response);
    const aspectRatio = platform === 'youtube_long' ? '16:9' : '16:9';

    const allMoodboardPrompts = blueprintContents.flatMap(b => b.moodboardDescription);
    const allImagePromises = allMoodboardPrompts.map(prompt =>
        supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `A cinematic, visually stunning image for a YouTube video moodboard: ${prompt}`,
                config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio }
            }
        })
    );

    const allImageResults = await Promise.all(allImagePromises);
    const allMoodboardImages = allImageResults.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);

    let imageCounter = 0;
    const finalBlueprints = blueprintContents.map(b => {
        const moodboard = allMoodboardImages.slice(imageCounter, imageCounter + b.moodboardDescription.length);
        imageCounter += b.moodboardDescription.length;
        return { ...b, platform, moodboard };
    });

    return finalBlueprints;
};


export const generateOptimizedScript = async (
    platform: Platform,
    desiredLengthInSeconds: number,
    input: { topic: string } | { userScript: string },
    scriptGoal: ScriptGoal
): Promise<ScriptOptimization> => {
    const isGenerating = 'topic' in input;
    const promptContext = isGenerating
        ? `Generate a new script about "${input.topic}".`
        : `Analyze and improve this existing script: "${input.userScript.substring(0, 2000)}..."`;

    const formatDescription = platform === 'youtube_long' ? "long-form YouTube videos" : "short-form vertical videos (Shorts, TikToks)";

    const prompt = `You are an expert scriptwriter and viral content analyst for ${formatDescription}. Your task is to create a perfectly optimized script.

**Primary Goal:** Your script MUST be optimized to achieve this goal: **${scriptGoal}**.
- If 'educate': Focus on clear, value-packed information. Structure it logically. The CTA should reinforce authority.
- If 'subscribe': Build a relatable narrative or strong community identity. End with a compelling reason for the viewer to join the community.
- If 'sell': Use a persuasive framework like Problem-Agitate-Solve. The CTA must directly relate to the product/service and overcome objections.
- If 'entertain': Prioritize storytelling, humor, or emotional connection. The CTA should be about community engagement (e.g., 'comment below').

**Other Parameters:**
- Desired script length is approximately ${desiredLengthInSeconds} seconds.
- Context: ${promptContext}

Your output must be a single JSON object with the following structure.
- "initialScore": An integer from 0-100 representing the baseline virality score. If generating a new script, this should be 0. If improving a script, provide an honest assessment of the original.
- "finalScore": An integer from 90-100. This is the score of your improved script.
- "analysisLog": An array of 5-7 objects, where each object details one optimization step. Each object must have:
    - "step": A short, descriptive string of the action taken (e.g., "Rewriting hook for more impact", "Improving pacing in scene 2", "Strengthening the call to action").
    - "target": A string identifying the part of the script being changed ('hooks', 'cta', or 'scene-X' where X is the scene number, e.g., 'scene-2').
- "finalScript": The fully optimized script object, following the specified structure. It must include:
    - "hooks": An array of 3-5 distinct, psychologically-driven hook options.
    - "scenes": An array of scene objects, each with "timecode", "visual", "voiceover", and "onScreenText". The total duration should respect the desiredLengthInSeconds.
    - "cta": A strong, clear call to action tailored to the primary goal.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        initialScore: { type: Type.INTEGER },
                        finalScore: { type: Type.INTEGER },
                        analysisLog: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    step: { type: Type.STRING },
                                    target: { type: Type.STRING }
                                },
                                required: ["step", "target"]
                            }
                        },
                        finalScript: {
                            type: Type.OBJECT,
                            properties: {
                                hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                                scenes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            timecode: { type: Type.STRING },
                                            visual: { type: Type.STRING },
                                            voiceover: { type: Type.STRING },
                                            onScreenText: { type: Type.STRING }
                                        },
                                        required: ["timecode", "visual", "voiceover", "onScreenText"]
                                    }
                                },
                                cta: { type: Type.STRING }
                            },
                            required: ["hooks", "scenes", "cta"]
                        }
                    },
                    required: ["initialScore", "finalScore", "analysisLog", "finalScript"]
                }
            }
        }
    });

    return parseGeminiJson<ScriptOptimization>(response);
};


export const analyzeVideoConcept = async (script: Script, title: string, platform: Platform): Promise<Analysis> => {
    const scriptSummary = script.scenes.map(s => s.voiceover).filter(Boolean).join(' ').substring(0, 2000);

    const textPrompt = `You are a viral video expert. Analyze the following video *concept* for the ${platform} platform. Your analysis should be based on the script's content and the video's title, not on any visual execution.

**Title:** "${title}"
**Script Summary:** "${scriptSummary}"

Your output must be a JSON object with:
- scores: An object containing 'overall', 'hook', 'pacing', 'audio', and 'cta' scores, ALL from 1 to 100. The hook score is based on the script's opening. Pacing is judged by the script's flow. Audio and CTA are judged by their clarity and impact within the script. 'overall' is a weighted summary.
- summary: A concise summary of your findings on the script's potential.
- goldenNugget: The single most important script-related tip.
- strengths: 3 things the script does well.
- improvements: 3 actionable script improvements with clear reasons explaining WHY they matter.`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: textPrompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scores: { 
                            type: Type.OBJECT, 
                            properties: { 
                                overall: { type: Type.INTEGER, description: "Score from 1-100" }, 
                                hook: { type: Type.INTEGER, description: "Score from 1-100" }, 
                                pacing: { type: Type.INTEGER, description: "Score from 1-100" }, 
                                audio: { type: Type.INTEGER, description: "Score from 1-100" }, 
                                cta: { type: Type.INTEGER, description: "Score from 1-100" } 
                            },
                            required: ["overall", "hook", "pacing", "audio", "cta"]
                        },
                        summary: { type: Type.STRING }, 
                        goldenNugget: { type: Type.STRING },
                        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                        improvements: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { 
                                    suggestion: { type: Type.STRING }, 
                                    reason: { type: Type.STRING } 
                                }, 
                                required: ["suggestion", "reason"] 
                            }
                        }
                    },
                    required: ["scores", "summary", "goldenNugget", "strengths", "improvements"]
                }
            }
        }
    });
    
    return parseGeminiJson<Analysis>(response);
};

export const analyzeTitles = async (topic: string, titles: string[], platform: Platform): Promise<{ analysis: TitleAnalysis[], suggestions: string[] }> => {
    const prompt = `You are a YouTube title expert, a master of CTR. Your analysis is for the topic "${topic}" on ${platform}. The provided titles are: ${JSON.stringify(titles)}.

Analyze the provided titles based on Curiosity, Emotional Impact, Clarity, and CTR potential.

Your output MUST be a JSON object with:
1. "analysis": An array of analysis objects, one for each title. Each object must have a "score" (1-100), an array of string "pros", and an array of string "cons".
2. "suggestions": An array of 5 new, S-tier title suggestions that are significantly better and follow proven viral formulas.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        analysis: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { score: { type: Type.INTEGER }, pros: { type: Type.ARRAY, items: { type: Type.STRING } }, cons: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["score", "pros", "cons"] } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["analysis", "suggestions"]
                }
            }
        }
    });

    return parseGeminiJson(response);
};

export const analyzeCompetitorVideo = async (url: string): Promise<CompetitorAnalysisResult> => {
    const prompt = `
**Primary Directive: YouTube Video Analysis**

**Role:** You are an expert YouTube strategist specializing in reverse-engineering viral content.

**Task:** Analyze the YouTube video located at the following URL: ${url}

**CRITICAL INSTRUCTIONS:**
1.  **Use the Google Search tool exclusively** to access and understand the content of the video at the provided URL.
2.  Your entire response **MUST BE 100% BASED ON THE SPECIFIC CONTENT of that single video**.
3.  **DO NOT use general knowledge** or provide generic advice. Your analysis must be directly tied to the video's title, spoken content, visual themes, and description.
4.  If you cannot access the video's content, your response should be an error object.

**Output Format:** Based *only* on the video's content, generate a valid JSON object with the following structure:
{
  "videoTitle": "The exact, full title of the video.",
  "viralityDeconstruction": "A concise paragraph explaining the core psychological hooks and strategic elements that make THIS specific video successful. Be specific.",
  "stealableStructure": [
    {
      "step": "A short, actionable title for a step in the video's structure (e.g., '1. The Problem Hook').",
      "description": "A description of what happens in this structural part of the video and why it's effective."
    }
  ],
  "extractedKeywords": [
    "An array of the most potent and relevant keywords, topics, and phrases mentioned or shown in the video."
  ],
  "suggestedTitles": [
    "An array of 3 new, compelling title ideas for a different video that uses a similar successful formula."
  ]
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
    
    const analysisResult = parseGeminiJson<CompetitorAnalysisResult>(response);
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title,
      }))
      .filter((source: any) => source.uri && source.title);

    if (sources && sources.length > 0) {
      analysisResult.sources = sources;
    }

    return analysisResult;
};

export const rewriteScriptScene = async (scene: Scene, action: string): Promise<Partial<Scene>> => {
    const prompt = `You are an AI script co-writer. Your task is to rewrite a single scene from a video script based on a specific action.

**Original Scene:**
- **Visual:** "${scene.visual}"
- **Voiceover:** "${scene.voiceover}"

**Action:** "${action}"

Rewrite the 'visual' and 'voiceover' fields for this scene to accomplish the requested action. Your output MUST be a JSON object with the 'visual' and 'voiceover' keys.`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visual: { type: Type.STRING },
                        voiceover: { type: Type.STRING }
                    },
                    required: ["visual", "voiceover"]
                }
            }
        }
    });

    return parseGeminiJson<Partial<Scene>>(response);
};

export const generateSeo = async (title: string, script: Script, platform: Platform): Promise<LaunchPlan['seo']> => {
    const scriptSummary = script.scenes.map(s => s.voiceover).join(' ').substring(0, 1000);
    const prompt = `You are a YouTube SEO expert. Based on the video title and script summary, generate an optimized description and relevant tags.

**Title:** "${title}"
**Platform:** ${platform}
**Script Summary:** "${scriptSummary}"

Your output must be a JSON object with:
1. "description": A paragraph-based, SEO-rich description that includes keywords naturally.
2. "tags": An array of 15-20 relevant, high-traffic tags.`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["description", "tags"]
                }
            }
        }
    });

    return parseGeminiJson<LaunchPlan['seo']>(response);
};

export const analyzeAndGenerateThumbnails = async (title: string, platform: Platform): Promise<string[]> => {
    const thumbnailPrompt = `You are a viral thumbnail designer. Your task is to generate 2 distinct, high-CTR thumbnail concepts for a video titled "${title}". Focus on bold text, clear subject matter, and emotional expression. Generate an array of 2 detailed prompts for an AI image generator.`;

    const promptResponse = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: thumbnailPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }
    });

    const prompts = parseGeminiJson<string[]>(promptResponse);
    if (!prompts || prompts.length === 0) {
        throw new Error("AI failed to generate thumbnail prompts.");
    }
    
    const imagePromises = prompts.slice(0, 2).map(prompt => {
        return supabase.invokeEdgeFunction<{ generatedImages: { image: { imageBytes: string } }[] }>('gemini-proxy', {
            type: 'generateImages',
            params: {
                model: 'imagen-3.0-generate-002',
                prompt: `YouTube thumbnail for a video titled "${title}". Style: ${prompt}. High contrast, bold colors, clear subject.`,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: platform === 'youtube_long' ? '16:9' : '9:16'
                }
            }
        });
    });

    const results = await Promise.all(imagePromises);
    return results.map(res => `data:image/jpeg;base64,${res.generatedImages[0].image.imageBytes}`);
};

export const getSchedulingSuggestion = async (topic: string): Promise<string> => {
    const prompt = `You are a social media expert. Based on the topic "${topic}", what is the absolute best day and time to post this video for maximum engagement? Provide a short, direct answer. Example: "For this topic, the best time to post is **Tuesday at 2 PM EST** to catch the afternoon browsing wave."`;
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
        }
    });
    return response.text ?? 'Could not determine a suggestion.';
};

export const repurposeProject = async (script: Script, title: string, fromPlatform: Platform, toPlatform: Platform): Promise<Script> => {
    const prompt = `You are a content repurposing expert. Convert this script from a ${fromPlatform} video to a ${toPlatform} video.
**Original Title:** ${title}
**Original Script:** ${JSON.stringify(script)}
You must re-format the script, shorten the scenes, and adapt the language for the new platform. Your output must be a valid JSON object containing only the new script.`;
    
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        scenes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { timecode: { type: Type.STRING }, visual: { type: Type.STRING }, voiceover: { type: Type.STRING }, onScreenText: { type: Type.STRING } }, required: ["timecode", "visual", "voiceover", "onScreenText"] } },
                        cta: { type: Type.STRING }
                    },
                    required: ["hooks", "scenes", "cta"]
                }
            }
        }
    });

    return parseGeminiJson<Script>(response);
};


export const performChannelAudit = async (videos: { title: string, views: number, likes: number, comments: number }[]): Promise<ChannelAudit> => {
    const videoData = JSON.stringify(videos.slice(0, 10)); // Use top 10 videos
    const prompt = `You are a world-class YouTube strategist. Analyze this list of a creator's recent videos and their performance metrics.
**Video Data:** ${videoData}
Based SOLELY on this data, perform a channel audit. Your output must be a JSON object with:
1. "contentPillars": An array of 3-5 strings identifying the core recurring themes or topics that perform well.
2. "audiencePersona": A concise paragraph describing the channel's likely target viewer.
3. "viralFormula": A short, actionable sentence describing the repeatable pattern in their successful videos (e.g., "Combining historical facts with fast-paced editing and a mysterious hook creates high engagement.").
4. "opportunities": An array of 3 distinct "Opportunity" objects for new video ideas. Each object must have: "idea" (the concept), "reason" (why it will work based on the data), "suggestedTitle", and "type" ('Quick Win', 'Growth Bet', or 'Experimental').`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        contentPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
                        audiencePersona: { type: Type.STRING },
                        viralFormula: { type: Type.STRING },
                        opportunities: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { idea: { type: Type.STRING }, reason: { type: Type.STRING }, suggestedTitle: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["idea", "reason", "suggestedTitle", "type"] } }
                    },
                    required: ["contentPillars", "audiencePersona", "viralFormula", "opportunities"]
                }
            }
        }
    });

    return parseGeminiJson(response);
};

export const reviewVideoPerformance = async (performance: VideoPerformance, title: string): Promise<PerformanceReview> => {
    const prompt = `Analyze the performance of a YouTube video titled "${title}" with these stats: ${JSON.stringify(performance)}. Your output must be a JSON object with a "summary", a "whatWorked" array of strings, and a "whatToImprove" array of strings.`;
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        whatWorked: { type: Type.ARRAY, items: { type: Type.STRING } },
                        whatToImprove: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["summary", "whatWorked", "whatToImprove"]
                }
            }
        }
    });
    return parseGeminiJson<PerformanceReview>(response);
};

export const suggestContentGaps = async (successfulTopics: string[], channelTopic: string): Promise<ContentGapSuggestion[]> => {
    const prompt = `Based on a channel's main topic "${channelTopic}" and these successful video topics: ${JSON.stringify(successfulTopics)}, identify 3 content gaps. Your output must be a JSON array of objects, each with an "idea", a "reason" it will work, and an array of 3 "potentialTitles".`;
    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            idea: { type: Type.STRING },
                            reason: { type: Type.STRING },
                            potentialTitles: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["idea", "reason", "potentialTitles"]
                    }
                }
            }
        }
    });
    return parseGeminiJson<ContentGapSuggestion[]>(response);
};

export const generateSoundDesign = async (script: Script, videoStyle: VideoStyle, topic: string): Promise<SoundDesign> => {
    const scriptSummary = script.scenes.map((s, i) => `Scene ${i+1}: ${s.voiceover} (${s.timecode})`).join('\n');
    const prompt = `You are a sound designer for a "${videoStyle}" style video about "${topic}". Based on the script, suggest background music and 3-5 sound effects.
Script Summary: ${scriptSummary}
Your output must be a JSON object with:
1. "musicQuery": A search query for a stock music library (e.g., "upbeat corporate synth pop").
2. "sfx": An array of objects, each with "description" (e.g., "subtle whoosh") and "timecode" (the exact timecode from the script where it should be placed).`;

    const response = await supabase.invokeEdgeFunction<{ text: string }>('gemini-proxy', {
        type: 'generateContent',
        params: {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        musicQuery: { type: Type.STRING },
                        sfx: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, timecode: { type: Type.STRING } }, required: ["description", "timecode"] } }
                    },
                    required: ["musicQuery", "sfx"]
                }
            }
        }
    });

    const result = parseGeminiJson<Omit<SoundDesign, 'musicUrl'>>(response);
    return { ...result, musicUrl: null };
};

export const searchPexels = async (query: string, type: 'videos' | 'photos'): Promise<NormalizedStockAsset[]> => {
    const data = await supabase.invokeEdgeFunction<{ [key: string]: StockAsset[] }>(`pexels-proxy`, { query, type });
    const key = type === 'videos' ? 'videos' : 'photos';
    const assets = data[key] || [];
    return assets.map(asset => ({
        id: asset.id,
        previewImageUrl: type === 'videos' ? asset.image! : asset.src!.medium,
        downloadUrl: type === 'videos' ? asset.video_files!.find(f => f.quality === 'hd')?.link || asset.video_files![0].link : asset.src!.large2x,
        type: type === 'videos' ? 'video' : 'image',
        description: type === 'videos' ? `Video by ${asset.photographer}` : asset.alt!,
        duration: asset.duration,
        provider: 'pexels',
    }));
};

export const searchJamendoMusic = async (query: string): Promise<NormalizedStockAsset[]> => {
    const data = await supabase.invokeEdgeFunction<{ results: JamendoTrack[] }>('jamendo-proxy', { query });
    return (data.results || []).map(track => ({
        id: track.id,
        previewImageUrl: track.image,
        downloadUrl: track.audio,
        type: 'audio',
        description: `${track.name} by ${track.artist_name}`,
        duration: track.duration,
        provider: 'jamendo',
    }));
};


export const searchGiphy = async (query: string, type: 'gifs' | 'stickers'): Promise<NormalizedStockAsset[]> => {
    const assets = await supabase.invokeEdgeFunction<GiphyAsset[]>('giphy-proxy', { query, type });
    return assets.map(asset => ({
        id: asset.id,
        previewImageUrl: asset.images.fixed_height.webp || asset.images.fixed_height.url,
        downloadUrl: asset.images.original.webp || asset.images.original.url,
        type: 'sticker',
        description: asset.title,
        provider: 'giphy',
    }));
};