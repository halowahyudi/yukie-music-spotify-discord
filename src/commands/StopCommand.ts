import { Message, EmbedBuilder } from "discord.js";
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

    if (!queue.isPlaying && queue.tracks.length === 0) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Tidak ada musik yang sedang diputar!")
            .setColor(0xff0000),
        ],
      });
      return;
    }

    bot.musicService.stop(message.guildId!);

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("⏹️ Musik Dihentikan")
          .setDescription(
            "Queue telah dibersihkan dan bot keluar dari voice channel."
          )
          .setColor(0x1db954)
          .setFooter({ text: `Diminta oleh ${message.author.username}` }),
      ],
    });
  }
}
