import React from 'react';
import { VoiceStudio } from './components/VoiceStudio';

const App: React.FC = () => {
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
        alert("L'installation est déjà active ou votre navigateur ne la supporte pas directement. Utilisez le menu du navigateur -> 'Installer l'application'.");
        return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleIOSInstall = () => {
      alert("Sur iPhone/iPad : Appuyez sur le bouton 'Partager' (carré avec flèche) puis choisissez 'Sur l'écran d'accueil'.");
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200 font-inter">
      {/* Global CSS for Scrollbars & Animations */}
      <style>{`
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #020408; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        @keyframes scan { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
        .noise-bg {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Immersive Background System */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#020408]"></div>
        <div className="absolute inset-0 noise-bg opacity-30 mix-blend-overlay"></div>
        
        {/* Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen animate-pulse duration-[8000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-600/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60vw] h-[20vw] bg-purple-900/5 blur-[100px] rounded-full"></div>
      </div>

      {/* Artistic Header */}
      <header className="sticky top-0 z-50 py-4 border-b border-white/5 bg-[#020408]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#020408]/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative w-10 h-10 bg-[#0a0c10] rounded-xl flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tighter flex flex-col leading-none">
                <span className="flex items-center gap-1">
                    DEUTSCH<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">KI</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mt-1">Next_Gen_Synthesis</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {installPrompt && (
              <button 
                onClick={handleInstall}
                className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all animate-pulse"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Install App</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-6 bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <StatusIndicator label="ENGINE" value="GEMINI 2.5" status="active" />
              <div className="w-px h-6 bg-white/10"></div>
              <StatusIndicator label="BITRATE" value="320 KBPS" status="high" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 pt-12 pb-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 space-y-6">
          <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[0.95] drop-shadow-2xl">
            Stimme trifft <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-200 via-indigo-400 to-cyan-400">Intelligenz.</span>
          </h2>
          <p className="text-base text-slate-400 font-light max-w-xl mx-auto leading-relaxed italic opacity-80">
            Erleben Sie die Zukunft der Sprachsynthese mit unübertroffener Natürlichkeit und emotionaler Tiefe.
          </p>
        </div>

        <VoiceStudio />

        {/* --- DOWNLOAD PLATFORMS SECTION --- */}
        <section className="max-w-7xl mx-auto mt-24 mb-10">
          <div className="relative p-8 rounded-3xl border border-white/10 bg-[#0a0c10]/50 backdrop-blur-sm overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
             
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-white tracking-tight mb-2">Multi-Platform Access</h3>
                  <p className="text-sm text-slate-400 max-w-md">
                    Installieren Sie die Deutsch-KI Native App für maximale Performance und Offline-Funktionalität.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  {/* Android Button */}
                  <button 
                    onClick={handleInstall}
                    className="group relative flex items-center gap-3 bg-[#1a1d26] hover:bg-[#232733] border border-white/10 hover:border-emerald-500/50 px-5 py-3 rounded-xl transition-all duration-300"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1527-.5676.416.416 0 00-.5676.1527l-2.0294 3.513c-2.2683-1.033-4.8468-1.033-7.115 0l-2.0294-3.513a.416.416 0 00-.5676-.1527.416.416 0 00-.1527.5676l1.9973 3.4592c-4.6653 2.548-5.3228 7.8468-5.3228 9.3904h24.2676c0-1.5435-.6575-6.8424-5.3228-9.3904"/></svg>
                    </div>
                    <div className="text-left">
                       <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold group-hover:text-emerald-400">Download for</div>
                       <div className="text-sm font-bold text-white">Android</div>
                    </div>
                  </button>

                  {/* Windows Button */}
                  <button 
                    onClick={handleInstall}
                    className="group relative flex items-center gap-3 bg-[#1a1d26] hover:bg-[#232733] border border-white/10 hover:border-blue-500/50 px-5 py-3 rounded-xl transition-all duration-300"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 text-blue-400 transition-colors">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>
                    </div>
                    <div className="text-left">
                       <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold group-hover:text-blue-400">Download for</div>
                       <div className="text-sm font-bold text-white">Windows</div>
                    </div>
                  </button>

                  {/* iPhone Button */}
                  <button 
                    onClick={handleIOSInstall}
                    className="group relative flex items-center gap-3 bg-[#1a1d26] hover:bg-[#232733] border border-white/10 hover:border-gray-400 px-5 py-3 rounded-xl transition-all duration-300"
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-gray-500/10 rounded-lg group-hover:bg-gray-500/20 text-gray-300 transition-colors">
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.12-1.1.05-2.52.76-3.35 1.73-.72.85-1.36 2.16-1.18 3.16 1.32.1 2.7-.93 3.46-1.77"/></svg>
                    </div>
                    <div className="text-left">
                       <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold group-hover:text-gray-300">Download for</div>
                       <div className="text-sm font-bold text-white">iPhone</div>
                    </div>
                  </button>
                </div>
             </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 bg-[#020408]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 opacity-60 hover:opacity-100 transition-opacity">
          <div className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-600">
            © 2024 DEUTSCH-KI SUITE — v2.5.0
          </div>
          <div className="flex gap-8">
             <FooterStat label="LATENCY" value="~12ms" />
             <FooterStat label="FREQ" value="48kHz" />
             <FooterStat label="BUILD" value="STABLE" />
          </div>
        </div>
      </footer>
    </div>
  );
};

const StatusIndicator = ({ label, value, status }: { label: string, value: string, status: 'active' | 'high' }) => (
  <div className="flex items-center gap-3 group cursor-default">
    <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-indigo-500 shadow-[0_0_8px_#6366f1]'} animate-pulse`}></div>
    <div className="flex flex-col text-left">
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-bold text-slate-300 font-mono">{value}</span>
    </div>
  </div>
);

const FooterStat = ({ label, value }: { label: string, value: string }) => (
  <span className="text-[10px] text-slate-600 font-mono tracking-widest flex items-center gap-2">
    {label} <span className="text-slate-400">{value}</span>
  </span>
);

export default App;