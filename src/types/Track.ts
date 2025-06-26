export interface Track {
  title: string;
  artist: string;
  duration: number;
  url: string;
  thumbnail?: string;
  spotifyId?: string;
  requestedBy: string;
}

export interface Queue {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
}
