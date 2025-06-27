import { Message, EmbedBuilder } from "discord.js";
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
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              "❌ Kamu harus berada di voice channel yang sama dengan bot!"
            )
            .setColor(0xff0000),
        ],
      });
      return;
    }

    const queue = bot.musicService.getQueue(message.guildId!);

    if (!queue.isPlaying || !queue.currentTrack) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Tidak ada musik yang sedang diputar!")
            .setColor(0xff0000),
        ],
      });
      return;
    }

    const currentTrack = queue.currentTrack;
    const skipped = bot.musicService.skip(message.guildId!);

    if (skipped) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⏭️ Lagu Dilewati")
            .setDescription(
              `**${currentTrack.title}** oleh **${currentTrack.artist}** telah dilewati.`
            )
            .setColor(0x1db954)
            .setFooter({ text: `Diminta oleh ${message.author.username}` }),
        ],
      });
    } else {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Gagal melewati lagu!")
            .setColor(0xff0000),
        ],
      });
    }
  }
}
