"use client"

import React, { useState } from "react"
import { AudioLines, ChevronDown, Loader2 } from "lucide-react"
import { type GermanVoice } from "@/lib/voices"
import { cn } from "@/lib/utils"

interface VoiceSelectorProps {
  voices: GermanVoice[]
  selectedVoice: GermanVoice
  onSelect: (voice: GermanVoice) => void
  onTest: (voice: GermanVoice) => void
  isTesting: boolean
}

export function VoiceSelector({
  voices,
  selectedVoice,
  onSelect,
  onTest,
  isTesting,
}: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const categories = [...new Set(voices.map((v) => v.category))]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Synthesizer Voice
      </div>

      <div className="relative">
        {/* Selected voice display */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between h-12 px-4 rounded-xl border border-border bg-secondary/50 hover:bg-secondary/80 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <AudioLines className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {selectedVoice.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {selectedVoice.description}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Test button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onTest(selectedVoice)
              }}
              disabled={isTesting}
              className="h-8 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all flex items-center gap-1.5"
            >
              {isTesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <AudioLines className="w-3 h-3" />
              )}
              Test
            </button>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 top-full mt-2 w-full rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-fade-in">
            <div className="max-h-[320px] overflow-y-auto">
              {categories.map((category) => (
                <div key={category}>
                  <div className="px-3 py-2 text-[9px] font-mono text-muted-foreground uppercase tracking-widest bg-secondary/50 sticky top-0">
                    {category}
                  </div>
                  {voices
                    .filter((v) => v.category === category)
                    .map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => {
                          onSelect(voice)
                          setIsOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all hover:bg-secondary/50",
                          selectedVoice.id === voice.id &&
                            "bg-primary/5 border-l-2 border-l-primary"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {voice.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {voice.description}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onTest(voice)
                          }}
                          disabled={isTesting}
                          className="shrink-0 w-7 h-7 rounded-md bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all"
                        >
                          {isTesting ? (
                            <Loader2 className="w-3 h-3 text-primary animate-spin" />
                          ) : (
                            <AudioLines className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
