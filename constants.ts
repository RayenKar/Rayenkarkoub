
import { GermanVoice } from './types';

export interface ExtendedGermanVoice extends GermanVoice {
  persona: string;
  previewSnippet: string;
}

export const GERMAN_VOICES: ExtendedGermanVoice[] = [
  { 
    id: 'v1', 
    name: 'Maximilian', 
    persona: 'Der Bühnen-Meister',
    description: 'Tiefer, theatralischer Bariton für große Dramen und Epen.', 
    gender: 'male', 
    geminiVoice: 'Kore',
    previewSnippet: 'Willkommen auf der großen Bühne der Worte.'
  },
  { 
    id: 'v2', 
    name: 'Marlene', 
    persona: 'Die Noir-Ikone',
    description: 'Rauchig, elegant und geheimnisvoll wie die Klassiker von früher.', 
    gender: 'female', 
    geminiVoice: 'Puck',
    previewSnippet: 'Manche Geschichten brauchen nur einen Hauch von Stimme.'
  },
  { 
    id: 'v3', 
    name: 'Sebastian', 
    persona: 'Der Tech-Vordenker',
    description: 'Präzise, klar und analytisch. Perfekt für das digitale Zeitalter.', 
    gender: 'male', 
    geminiVoice: 'Charon',
    previewSnippet: 'Innovation beginnt mit einer klaren Botschaft.'
  },
  { 
    id: 'v4', 
    name: 'Clara', 
    persona: 'Die Lyrikerin',
    description: 'Zart, schwebend und voller Emotionen für Poesie und Herzenswünsche.', 
    gender: 'female', 
    geminiVoice: 'Zephyr',
    previewSnippet: 'Ein leises Wort kann lauter sein als jeder Schrei.'
  },
  { 
    id: 'v5', 
    name: 'Erik', 
    persona: 'Der Storyteller',
    description: 'Erfahren, markant und fesselnd – ein Erzähler alter Schule.', 
    gender: 'male', 
    geminiVoice: 'Fenrir',
    previewSnippet: 'Setz dich ans Feuer. Ich habe dir etwas zu erzählen.'
  },
  { 
    id: 'v6', 
    name: 'Sophie', 
    persona: 'Die Trendsetterin',
    description: 'Jung, frisch und voller Energie für moderne Visionen.', 
    gender: 'female', 
    geminiVoice: 'Zephyr',
    previewSnippet: 'Die Zukunft klingt heller, wenn wir sie gemeinsam gestalten.'
  },
  { 
    id: 'v7', 
    name: 'Konrad', 
    persona: 'Der Philosoph',
    description: 'Bedächtig und weise, strahlt tiefes Vertrauen und Ruhe aus.', 
    gender: 'male', 
    geminiVoice: 'Kore',
    previewSnippet: 'In der Ruhe liegt die Kraft der wahren Erkenntnis.'
  },
  { 
    id: 'v8', 
    name: 'Lina', 
    persona: 'Die Visionärin',
    description: 'Inspirierend, warm und direkt. Eine Stimme, die Brücken baut.', 
    gender: 'female', 
    geminiVoice: 'Puck',
    previewSnippet: 'Jede große Reise beginnt mit einem einzigen gesprochenen Wort.'
  },
  { 
    id: 'v9', 
    name: 'Hans', 
    persona: 'Der Alchimist',
    description: 'Mysteriös und tiefgreifend, ideal für experimentelle Audiokunst.', 
    gender: 'male', 
    geminiVoice: 'Fenrir',
    previewSnippet: 'Aus Blei wird Gold, aus Stille wird Klang.'
  },
  { 
    id: 'v10', 
    name: 'Greta', 
    persona: 'Die Chronistin',
    description: 'Neutral, sachlich aber mit einer unterschwelligen Wärme.', 
    gender: 'female', 
    geminiVoice: 'Zephyr',
    previewSnippet: 'Die Geschichte wird von denen geschrieben, die sie laut aussprechen.'
  },
  {
    id: 'v11',
    name: 'Elias',
    persona: 'Der Urbane',
    description: 'Modern, schnell und direkt. Ideal für Tech-News und Lifestyle.',
    gender: 'male',
    geminiVoice: 'Charon',
    previewSnippet: 'Willkommen in der Zukunft. Alles ist vernetzt.'
  },
  {
    id: 'v12',
    name: 'Mila',
    persona: 'Die Sanfte',
    description: 'Weich, beruhigend und empathisch. Perfekt für Meditation und Wellness.',
    gender: 'female',
    geminiVoice: 'Zephyr',
    previewSnippet: 'Atme tief ein und lass die Gedanken einfach ziehen.'
  },
  {
    id: 'v13',
    name: 'Karl',
    persona: 'Der Bass',
    description: 'Extrem tief, sonor und autoritär. Für Ankündigungen mit Gewicht.',
    gender: 'male',
    geminiVoice: 'Fenrir',
    previewSnippet: 'Dies ist eine Warnung. Unterschätzen Sie niemals die Stille.'
  },
  {
    id: 'v14',
    name: 'Hannah',
    persona: 'Die Reporterin',
    description: 'Sachlich, investigativ und messerscharf in der Artikulation.',
    gender: 'female',
    geminiVoice: 'Puck',
    previewSnippet: 'Wir berichten live vom Ort des Geschehens. Die Fakten liegen auf dem Tisch.'
  },
  {
    id: 'v15',
    name: 'Theo',
    persona: 'Der Schelm',
    description: 'Verspielt, ironisch und mit einem Augenzwinkern.',
    gender: 'male',
    geminiVoice: 'Kore',
    previewSnippet: 'Glaubst du wirklich, das war schon alles? Da irrst du dich gewaltig.'
  }
];

export const CLONING_PRESETS = [
  { id: 'c1', name: 'Werner H. Style', desc: 'Hypnotic, philosophical, existential dread, distinct German accent' },
  { id: 'c2', name: 'Arnold S. Style', desc: 'Deep, authoritative, strong Styrian/Austrian accent, powerful' },
  { id: 'c3', name: 'Angela M. Style', desc: 'Calm, steady, analytical, pragmatic, Uckermark tone' },
  { id: 'c4', name: 'Klaus K. Style', desc: 'Intense, whispered to shouting dynamic, manic energy' },
  { id: 'c5', name: 'Marlene D. Style', desc: 'Smokey, 1930s Berlin cabaret, melancholic, singing quality' },
  { id: 'c6', name: 'Hans A. Style', desc: 'Rough, maritime, Hamburg dialect, hearty and loud' },
  { id: 'c7', name: 'Romy S. Style', desc: 'Sweet, royal, soft spoken, emotional Austrian dialect' },
  { id: 'c8', name: 'Epic Movie Trailer', desc: 'Deep bass, dramatic pauses, Hollywood blockbuster style' },
  { id: 'c9', name: 'Falco Style', desc: 'Rhythmic, Vienna dialect, arrogant cool, musical phrasing, rap-like cadence' },
  { id: 'c10', name: 'Udo L. Style', desc: 'Smokey, nuschel-rock, relaxed, distinctive slur, cool eccentric' },
  { id: 'c11', name: 'Heidi K. Style', desc: 'High pitched, very energetic, enthusiastic, slightly americanized German syntax' },
  { id: 'c12', name: 'Soccer Commentator', desc: 'High energy, rapid fire, emotional peaks, shouting goal celebrations' },
  { id: 'c13', name: 'Grimm Narrator', desc: 'Ancient, creaky, whispering, slow paced, mysterious fairytale atmosphere' },
];

export const SAMPLE_TEXTS = [
  "In der Stille der Nacht entfaltet die Sprache ihre wahre Magie, wenn Worte zu Klang werden.",
  "Willkommen im High-Fidelity Studio. Hier verschmilzt modernste KI mit der Schönheit der deutschen Sprache.",
  "Die Kunst des Sprechens ist die Musik der Gedanken. Wir geben Ihren Visionen eine unverwechselbare Stimme.",
  "Präzision trifft auf Emotion. Erleben Sie Audiotechnologie in ihrer reinsten Form."
];
