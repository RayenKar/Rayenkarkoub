import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: "Kein Bild bereitgestellt." },
        { status: 400 }
      )
    }

    const result = await generateText({
      model: "anthropic/claude-opus-4.6",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: `data:image/jpeg;base64,${image}`,
            },
            {
              type: "text",
              text: "OCR: Extrahiere den gesamten sichtbaren Text aus diesem Bild. Gib nur den extrahierten Text aus, ohne Erklärungen oder Formatierung. Behalte die Originalsprache bei.",
            },
          ],
        },
      ],
    })

    return NextResponse.json({ text: result.text || "" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Vision fehlgeschlagen." },
      { status: 500 }
    )
  }
}
