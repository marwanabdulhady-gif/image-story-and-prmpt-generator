import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { StoryConfig, StoryOutput, MediaSettings, VoiceConfig, ImageStyleConfig, Character } from "../types";

// Helper to get AI instance with dynamic key
const getAI = (customKey?: string) => {
    const key = customKey || process.env.API_KEY;
    if (!key) throw new Error("Missing API Key. Please add one in Settings.");
    return new GoogleGenAI({ apiKey: key });
};

// Retry wrapper with exponential backoff
async function callWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries === 0) throw error;
    
    // Retry on 429 (Too Many Requests) or 503 (Service Unavailable)
    const isRetryable = 
      error.status === 429 || 
      error.status === 503 || 
      (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('overloaded')));

    if (isRetryable) {
      console.warn(`API call failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- WAV Encoder Helpers ---
function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function addWavHeader(pcmData: Int16Array, sampleRate: number = 24000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    const payload = new Uint8Array(buffer, 44);
    payload.set(new Uint8Array(pcmData.buffer));
    return buffer;
}

const outputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sceneNumber: { type: Type.INTEGER },
          narrative: { type: Type.STRING, description: "The story text for narration." },
          characterNames: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Names of characters present in this scene." },
          imagePrompt: { 
              type: Type.STRING, 
              description: "A standalone visual description. Describe the action and setting. Use Character Names." 
          },
          motionPrompt: { type: Type.STRING, description: "Technical instructions for camera movement and character action." }
        },
        required: ["sceneNumber", "narrative", "imagePrompt", "motionPrompt", "characterNames"]
      }
    }
  },
  required: ["title", "summary", "scenes"]
};

// Ideas Schema for Auto-fill
const ideasSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        premise: { type: Type.STRING },
        setting: { type: Type.STRING },
        pacing: { type: Type.STRING, enum: ['slow', 'balanced', 'fast'] },
        plotTwist: { type: Type.STRING, enum: ['none', 'mild', 'shocking'] },
    },
    required: ["premise", "setting"]
};

// Characters Schema
const charactersSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        characters: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING, enum: ['protagonist', 'antagonist', 'supporting'] },
                    description: { type: Type.STRING, description: "Detailed physical visual description (hair, face, clothes, height)." }
                },
                required: ["name", "role", "description"]
            }
        }
    },
    required: ["characters"]
};

export const generateStoryIdeas = async (category: string, lang: string, apiKey?: string): Promise<Partial<StoryConfig>> => {
    return callWithRetry(async () => {
        const ai = getAI(apiKey);
        const prompt = `Generate creative story details for a '${category}' story. Language: ${lang}. Make the setting vivid.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: ideasSchema,
                temperature: 0.9,
            }
        });
        
        if (!response.text) throw new Error("No ideas generated.");
        return JSON.parse(response.text);
    });
};

export const generateCharacterProfiles = async (premise: string, setting: string, count: number, lang: string, apiKey?: string): Promise<Character[]> => {
    return callWithRetry(async () => {
        const ai = getAI(apiKey);
        const languageName = lang === 'ar' ? 'Arabic' : 'English';
        
        const prompt = `Create ${count} unique characters for a story with Premise: "${premise}" and Setting: "${setting}".
        
        REQUIREMENTS:
        - Create 1 Protagonist, 1 Antagonist, and others as supporting.
        - For each character, provide a highly detailed 'description' that can be used as a stable image generation prompt (include specific details on hair, eyes, facial features, and signature clothing).
        
        LANGUAGE INSTRUCTION:
        - The Output MUST be in ${languageName}.
        - Character Names MUST be in ${languageName}.
        - Descriptions MUST be in ${languageName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: charactersSchema,
                temperature: 0.9,
            }
        });

        if (!response.text) throw new Error("No characters generated.");
        const data = JSON.parse(response.text);
        return data.characters.map((c: any, index: number) => ({
            id: `char_${Date.now()}_${index}`,
            name: c.name,
            role: c.role,
            description: c.description
        }));
    });
};

export const analyzeImage = async (base64Image: string, lang: string, apiKey?: string): Promise<string> => {
    return callWithRetry(async () => {
        const ai = getAI(apiKey);
        const languageInstruction = lang === 'ar' ? "Output the description in Arabic." : "Output the description in English.";
        
        const prompt = `Analyze this character image. Create a concise but highly descriptive prompt that captures their key visual signature. Include: Gender, Age, Hair Style/Color, Eye Color, Distinctive Facial Features, Clothing Style, and any unique accessories. 
        ${languageInstruction}
        Output ONLY the descriptive prompt text.`;
        
        // Remove header if present
        const cleanBase64 = base64Image.split(',')[1] || base64Image;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Good for vision
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: prompt }
                ]
            }
        });

        return response.text?.trim() || "Detailed character description.";
    });
};

export const generateStory = async (
    config: StoryConfig, 
    voiceConfig: VoiceConfig, 
    style: ImageStyleConfig,
    apiKey?: string
): Promise<StoryOutput> => {
  return callWithRetry(async () => {
      const ai = getAI(apiKey);
      
      let dialectSystemInstruction = '';
      if (config.language === 'ar') {
         // ... (Dialect logic remains same)
         dialectSystemInstruction = `You are an expert Arabic storyteller. Write narration in the requested dialect.`;
      } else {
          dialectSystemInstruction = `Write in ${config.language}.`;
      }
      
      // Construct Character Profiles Text
      const characterProfiles = config.characters.map(c => 
          `- Name: ${c.name} (${c.role})\n  Visual Signature: ${c.description}`
      ).join('\n');

      const prompt = `
        STORY SETTINGS:
        - Genre: ${config.category}
        - Premise: ${config.premise}
        - Setting: ${config.setting}
        - Pacing: ${config.pacing}

        VISUAL STYLE PREFERENCES:
        - Art Style: ${style.artStyle}
        - Preferred Camera Angle: ${style.cameraAngle}
        - Lighting: ${style.lighting}
        - Color Palette: ${style.colorGrade}

        CHARACTER PROFILES (Reference these for context):
        ${characterProfiles}

        INSTRUCTIONS:
        1. **SEPARATION OF CONCERNS**:
           - **Narrative**: Story text for audio. Conversational, dialect-aware.
           - **ImagePrompt**: ENGLISH ONLY.
             - **MANDATORY**: Start every image prompt with "${style.artStyle} style, ${style.lighting} lighting".
             - Describe the scene's action and composition.
             - Use Character Names (e.g., "John is running").
             - **DO NOT** paste long visual descriptions of characters here. The system injects them later.
           - **MotionPrompt**: ENGLISH ONLY. Provide HIGHLY DETAILED technical camera movement instructions suitable for AI video generators (e.g., Veo, Sora). 
             - Must align with pacing '${config.pacing}'.
             - Must consider the preferred angle '${style.cameraAngle}'. 
             - Examples: "Slow pan right", "Tracking shot", "Push in", "Static camera with moving elements".

        Generate exactly ${config.sceneCount} scenes.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: dialectSystemInstruction,
          responseMimeType: 'application/json',
          responseSchema: outputSchema,
          temperature: 0.85,
        }
      });

      if (!response.text) throw new Error("No text returned from Gemini.");
      return JSON.parse(response.text) as StoryOutput;
  });
};

export const generateSpeech = async (text: string, voiceType: string, apiKey?: string): Promise<string> => {
    // ... (Speech logic remains unchanged)
    return callWithRetry(async () => {
        const ai = getAI(apiKey);
        let voiceName = 'Puck'; 
        switch (voiceType) {
            case 'man_deep': voiceName = 'Charon'; break; 
            case 'man_soft': voiceName = 'Puck'; break; 
            case 'man_drama': voiceName = 'Fenrir'; break;
            case 'woman': voiceName = 'Kore'; break;
            case 'child': voiceName = 'Puck'; break;
            default: voiceName = 'Charon';
        }
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } } },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio");
        // Decode and re-encode logic...
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const pcmData = new Int16Array(bytes.buffer);
        const wavBuffer = addWavHeader(pcmData, 24000);
        const wavBytes = new Uint8Array(wavBuffer);
        let binary = '';
        const wavLen = wavBytes.byteLength;
        const chunkSize = 8192;
        for (let i = 0; i < wavLen; i += chunkSize) {
            const chunk = wavBytes.subarray(i, Math.min(i + chunkSize, wavLen));
            binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        return btoa(binary);
    });
};

export const generateImage = async (
    basePrompt: string, 
    settings: MediaSettings, 
    style: ImageStyleConfig,
    apiKey?: string,
    activeCharacters: Character[] = [] 
): Promise<string> => {
    return callWithRetry(async () => {
        const ai = getAI(apiKey);

        // Define a Rigid Structure for the Prompt to prevent Style Drift
        
        // 1. Character Block
        const characterBlock = activeCharacters.length > 0 
            ? `
*** CHARACTER VISUAL REQUIREMENTS (STRICT ADHERENCE REQUIRED) ***
The following characters are present in the scene. You MUST render them EXACTLY as described. 
If multiple characters are listed, ALL must appear.
${activeCharacters.map(c => `
--- CHARACTER: ${c.name} ---
${c.description}
`).join('\n')}
` 
            : '';

        // 2. Global Style Block
        const styleBlock = `
*** GLOBAL ART STYLE & TECHNICAL SPECS ***
- Art Style: ${style.artStyle}
- Lighting: ${style.lighting}
- Color Palette: ${style.colorGrade}
- Camera Angle: ${style.cameraAngle}
- Character Look: ${style.characterLook}
- Clothing Style: ${style.clothingStyle}
- Quality: 8k, highly detailed, photorealistic, cinematic composition.
`;

        // 3. Scene Content
        const sceneBlock = `
*** SCENE CONTENT ***
${basePrompt}
`;

        // Final Assembly
        const finalPrompt = `
You are an expert image generation prompt engineer.
Generate an image based on the following rigid specifications.

${styleBlock}
${characterBlock}
${sceneBlock}

INSTRUCTION: 
1. Prioritize the GLOBAL ART STYLE. The entire image must unify under "${style.artStyle}".
2. Render characters EXACTLY as defined in the CHARACTER VISUAL REQUIREMENTS. Do not blend their features.
3. Ensure the scene content actions are depicted clearly.
`;

        // Helper to run generation
        const runGeneration = async (model: string, config: any) => {
             const response = await ai.models.generateContent({
                model,
                contents: { parts: [{ text: finalPrompt }] },
                config
            });

            for (const cand of response.candidates || []) {
                for (const part of cand.content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            throw new Error("No image data returned.");
        };
        
        // Attempt 1: Gemini 3 Pro (High Quality, Paid)
        try {
             const config: any = {
                 imageConfig: {
                     aspectRatio: settings.aspectRatio,
                     imageSize: "1K" 
                 }
            };
            return await runGeneration('gemini-3-pro-image-preview', config);
        } catch (e: any) {
             console.warn(`Gemini 3 Pro failed: ${e.message}. Falling back to Flash.`);
             // Fallback: Gemini 2.5 Flash
             const flashConfig: any = {
                 imageConfig: {
                     aspectRatio: settings.aspectRatio
                 }
             };
             return await runGeneration('gemini-2.5-flash-image', flashConfig);
        }
    });
};