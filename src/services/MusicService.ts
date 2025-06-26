import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  StreamType,
} from "@discordjs/voice";
import { VoiceBasedChannel, VoiceState } from "discord.js";
import { Track, Queue } from "../types/Track";
import { spawn } from "child_process";
import { Readable } from "stream";

export class MusicService {
  private queues: Map<string, Queue> = new Map();
  private connections: Map<string, VoiceConnection> = new Map();
  private players: Map<string, AudioPlayer> = new Map();
  private videoCache: Map<string, string> = new Map();

  public getQueue(guildId: string): Queue {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        tracks: [],
        currentTrack: null,
        isPlaying: false,
        volume: 50,
      });
    }
    return this.queues.get(guildId)!;
  }

  public async joinChannel(
    channel: VoiceBasedChannel
  ): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    this.connections.set(channel.guild.id, connection);

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      this.cleanup(channel.guild.id);
    });

    return connection;
  }

  public async addToQueue(guildId: string, tracks: Track[]): Promise<void> {
    const queue = this.getQueue(guildId);
    queue.tracks.push(...tracks);
  }

  private getYtdlpOpusStream(url: string): Readable {
    const ytdlp = spawn("yt-dlp", [
      "--quiet",
      "--no-warnings",
      "-f",
      "251",
      "-o",
      "-",
      "--no-playlist",
      url,
    ]);

    ytdlp.stdout.on("error", (err) => {
      console.error("❌ yt-dlp stdout error:", err);
    });

    ytdlp.stderr.on("data", (data) => {}); // Silence yt-dlp logs

    ytdlp.on("close", (code) => {
      if (code !== 0) {
        console.warn(`⚠️ yt-dlp exited with code ${code}`);
      }
    });

    return ytdlp.stdout;
  }

  public async play(guildId: string): Promise<void> {
    const queue = this.getQueue(guildId);
    const connection = this.connections.get(guildId);
    if (!connection || queue.tracks.length === 0 || queue.isPlaying) return;

    const track = queue.tracks.shift()!;
    queue.currentTrack = track;
    queue.isPlaying = true;

    try {
      const searchQuery = `${track.artist} ${track.title}`;
      let videoId = this.videoCache.get(searchQuery);

      if (!videoId) {
        const ytDlpSearch = spawn("yt-dlp", [
          "--default-search",
          "ytsearch1:",
          "--get-id",
          "--no-playlist",
          searchQuery,
        ]);

        for await (const chunk of ytDlpSearch.stdout) {
          videoId = chunk.toString().trim();
        }
        if (!videoId) throw new Error("Video ID not found");
        this.videoCache.set(searchQuery, videoId);
      }

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const stream = this.getYtdlpOpusStream(url);

      const resource = createAudioResource(stream, {
        inputType: StreamType.WebmOpus,
      });

      let player = this.players.get(guildId);
      if (!player) {
        player = createAudioPlayer();
        this.players.set(guildId, player);
        connection.subscribe(player);
      }

      player.play(resource);
      console.log(`🎵 Now playing: ${track.title} by ${track.artist}`);

      player.once(AudioPlayerStatus.Idle, async () => {
        queue.isPlaying = false;
        queue.currentTrack = null;
        if (queue.tracks.length > 0) setTimeout(() => this.play(guildId), 500);
      });

      player.on("error", (error) => {
        console.error("❌ Player error:", error);
        queue.isPlaying = false;
        queue.currentTrack = null;
      });
    } catch (error) {
      console.error("❌ Error while playing:", error);
      queue.isPlaying = false;
      queue.currentTrack = null;
      if (queue.tracks.length > 0) setTimeout(() => this.play(guildId), 500);
    }
  }

  public skip(guildId: string): boolean {
    const player = this.players.get(guildId);
    const queue = this.getQueue(guildId);

    if (player && queue.isPlaying) {
      queue.isPlaying = false;
      queue.currentTrack = null;
      player.stop(true);
      return true;
    }
    return false;
  }

  public stop(guildId: string): void {
    const queue = this.getQueue(guildId);
    const player = this.players.get(guildId);

    queue.tracks = [];
    queue.currentTrack = null;
    queue.isPlaying = false;

    if (player) player.stop(true);
    this.disconnect(guildId);
  }

  public disconnect(guildId: string): void {
    const connection = this.connections.get(guildId);
    if (connection) connection.destroy();
    this.cleanup(guildId);
  }

  private cleanup(guildId: string): void {
    this.connections.delete(guildId);
    this.players.delete(guildId);
    this.queues.delete(guildId);
  }

  public handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState
  ): void {
    if (
      oldState.channelId &&
      oldState.channel?.members.filter((m) => !m.user.bot).size === 0
    ) {
      const connection = this.connections.get(oldState.guild.id);
      if (connection) {
        setTimeout(() => {
          if (oldState.channel?.members.filter((m) => !m.user.bot).size === 0) {
            this.disconnect(oldState.guild.id);
          }
        }, 30000);
      }
    }
  }
}
