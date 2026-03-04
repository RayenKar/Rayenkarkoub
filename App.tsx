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

      {/* Modern Premium Background (Aurora / Mesh Gradient + Mixed Elements) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden bg-[#020617]">
        {/* Deep Atmospheric Glows (Aurora Effect) */}
        <div className="absolute top-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-cyan-500/10 blur-[150px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '10s' }}></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-600/10 blur-[150px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '15s', animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] bg-blue-800/10 blur-[120px] rounded-full mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '5s' }}></div>

        {/* 1. Stars / Deep Space */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 160px 120px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 130px 180px, #ffffff, rgba(0,0,0,0)),
            radial-gradient(1.5px 1.5px at 60px 150px, #ffffff, rgba(0,0,0,0))
          `,
          backgroundSize: '200px 200px',
          opacity: 0.15
        }}></div>

        {/* 2. Bokeh Lights */}
        <div className="absolute top-[30%] left-[20%] w-32 h-32 bg-cyan-500/15 blur-[20px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[40%] right-[30%] w-48 h-48 bg-blue-500/15 blur-[30px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-[60%] left-[60%] w-24 h-24 bg-indigo-500/15 blur-[15px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[20%] left-[40%] w-40 h-40 bg-sky-500/15 blur-[25px] rounded-full mix-blend-screen"></div>

        {/* 3. Light Tunnel (Subtle perspective lines) */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(14, 165, 233, 0.2) 100px, rgba(14, 165, 233, 0.2) 101px)',
          transform: 'perspective(500px) rotateX(75deg)',
          transformOrigin: 'bottom'
        }}></div>
        <div className="absolute inset-0 opacity-[0.15]" style={{
          background: 'repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(79, 70, 229, 0.2) 100px, rgba(79, 70, 229, 0.2) 101px)',
          transform: 'perspective(500px) rotateX(75deg) rotateY(10deg)',
          transformOrigin: 'bottom'
        }}></div>

        {/* Modern Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]"></div>

        {/* Premium Noise Texture */}
        <div className="absolute inset-0 noise-bg opacity-[0.04] mix-blend-overlay"></div>
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