"use client"

import { AudioLines } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="relative w-8 h-8 bg-card rounded-lg flex items-center justify-center border border-border">
              <AudioLines className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold text-foreground tracking-tight">
              {"DEUTSCH"}
              <span className="text-primary">KI</span>
            </span>
            <span className="text-[9px] font-mono text-muted-foreground tracking-widest">
              VOICE SYNTHESIS
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[10px] font-mono text-muted-foreground tracking-wider">
          <StatusDot label="ENGINE" value="GEMINI 2.5" active />
          <span className="w-px h-4 bg-border" />
          <StatusDot label="QUALITY" value="320 KBPS" />
        </div>
      </div>
    </header>
  )
}

function StatusDot({
  label,
  value,
  active = false,
}: {
  label: string
  value: string
  active?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
            : "bg-primary shadow-[0_0_6px_rgba(59,130,246,0.4)]"
        }`}
      />
      <div className="flex flex-col">
        <span className="text-[8px] text-muted-foreground/60 uppercase">
          {label}
        </span>
        <span className="text-[10px] text-foreground/70">{value}</span>
      </div>
    </div>
  )
}
