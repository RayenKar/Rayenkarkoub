import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "Deutsch-KI | AI Voice Synthesis",
  description:
    "Erleben Sie die Zukunft der deutschen Sprachsynthese mit Gemini 2.5 Flash TTS. Hochwertige Stimmen, Echtzeit-Diktat und OCR-Scanner.",
}

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" className="dark">
      <body
        className={`${inter.variable} ${jetbrains.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  )
}
