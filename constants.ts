
import { GermanVoice } from './types';

export interface ExtendedGermanVoice extends GermanVoice {
  persona: string;
  previewSnippet: string;
}

export const GERMAN_VOICES: ExtendedGermanVoice[] = [
  // --- KATEGORIE 1: DIE FAVORITEN (Klassisch & Beliebt) ---
  { 
    id: 'voice_f_01', 
    name: 'Sophie (Sanft)', 
    persona: 'Du sprichst sehr sanft, weich, warm und empathisch. Deine Stimme ist tiefenentspannt und beruhigend, perfekt für Hörbücher.',
    description: 'Weich und emotional.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Die Ruhe ist der Schlüssel zur Kraft.'
  },
  { 
    id: 'voice_f_02', 
    name: 'Lena (Natürlich)', 
    persona: 'Du sprichst frisch, sympathisch und authentisch. Du klingst wie eine nette Nachbarin oder gute Freundin, sehr klar und nahbar.',
    description: 'Alltäglich und sympathisch.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Hallo! Schön, dass du heute dabei bist.'
  },
  { 
    id: 'voice_f_03', 
    name: 'Emma (Fröhlich)', 
    persona: 'Du bist extrem sonnig, energiegeladen und lächelst beim Sprechen. Deine Stimme ist motivierend, optimistisch und hell.',
    description: 'Motivierend und sonnig.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Das ist absolut fantastisch!'
  },
  { 
    id: 'voice_f_04', 
    name: 'Nina (Jung)', 
    persona: 'Du bist ein Teenager. Deine Stimme ist jugendlich, hell, verspielt, modern und sehr lebhaft. Du klingst neugierig.',
    description: 'Jung und modern.', 
    gender: 'female', 
    geminiVoice: 'Kore', 
    previewSnippet: 'Wow, hast du das gesehen?'
  },
  { 
    id: 'voice_f_05', 
    name: 'Lara (Flüstern)', 
    persona: 'Du sprichst extrem leise, fast flüsternd, im ASMR-Stil. Du bist sehr nah am Mikrofon, hauchzart und intim.',
    description: 'ASMR und Entspannung.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Hörst du, wie leise die Welt sein kann?'
  },

  // --- KATEGORIE 2: GEN-Z & MODERN (Die neuen 10 Styles) ---
  { 
    id: 'voice_f_06', 
    name: 'Lea (Studentin)', 
    persona: 'Du bist eine Studentin, ca. 20 Jahre alt. Du sprichst locker, cool, mit leichtem modernen Slang. Sehr entspannt.',
    description: 'Der Sound der Gen-Z.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Echt jetzt? Das ist ja mega cool.'
  },
  { 
    id: 'voice_f_07', 
    name: 'Mina (Gamerin)', 
    persona: 'Du bist eine Twitch-Streamerin. Du sprichst schnell, aufgedreht, voller "Hype" und Energie. Etwas frech und laut.',
    description: 'High Energy & Gaming.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Let\'s go! Wir schaffen das Level locker.'
  },
  { 
    id: 'voice_f_08', 
    name: 'Zoe (Indie)', 
    persona: 'Du bist eine Künstlerin. Du sprichst verträumt, langsam, hauchig, nachdenklich und etwas melancholisch.',
    description: 'Alternativ und künstlerisch.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Die Farben des Himmels sind wie Musik.'
  },
  { 
    id: 'voice_f_09', 
    name: 'Lilli (Süß)', 
    persona: 'Du hast eine extrem helle, "niedliche" Stimme im Kawaii-Stil. Du bist unschuldig, sehr freundlich und liebenswert.',
    description: 'Super süß und hell.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Oh mein Gott, das ist so süß!'
  },
  { 
    id: 'voice_f_10', 
    name: 'Jana (Vlog)', 
    persona: 'Du bist eine Reise-Vloggerin. Du sprichst direkt zur Kamera, sehr persönlich, atemlos vor Begeisterung und dynamisch.',
    description: 'Social Media Style.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Ich nehme euch heute mit auf ein Abenteuer.'
  },
  { 
    id: 'voice_f_11', 
    name: 'Tessa (Cool)', 
    persona: 'Du bist cool und rebellisch. Deine Stimme ist tiefer, rauchig, lässig und absolut selbstbewusst. Gleichgültige Attitüde.',
    description: 'Rauchig und Cool.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Mir egal was andere denken. Mach dein Ding.'
  },
  { 
    id: 'voice_f_12', 
    name: 'Mia (Trend)', 
    persona: 'Du bist eine Mode-Influencerin. Du sprichst stilvoll, urban, elegant, aber mit junger Aussprache. Sehr gepflegt.',
    description: 'Lifestyle und Fashion.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Das ist der absolute Trend für diese Saison.'
  },
  { 
    id: 'voice_f_13', 
    name: 'Romy (Neugierig)', 
    persona: 'Du bist eine Entdeckerin. Deine Stimme ist hell, voller Fragen und Staunen. Du betonst Wörter aus Faszination.',
    description: 'Begeistert und offen.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'Hast du dich jemals gefragt, warum das so ist?'
  },
  { 
    id: 'voice_f_14', 
    name: 'Kira (Digital)', 
    persona: 'Du bist eine futuristische KI. Du sprichst präzise, leicht synthetisch, perfekt artikuliert, aber mit einer jungen Klangfarbe.',
    description: 'Sci-Fi KI Assistentin.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'System bereit. Initialisiere Protokoll.'
  },
  { 
    id: 'voice_f_15', 
    name: 'Amelie (Poetisch)', 
    persona: 'Du bist eine Poetin. Du sprichst lyrisch, sehr gefühlvoll, romantisch und langsam. Wie in einem Liebesfilm.',
    description: 'Romantisch und tief.', 
    gender: 'female', 
    geminiVoice: 'Kore',
    previewSnippet: 'In jedem Augenblick liegt eine Ewigkeit verborgen.'
  }
];

export const CLONING_PRESETS = [
  { id: 'c1', name: 'Neutral', desc: 'Standard Style' }
];

export const SAMPLE_TEXTS = [
  "In der Stille der Nacht entfaltet die Sprache ihre wahre Magie.",
  "Willkommen im High-Fidelity Studio.",
  "Die Kunst des Sprechens ist die Musik der Gedanken."
];
