import { Message, EmbedBuilder, TextBasedChannel } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";
import { Track } from "../types/Track";
import { spawn } from "child_process";

function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

async function getYouTubeTitle(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("yt-dlp", [
      "--get-title",
      "--no-playlist",
      "--cookies",
      "cookies.txt",
      url,
    ]);

    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (err) => {
      console.error("yt-dlp stderr:", err.toString());
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`yt-dlp exited with code ${code}`));
      }
    });
  });
}

export class PlayCommand implements Command {
  name = "play";
  description = "Memutar musik dari Spotify, pencarian, atau YouTube";
  usage = `${process.env.PREFIX}play <url atau kata kunci>`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    if (!args.length) {
      await message.reply("❌ Mohon berikan URL atau kata kunci pencarian!");
      return;
    }

    const member = message.member;
    if (!member?.voice.channel) {
      await message.reply(
        "❌ Kamu harus berada di voice channel terlebih dahulu!"
      );
      return;
    }

    const query = args.join(" ");
    const messageChannel = message.channel as TextBasedChannel;

    try {
      const searchingMsg = await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("🔍 **Mencari musik...**")
            .setColor(0x1db954),
        ],
      });

      let addedTracks: Track[] = [];

      if (isYouTubeUrl(query)) {
        // Ambil judul video YouTube
        let title = "YouTube Stream";
        try {
          title = await getYouTubeTitle(query);
        } catch (err) {
          console.error("❌ Gagal mengambil judul YouTube:", err);
        }

        const track: Track = {
          title,
          artist: "YouTube",
          duration: 0,
          url: query,
          thumbnail: undefined,
          spotifyId: undefined,
          requestedBy: message.author.username,
          messageChannel,
        };

        addedTracks = [track];
        await bot.musicService.addToQueue(message.guildId!, addedTracks);

        await searchingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("📺 YouTube Ditambahkan")
              .setDescription(`🎵 **${title}** telah ditambahkan ke antrian`)
              .setColor(0xff0000)
              .setFooter({ text: `Diminta oleh ${track.requestedBy}` }),
          ],
        });
      } else if (query.includes("spotify.com/playlist/")) {
        const playlistId = bot.spotifyService.extractPlaylistId(query);
        if (!playlistId) {
          await searchingMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ URL playlist Spotify tidak valid!")
                .setColor(0xff0000),
            ],
          });
          return;
        }

        const tracks = await bot.spotifyService.getPlaylistTracks(
          playlistId,
          message.author.username
        );
        if (tracks.length === 0) {
          await searchingMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ Playlist kosong atau tidak dapat diakses!")
                .setColor(0xff0000),
            ],
          });
          return;
        }

        for (const track of tracks) {
          track.messageChannel = messageChannel;
        }

        addedTracks = tracks;
        await bot.musicService.addToQueue(message.guildId!, addedTracks);

        await searchingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("📥 Playlist Ditambahkan")
              .setDescription(
                `✅ Menambahkan **${tracks.length}** lagu ke queue!`
              )
              .setColor(0x1db954)
              .setFooter({ text: `Diminta oleh ${message.author.username}` }),
          ],
        });
      } else if (query.includes("spotify.com/track/")) {
        const trackId = bot.spotifyService.extractTrackId(query);
        if (!trackId) {
          await searchingMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ URL track Spotify tidak valid!")
                .setColor(0xff0000),
            ],
          });
          return;
        }

        const track = await bot.spotifyService.getTrackById(
          trackId,
          message.author.username
        );
        if (!track) {
          await searchingMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setDescription("❌ Track tidak ditemukan!")
                .setColor(0xff0000),
            ],
          });
          return;
        }

        track.messageChannel = messageChannel;
        addedTracks = [track];
        await bot.musicService.addToQueue(message.guildId!, addedTracks);

        await searchingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎵 Lagu Ditambahkan")
              .setDescription(`**${track.title}** oleh **${track.artist}**`)
              .setThumbnail(track.thumbnail ?? null)
              .setColor(0x1db954)
              .setFooter({ text: `Diminta oleh ${track.requestedBy}` }),
          ],
        });
      } else {
        const track = await bot.spotifyService.searchTrack(
          query,
          message.author.username
        );
        if (!track) {
          await searchingMsg.edit({
            embeds: [
              new EmbedBuilder()
                .setDescription(
                  "❌ Tidak ditemukan hasil untuk pencarian tersebut!"
                )
                .setColor(0xff0000),
            ],
          });
          return;
        }

        track.messageChannel = messageChannel;
        addedTracks = [track];
        await bot.musicService.addToQueue(message.guildId!, addedTracks);

        await searchingMsg.edit({
          embeds: [
            new EmbedBuilder()
              .setTitle("🎶 Lagu Ditambahkan")
              .setDescription(`**${track.title}** oleh **${track.artist}**`)
              .setThumbnail(track.thumbnail ?? null)
              .setColor(0x1db954)
              .setFooter({ text: `Diminta oleh ${track.requestedBy}` }),
          ],
        });
      }

      if (!bot.musicService["connections"].has(message.guildId!)) {
        await bot.musicService.joinChannel(member.voice.channel);
      }

      await bot.musicService.play(message.guildId!);
    } catch (error) {
      console.error("❌ Play command error:", error);
      await message.reply("❌ Terjadi error saat memproses permintaan!");
    }
  }
}
