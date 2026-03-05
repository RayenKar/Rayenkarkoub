export interface GermanVoice {
  id: string
  name: string
  shortName: string
  description: string
  gender: "male" | "female" | "neutral"
  openaiVoice: string
  previewSnippet: string
  category: string
  character: string
}

export const GERMAN_VOICES: GermanVoice[] = [
  // --- HD Voices ---
  {
    id: "voice_alloy",
    name: "Alloy",
    shortName: "Alloy",
    description: "Vielseitig und ausgewogen.",
    gender: "neutral",
    openaiVoice: "alloy",
    previewSnippet: "Die Kunst des Sprechens ist die Musik der Gedanken.",
    category: "HD Stimmen",
    character: "Neutral, klar und professionell. Perfekt als Allrounder.",
  },
  {
    id: "voice_ash",
    name: "Ash",
    shortName: "Ash",
    description: "Sanft und vertrauenswürdig.",
    gender: "male",
    openaiVoice: "ash",
    previewSnippet: "Willkommen, ich bin bereit dir zu helfen.",
    category: "HD Stimmen",
    character: "Ruhig, sanft, und gesprächig. Ideal für Erklärungen.",
  },
  {
    id: "voice_ballad",
    name: "Ballad",
    shortName: "Ballad",
    description: "Warm und ausdrucksvoll.",
    gender: "male",
    openaiVoice: "ballad",
    previewSnippet: "In jedem Augenblick liegt eine Ewigkeit verborgen.",
    category: "HD Stimmen",
    character: "Expressiv und melodisch. Perfekt für Geschichten und Poesie.",
  },
  {
    id: "voice_coral",
    name: "Coral",
    shortName: "Coral",
    description: "Warmherzig und einladend.",
    gender: "female",
    openaiVoice: "coral",
    previewSnippet: "Hallo! Schön, dass du heute dabei bist.",
    category: "HD Stimmen",
    character: "Freundlich und nahbar. Gut für Podcasts und Dialoge.",
  },
  {
    id: "voice_echo",
    name: "Echo",
    shortName: "Echo",
    description: "Glatt und resonant.",
    gender: "male",
    openaiVoice: "echo",
    previewSnippet: "Die Ruhe ist der Schlüssel zur Kraft.",
    category: "HD Stimmen",
    character: "Tief und volltönend. Stark für Hörbücher und Vorträge.",
  },
  {
    id: "voice_fable",
    name: "Fable",
    shortName: "Fable",
    description: "Dynamisch und lebendig.",
    gender: "male",
    openaiVoice: "fable",
    previewSnippet: "Wow, hast du das gesehen? Das ist fantastisch!",
    category: "HD Stimmen",
    character: "Energisch und britisch angehaucht. Gut für Erzählungen.",
  },
  {
    id: "voice_nova",
    name: "Nova",
    shortName: "Nova",
    description: "Jung, frisch und hell.",
    gender: "female",
    openaiVoice: "nova",
    previewSnippet: "Das ist absolut fantastisch! Los geht's!",
    category: "HD Stimmen",
    character: "Optimistisch und energiegeladen. Der Sound der neuen Generation.",
  },
  {
    id: "voice_onyx",
    name: "Onyx",
    shortName: "Onyx",
    description: "Tief und kraftvoll.",
    gender: "male",
    openaiVoice: "onyx",
    previewSnippet: "Mir egal was andere denken. Mach dein Ding.",
    category: "HD Stimmen",
    character: "Autoritativ und markant. Ideal für Nachrichten und Doku.",
  },
  {
    id: "voice_sage",
    name: "Sage",
    shortName: "Sage",
    description: "Sanft und beruhigend.",
    gender: "female",
    openaiVoice: "sage",
    previewSnippet: "Hörst du, wie leise die Welt sein kann?",
    category: "HD Stimmen",
    character: "Weise und gelassen. Perfekt für Meditation und Bildung.",
  },
  {
    id: "voice_shimmer",
    name: "Shimmer",
    shortName: "Shimmer",
    description: "Klar und positiv.",
    gender: "female",
    openaiVoice: "shimmer",
    previewSnippet: "Ich nehme euch heute mit auf ein Abenteuer.",
    category: "HD Stimmen",
    character: "Hell und freundlich. Großartig für Marketing und Tutorials.",
  },
]

export const SAMPLE_TEXTS = [
  "In der Stille der Nacht entfaltet die Sprache ihre wahre Magie.",
  "Willkommen im High-Fidelity Studio.",
  "Die Kunst des Sprechens ist die Musik der Gedanken.",
]
