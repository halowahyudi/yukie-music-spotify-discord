import { Message } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class SkipCommand implements Command {
  name = "skip";
  description = "Melewati lagu yang sedang diputar";
  usage = `${process.env.PREFIX}skip`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    const member = message.member;
    if (!member?.voice.channel) {
      await message.reply(
        "❌ Kamu harus berada di voice channel yang sama dengan bot!"
      );
      return;
    }

    const queue = bot.musicService.getQueue(message.guildId!);

    if (!queue.isPlaying || !queue.currentTrack) {
      await message.reply("❌ Tidak ada musik yang sedang diputar!");
      return;
    }

    const currentTrack = queue.currentTrack;
    const skipped = bot.musicService.skip(message.guildId!);

    if (skipped) {
      await message.reply(
        `⏭️ Melewati: **${currentTrack.title}** oleh **${currentTrack.artist}**`
      );
    } else {
      await message.reply("❌ Gagal melewati lagu!");
    }
  }
}
