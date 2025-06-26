import { Message } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class StopCommand implements Command {
  name = "stop";
  description = "Menghentikan musik dan membersihkan queue";
  usage = `${process.env.PREFIX}stop`;

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

    if (!queue.isPlaying && queue.tracks.length === 0) {
      await message.reply("❌ Tidak ada musik yang sedang diputar!");
      return;
    }

    bot.musicService.stop(message.guildId!);
    await message.reply(
      "⏹️ Musik dihentikan dan queue dibersihkan! Bot akan meninggalkan voice channel."
    );
  }
}
