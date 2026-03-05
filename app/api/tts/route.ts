import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 500 }
      )
    }

    const { text, voice, speed } = await request.json()

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text darf nicht leer sein." },
        { status: 400 }
      )
    }

    const validVoices = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer"]
    const selectedVoice = validVoices.includes(voice) ? voice : "nova"
    const selectedSpeed = typeof speed === "number" ? Math.max(0.25, Math.min(4.0, speed)) : 1.0

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: text.trim().substring(0, 4096),
        voice: selectedVoice,
        response_format: "mp3",
        speed: selectedSpeed,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData?.error?.message || `OpenAI TTS error: ${response.status}`
      return NextResponse.json({ error: errorMessage }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString("base64")

    return NextResponse.json({ audio: base64Audio, format: "mp3" })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Synthese fehlgeschlagen." },
      { status: 500 }
    )
  }
}
