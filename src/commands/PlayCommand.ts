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
  private queues = new Map<string, Queue>();
  private connections = new Map<string, VoiceConnection>();
  private players = new Map<string, AudioPlayer>();

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

  private getYtdlpStream(url: string): Readable {
    const ytdlp = spawn("yt-dlp", [
      "--cookies",
      "cookies.txt", // if needed
      "--quiet",
      "--no-warnings",
      "-f",
      "251",
      "-o",
      "-",
      "--no-playlist",
      url,
    ]);

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      "pipe:0",
      "-f",
      "s16le",
      "-ar",
      "48000",
      "-ac",
      "2",
      "-loglevel",
      "quiet",
      "pipe:1",
    ]);

    ytdlp.stdout.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "EPIPE") {
        console.error("❌ yt-dlp stdout error:", err);
      }
    });

    ffmpeg.stdin.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "EPIPE") {
        console.error("❌ ffmpeg stdin error:", err);
      }
    });

    ytdlp.stdout.pipe(ffmpeg.stdin);

    return ffmpeg.stdout;
  }

  private async searchYoutubeUrl(track: Track): Promise<string> {
    const query = `${track.artist} ${track.title}`;
    return new Promise((resolve, reject) => {
      const process = spawn("yt-dlp", [
        "--cookies",
        "cookies.txt", // if needed
        "--default-search",
        "ytsearch1:",
        "--get-id",
        "--no-playlist",
        query,
      ]);

      let videoId = "";

      process.stdout.on("data", (data) => {
        videoId += data.toString();
      });

      process.stderr.on("data", (data) => {
        console.error(`[yt-dlp search error]: ${data}`);
      });

      process.on("close", (code) => {
        if (code === 0 && videoId.trim()) {
          resolve(`https://www.youtube.com/watch?v=${videoId.trim()}`);
        } else {
          reject(new Error("Video ID not found"));
        }
      });
    });
  }

  public async play(guildId: string): Promise<void> {
    const queue = this.getQueue(guildId);
    const connection = this.connections.get(guildId);
    if (!connection || queue.tracks.length === 0 || queue.isPlaying) return;

    const track = queue.tracks.shift()!;
    queue.currentTrack = track;
    queue.isPlaying = true;

    try {
      const url = await this.searchYoutubeUrl(track);
      console.log(`🎬 Streaming: ${url}`);

      const stream = this.getYtdlpStream(url);
      const resource = createAudioResource(stream, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });

      let player = this.players.get(guildId);
      if (!player) {
        player = createAudioPlayer();
        this.players.set(guildId, player);
        connection.subscribe(player);
      }

      player.play(resource);
      console.log(`🎵 Now playing: ${track.title} - ${track.artist}`);

      player.once(AudioPlayerStatus.Idle, async () => {
        queue.isPlaying = false;
        queue.currentTrack = null;
        if (queue.tracks.length > 0) setTimeout(() => this.play(guildId), 500);
      });

      player.on("error", (error) => {
        console.error("❌ Player error:", error);
        queue.isPlaying = false;
        queue.currentTrack = null;
        if (queue.tracks.length > 0) setTimeout(() => this.play(guildId), 500);
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
        }, 30_000);
      }
    }
  }
}
