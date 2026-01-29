
export interface GermanVoice {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  geminiVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}
