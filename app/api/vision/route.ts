import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: "Kein Bild bereitgestellt." },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: image } },
          {
            text: "OCR: Extrahiere den gesamten Text exakt auf Deutsch.",
          },
        ],
      },
    })

    return NextResponse.json({ text: response.text || "" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Vision fehlgeschlagen." },
      { status: 500 }
    )
  }
}
