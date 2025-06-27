import { TextBasedChannel } from "discord.js";

export interface Track {
  title: string;
  artist: string;
  duration: number;
  url: string;
  spotifyId?: string | null;
  thumbnail?: string | null;
  youtubeUrl?: string;
  requestedBy: string;
  messageChannel?: TextBasedChannel;
}

export interface Queue {
  tracks: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
}
