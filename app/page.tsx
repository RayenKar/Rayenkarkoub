"use client"

import { Header } from "@/components/header"
import { VoiceStudio } from "@/components/voice-studio"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen animate-pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", animationDuration: "8s" }}
        />
        <div
          className="absolute bottom-[-15%] left-[-5%] w-[50vw] h-[50vw] rounded-full mix-blend-screen animate-pulse-glow"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", animationDuration: "12s", animationDelay: "3s" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      <Header />

      <main className="flex-1 relative z-10">
        {/* Hero */}
        <section className="pt-16 pb-8 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-secondary/50 text-muted-foreground text-xs font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              GEMINI 2.5 FLASH TTS
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-[1.1] text-balance">
              {"Stimme trifft "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Intelligenz.
              </span>
            </h2>
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed text-pretty">
              Erleben Sie die Zukunft der Sprachsynthese mit
              unübertroffener Natürlichkeit und emotionaler Tiefe.
            </p>
          </div>
        </section>

        {/* Voice Studio */}
        <section className="px-4 sm:px-6 pb-24">
          <VoiceStudio />
        </section>
      </main>

      <Footer />
    </div>
  )
}
