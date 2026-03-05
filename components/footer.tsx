export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border py-8 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
        <span>Deutsch-KI Suite v3.0</span>
        <div className="flex gap-6">
          <span>
            LATENCY <span className="text-foreground/60">~12ms</span>
          </span>
          <span>
            FREQ <span className="text-foreground/60">48kHz</span>
          </span>
          <span>
            BUILD <span className="text-foreground/60">STABLE</span>
          </span>
        </div>
      </div>
    </footer>
  )
}
