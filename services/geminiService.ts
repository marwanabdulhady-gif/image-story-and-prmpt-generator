import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { StoryConfig, StoryOutput, MediaSettings, VoiceConfig, ImageStyleConfig } from "../types";

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
          narrative: { type: Type.STRING },
          imagePrompt: { type: Type.STRING, description: "Highly detailed, visual description of the scene for an image generator. Include specific details about lighting, camera angle, and character appearance." },
          motionPrompt: { type: Type.STRING, description: "Description of the movement in the scene for a video generator (e.g., pan right, character walks forward)." }
        },
        required: ["sceneNumber", "narrative", "imagePrompt", "motionPrompt"]
      }
    }
  },
  required: ["title", "summary", "scenes"]
};

export const generateStory = async (config: StoryConfig, voiceConfig: VoiceConfig, apiKey?: string): Promise<StoryOutput> => {
  return callWithRetry(async () => {
      const ai = getAI(apiKey);
      const langName = config.language; // 'ar' | 'en' etc
      
      let accentInstruction = '';
      if (config.language === 'ar') {
         accentInstruction = `The narrative MUST be in ${voiceConfig.accent} Arabic dialect.`;
      } else {
         accentInstruction = `Language: ${config.language}.`;
      }
      
      const prompt = `
        Create a highly detailed cinematic story script.
        
        OUTPUT CONFIGURATION:
        - Main Language: ${langName} (${accentInstruction})
        - ImagePrompt, MotionPrompt: ENGLISH (Must be very detailed for AI generation)

        STORY CONFIGURATION:
        - Genre: ${config.category}
        - Premise: ${config.premise}
        - Setting: ${config.setting}
        - Pacing: ${config.pacing}
        - Plot Twist Level: ${config.plotTwist}

        CHARACTERS:
        - Main Cast Size: ${config.characterCount}
        - Protagonist: ${config.protagonist}
        - Antagonist: ${config.antagonist}
        - Supporting: ${config.supportingCharacters}

        STRUCTURE:
        - Generate exactly ${config.sceneCount} scenes.
        - Tone: ${voiceConfig.tone}.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
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
    return callWithRetry(async () => {
        const ai = getAI(apiKey);
        let voiceName = 'Puck';
        switch (voiceType) {
            case 'man_deep': voiceName = 'Fenrir'; break;
            case 'man_soft': voiceName = 'Puck'; break;
            case 'man_drama': voiceName = 'Charon'; break;
            case 'woman': voiceName = 'Kore'; break;
            case 'child': voiceName = 'Zephyr'; break;
            default: voiceName = 'Puck';
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned from Gemini.");

        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const pcmData = new Int16Array(bytes.buffer);
        const wavBuffer = addWavHeader(pcmData, 24000);
        
        // Convert back to base64 efficiently
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
    apiKey?: string
): Promise<string> => {
    return callWithRetry(async () => {
        const ai = getAI(apiKey);

        const styleModifiers = [
            style.artStyle !== 'None' ? `Style: ${style.artStyle}` : '',
            style.cameraAngle !== 'None' ? `Camera Angle: ${style.cameraAngle}` : '',
            style.lighting !== 'None' ? `Lighting: ${style.lighting}` : '',
            style.colorGrade !== 'None' ? `Color Grading: ${style.colorGrade}` : '',
            style.characterLook !== 'None' ? `Character Look: ${style.characterLook}` : '',
            style.clothingStyle !== 'None' ? `Clothes: ${style.clothingStyle}` : '',
            "High resolution", "8k", "Highly detailed"
        ].filter(Boolean).join(", ");

        const finalPrompt = `${basePrompt}. \n\nVisual Specifications: ${styleModifiers}`;
        
        if (settings.imageModel === 'imagen-3.0-generate-001') {
            const response = await ai.models.generateImages({
                model: settings.imageModel,
                prompt: finalPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: settings.aspectRatio,
                },
            });
            const base64 = response.generatedImages?.[0]?.image?.imageBytes;
            if (!base64) throw new Error("No image generated from Imagen.");
            return `data:image/jpeg;base64,${base64}`;
        } 
        else {
            const response = await ai.models.generateContent({
                model: settings.imageModel,
                contents: { parts: [{ text: finalPrompt }] },
                config: {
                    // @ts-ignore
                    imageConfig: { aspectRatio: settings.aspectRatio }
                }
            });

            for (const cand of response.candidates || []) {
                for (const part of cand.content.parts) {
                    if (part.inlineData) {
                        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
            }
            throw new Error("No image generated from Gemini.");
        }
    });
};

export const generateVideo = async (prompt: string, imageBase64: string, settings: MediaSettings, apiKey?: string) => {
    // Videos usually take longer, we might want different retry logic or just standard handling.
    // Given the polling nature, the retry is less about 429 and more about initiation.
    const ai = getAI(apiKey);
    const cleanBase64 = imageBase64.split(',')[1];
    const mimeType = imageBase64.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/png';

    let operation = await ai.models.generateVideos({
        model: settings.videoModel,
        prompt: prompt,
        image: {
            imageBytes: cleanBase64,
            mimeType: mimeType
        },
        config: {
            numberOfVideos: 1,
            resolution: settings.videoResolution,
        }
    });

    const startTime = Date.now();
    const TIMEOUT_MS = 600 * 1000;
    
    while (!operation.done) {
        if (Date.now() - startTime > TIMEOUT_MS) throw new Error("Video generation timed out.");
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed. Check API quota.");

    const keyToUse = apiKey || process.env.API_KEY;
    const videoResponse = await fetch(`${videoUri}&key=${keyToUse}`);
    
    if (videoResponse.status === 404) throw new Error("404_NOT_FOUND");
    if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    
    const blob = await videoResponse.blob();
    return URL.createObjectURL(blob);
};