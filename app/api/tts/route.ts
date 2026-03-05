import { GoogleGenAI, Modality } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (error: any) {
      const msg = (error.message || error.toString()).toLowerCase()
      const status = error.status || error.code || 0

      const isRetryable =
        msg.includes("429") ||
        status === 429 ||
        msg.includes("resource has been exhausted") ||
        msg.includes("too many requests") ||
        status === 503 ||
        status === 500 ||
        msg.includes("overloaded") ||
        msg.includes("unavailable") ||
        msg.includes("internal") ||
        msg.includes("rpc failed") ||
        msg.includes("xhr error") ||
        msg.includes("fetch failed")

      if (isRetryable && attempt < maxRetries) {
        attempt++
        const delay = 2000 * Math.pow(2, attempt - 1) + Math.random() * 2000
        await wait(delay)
        continue
      }
      throw error
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const { text, voiceName, persona } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text darf nicht leer sein." },
        { status: 400 }
      )
    }

    const base64Audio = await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey })

      const promptText = persona
        ? `${persona} Lies NUR den folgenden Text vor, ohne Regieanweisungen zu sprechen:\n\n${text.trim()}`
        : `Du bist eine professionelle deutsche Sprecherin. Lies den Text klar und natürlich vor:\n\n${text.trim()}`

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      })

      const candidate = response.candidates?.[0]
      if (!candidate) throw new Error("Keine Antwort vom Server erhalten.")

      if (candidate.finishReason === "SAFETY")
        throw new Error("Generierung blockiert (Sicherheitsrichtlinien).")
      if (candidate.finishReason === "RECITATION")
        throw new Error("Generierung blockiert (Urheberrecht).")

      const part = candidate.content?.parts?.[0]
      if (!part) throw new Error("Leere Antwort.")

      const audio = part.inlineData?.data
      if (audio) return audio

      const textResponse = part.text
      if (textResponse)
        throw new Error(
          `KI-Verweigerung: "${textResponse.substring(0, 100)}..."`
        )

      throw new Error("Keine Audiodaten empfangen.")
    }, 5)

    return NextResponse.json({ audio: base64Audio })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Synthese fehlgeschlagen." },
      { status: 500 }
    )
  }
}
