import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, targetLang } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text darf nicht leer sein." },
        { status: 400 }
      )
    }

    const lang = targetLang || "Arabic"

    const result = await generateText({
      model: "anthropic/claude-opus-4.6",
      system: `You are a professional translator similar to Reverso Context. Translate the given German text to ${lang}. 

Rules:
- Output ONLY the translation, nothing else
- Preserve the original tone and register
- Use natural, fluent ${lang} (not literal word-by-word translation)
- Keep proper nouns unchanged
- If the text contains idioms, translate their meaning, not their literal words`,
      prompt: text.trim(),
    })

    return NextResponse.json({ translation: result.text?.trim() || "" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Translation fehlgeschlagen." },
      { status: 500 }
    )
  }
}
