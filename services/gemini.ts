
import { GoogleGenAI, Modality } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates high-quality German speech from text.
 * Uses a simplified prompt structure to prevent the model from reading instructions aloud.
 */
export const generateSpeech = async (text: string, voiceName: string, cloningPersona?: string) => {
  const ai = getAI();
  
  // TTS models work best with "Style: Text" format rather than complex system instructions blocks.
  let finalPrompt = "";

  if (cloningPersona) {
    // Neural Cloning Mode
    finalPrompt = `Imitate the following persona (${cloningPersona}) and read this text in German: ${text}`;
  } else {
    // Standard High-Fidelity Mode
    // We append a slight direction to ensure quality, but keep it brief.
    finalPrompt = `Read naturally in German: ${text}`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: finalPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audiogenerierung fehlgeschlagen. Keine Daten empfangen.");
  return base64Audio;
};

/**
 * Extracts text from an image using Gemini vision capabilities.
 */
export const extractTextFromImage = async (base64Image: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        { text: "Extrahiere den gesamten Text aus diesem Bild. Gib nur den erkannten Text zurück ohne zusätzliche Kommentare." },
      ],
    },
  });

  return response.text || "";
};

/**
 * Translates text from German to Arabic.
 */
export const translateText = async (text: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Translate the following German text into Arabic. Return strictly only the translated Arabic text, no markdown, no explanations.\n\nText: ${text}` }] }],
  });
  return response.text?.trim() || "";
};
