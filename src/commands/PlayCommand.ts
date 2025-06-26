import { Message } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class PlayCommand implements Command {
  name = "play";
  description = "Memutar musik dari Spotify playlist atau track";
  usage = `${process.env.PREFIX}play <spotify_url_or_search>`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    if (!args.length) {
      await message.reply(
        "❌ Mohon berikan URL Spotify atau kata kunci pencarian!"
      );
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

    try {
      await message.reply("🔍 Mencari musik...");

      if (query.includes("spotify.com/playlist/")) {
        // Handle playlist
        const playlistId = bot.spotifyService.extractPlaylistId(query);
        if (!playlistId) {
          await message.reply("❌ URL playlist Spotify tidak valid!");
          return;
        }

        const tracks = await bot.spotifyService.getPlaylistTracks(
          playlistId,
          message.author.username
        );
        if (tracks.length === 0) {
          await message.reply("❌ Playlist kosong atau tidak dapat diakses!");
          return;
        }

        await bot.musicService.addToQueue(message.guildId!, tracks);
        await message.reply(
          `✅ Menambahkan ${tracks.length} lagu dari playlist ke queue!`
        );
      } else if (query.includes("spotify.com/track/")) {
        // Handle single track
        const trackId = bot.spotifyService.extractTrackId(query);
        if (!trackId) {
          await message.reply("❌ URL track Spotify tidak valid!");
          return;
        }

        const track = await bot.spotifyService.getTrackById(
          trackId,
          message.author.username
        );
        if (!track) {
          await message.reply("❌ Track tidak ditemukan!");
          return;
        }

        await bot.musicService.addToQueue(message.guildId!, [track]);
        await message.reply(
          `✅ Menambahkan **${track.title}** oleh **${track.artist}** ke queue!`
        );
      } else {
        // Handle search
        const track = await bot.spotifyService.searchTrack(
          query,
          message.author.username
        );
        if (!track) {
          await message.reply(
            "❌ Tidak ditemukan hasil untuk pencarian tersebut!"
          );
          return;
        }

        await bot.musicService.addToQueue(message.guildId!, [track]);
        await message.reply(
          `✅ Menambahkan **${track.title}** oleh **${track.artist}** ke queue!`
        );
      }

      // Join channel and start playing
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
