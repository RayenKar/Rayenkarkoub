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

    const { text } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text darf nicht leer sein." },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Translate German to Arabic. Output only the Arabic translation.\n\n${text}`,
    })

    return NextResponse.json({ translation: response.text?.trim() || "" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Translation fehlgeschlagen." },
      { status: 500 }
    )
  }
}
