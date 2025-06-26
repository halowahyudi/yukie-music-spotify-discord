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
      console.warn(`🔌 Voice disconnected from ${channel.guild.name}`);
      this.cleanup(channel.guild.id);
    });

    return connection;
  }

  public async addToQueue(guildId: string, tracks: Track[]): Promise<void> {
    const queue = this.getQueue(guildId);
    console.log(`➕ Menambahkan ${tracks.length} track ke queue ${guildId}`);
    queue.tracks.push(...tracks);
  }

  private getYtdlpStream(url: string): Readable {
    console.log(`🔗 Mulai download dari yt-dlp URL: ${url}`);

    const ytdlp = spawn("yt-dlp", [
      "--cookies",
      "cookies.txt",
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
      console.error("❌ yt-dlp stdout error:", err);
    });

    ffmpeg.stdin.on("error", (err: any) => {
      if (err.code === "EPIPE") {
        console.error(
          "❌ ffmpeg stdin error: EPIPE (mungkin stream tertutup lebih awal)"
        );
      } else {
        console.error("❌ ffmpeg stdin error:", err);
      }
    });

    ytdlp.stderr.on("data", (data) => {
      console.error(`[yt-dlp error]: ${data.toString().trim()}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      console.error(`[ffmpeg error]: ${data.toString().trim()}`);
    });

    ytdlp.stdout.pipe(ffmpeg.stdin);

    return ffmpeg.stdout;
  }

  public async play(guildId: string): Promise<void> {
    const queue = this.getQueue(guildId);
    const connection = this.connections.get(guildId);

    if (!connection) {
      console.warn("❌ Tidak ada koneksi voice ditemukan.");
      return;
    }

    if (queue.tracks.length === 0) {
      console.warn("📭 Queue kosong.");
      return;
    }

    if (queue.isPlaying) {
      console.warn("⏳ Masih sedang memutar lagu.");
      return;
    }

    const track = queue.tracks.shift()!;
    queue.currentTrack = track;
    queue.isPlaying = true;

    try {
      const searchQuery = `${track.artist} ${track.title}`;
      console.log(`🔍 Mencari YouTube untuk: ${searchQuery}`);

      const ytDlpSearch = spawn("yt-dlp", [
        "--cookies",
        "cookies.txt",
        "--default-search",
        "ytsearch1:",
        "-f",
        "251",
        "--get-id",
        "--no-playlist",
        searchQuery,
      ]);

      let videoId = "";
      for await (const chunk of ytDlpSearch.stdout) {
        videoId += chunk.toString();
      }
      videoId = videoId.trim();

      console.log(`🎬 Video ID: ${videoId}`);

      if (!videoId) {
        throw new Error("Video ID not found");
      }

      const url = `https://www.youtube.com/watch?v=${videoId}`;
      console.log(`✅ Ditemukan video: ${url}`);

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
      console.log(`🎶 Sekarang memutar: ${track.title} oleh ${track.artist}`);

      player.once(AudioPlayerStatus.Idle, async () => {
        queue.isPlaying = false;
        queue.currentTrack = null;
        console.log("⏭️ Lagu selesai. Cek track selanjutnya.");
        if (queue.tracks.length > 0) {
          setTimeout(() => this.play(guildId), 500);
        }
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

      if (queue.tracks.length > 0) {
        setTimeout(() => this.play(guildId), 500);
      }
    }
  }

  public skip(guildId: string): boolean {
    const player = this.players.get(guildId);
    const queue = this.getQueue(guildId);

    if (player && queue.isPlaying) {
      console.log("⏩ Melewati lagu saat ini");
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

    console.log("🛑 Menghentikan dan membersihkan queue");
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
    console.log(`🧹 Cleanup data guild: ${guildId}`);
    this.connections.delete(guildId);
    this.players.delete(guildId);
    this.queues.delete(guildId);
  }

  public handleVoiceStateUpdate(oldState: VoiceState): void {
    if (
      oldState.channelId &&
      oldState.channel?.members.filter((m) => !m.user.bot).size === 0
    ) {
      const connection = this.connections.get(oldState.guild.id);
      if (connection) {
        setTimeout(() => {
          const stillEmpty =
            oldState.channel?.members.filter((m) => !m.user.bot).size === 0;
          if (stillEmpty) {
            console.log("🚪 Voice channel kosong, disconnecting...");
            this.disconnect(oldState.guild.id);
          }
        }, 30_000);
      }
    }
  }
}
