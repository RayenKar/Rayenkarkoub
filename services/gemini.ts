
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key fehlt. Bitte fügen Sie ihn in die .env.local Datei ein.");
  return new GoogleGenAI({ apiKey });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper to execute API calls with exponential backoff for 429/503/XHR/Internal errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, operationName = "API Call"): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      // Normalize error message
      const msg = (error.message || error.toString()).toLowerCase();
      const status = error.status || error.code || 0;

      // Detect Quota/Rate Limit Errors
      const isQuotaError = 
        msg.includes('429') || 
        status === 429 || 
        msg.includes('resource has been exhausted') || 
        msg.includes('too many requests') || 
        msg.includes('quota');
      
      // Detect Server Overload/Availability/Internal Errors
      const isServerError = 
        status === 503 || 
        status === 500 ||
        msg.includes('503') || 
        msg.includes('500') ||
        msg.includes('overloaded') ||
        msg.includes('unavailable') ||
        msg.includes('internal error') ||
        msg.includes('internal');

      // Detect XHR/RPC Network Errors (code 6, xhr error)
      const isNetworkError = 
        msg.includes('rpc failed') || 
        msg.includes('xhr error') || 
        msg.includes('error code: 6') ||
        msg.includes('fetch failed') ||
        msg.includes('networkerror');

      if ((isQuotaError || isServerError || isNetworkError) && attempt < maxRetries) {
        attempt++;
        
        let baseDelay = isQuotaError ? 4000 : 2000;
        const jitter = Math.random() * 2000;
        const delay = (baseDelay * Math.pow(2, attempt - 1)) + jitter;
        
        console.warn(`[${operationName}] Retryable Error (${status}). Waiting ${Math.round(delay/1000)}s... (Try ${attempt}/${maxRetries})`);
        
        await wait(delay);
        continue;
      }
      
      // Final Error Handling
      if (isQuotaError) throw new Error("⚠️ Server ausgelastet (429). Bitte warten Sie kurz.");
      if (isServerError) throw new Error("⚠️ Interner KI-Fehler (500). Der Server ist momentan überlastet. Bitte versuchen Sie es später erneut.");
      if (isNetworkError) throw new Error("⚠️ Netzwerkfehler. Bitte Internet prüfen.");
      
      console.error(`[${operationName}] Critical Failure:`, error);
      throw error;
    }
  }
}

/**
 * Generates high-quality German speech.
 * Includes explicit error handling for missing audio data.
 */
export const generateSpeech = async (text: string, voiceName: string, cloningPersona?: string) => {
  return withRetry(async () => {
    const ai = getAI();
    
    const cleanText = text.trim();
    if (!cleanText) throw new Error("Text darf nicht leer sein.");

    // Configuration strict for Gemini 2.5 TTS
    const config: any = {
      responseModalities: [Modality.AUDIO], 
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    };

    const promptText = cloningPersona 
      ? `${cloningPersona} Lies NUR den folgenden Text vor, ohne Regieanweisungen zu sprechen:\n\n${cleanText}`
      : `Du bist eine professionelle deutsche Sprecherin. Lies den Text klar und natürlich vor:\n\n${cleanText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: promptText }] }],
      config: config,
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Keine Antwort vom Server erhalten.");

    // Check for Safety or Recitation blocks
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        if (candidate.finishReason === 'SAFETY') throw new Error("Generierung blockiert (Sicherheitsrichtlinien).");
        if (candidate.finishReason === 'RECITATION') throw new Error("Generierung blockiert (Urheberrecht/Wiederholung).");
        if (candidate.finishReason === 'OTHER') console.warn("TTS Finish Reason: OTHER (Proceeding check)");
    }

    const part = candidate.content?.parts?.[0];
    if (!part) throw new Error("Leere Antwort (Keine Inhaltsteile).");
    
    // 1. Check for Audio
    const base64Audio = part.inlineData?.data;
    if (base64Audio) return base64Audio;

    // 2. Check for Text Refusal (Model refused to generate audio and sent text instead)
    const textResponse = part.text;
    if (textResponse) {
       console.warn("TTS Refusal:", textResponse);
       // Return specific error if model refuses
       throw new Error(`KI-Verweigerung: "${textResponse.substring(0, 100)}..."`);
    }
    
    throw new Error("Keine Audiodaten empfangen. Bitte versuchen Sie es erneut.");
  }, 5, "TTS Generation");
};

/**
 * Extracts text from image.
 */
export const extractTextFromImage = async (base64Image: string) => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "OCR: Extrahiere den gesamten Text exakt auf Deutsch." },
        ],
      },
    });
    return response.text || "";
  }, 3, "Vision Extraction");
};

/**
 * Translates text from German to Arabic.
 */
export const translateText = async (text: string): Promise<string> => {
  return withRetry(async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate German to Arabic. Output only the Arabic translation.\n\n${text}`,
    });
    return response.text?.trim() || "";
  }, 3, "Translation");
};
