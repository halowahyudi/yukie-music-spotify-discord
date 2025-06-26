import { Message, EmbedBuilder } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class QueueCommand implements Command {
  name = "queue";
  description = "Menampilkan daftar lagu dalam queue";
  usage = `${process.env.PREFIX}queue`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    const queue = bot.musicService.getQueue(message.guildId!);

    if (!queue.currentTrack && queue.tracks.length === 0) {
      await message.reply(
        "❌ Queue kosong! Gunakan `!play` untuk menambahkan musik."
      );
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🎵 Music Queue")
      .setColor("#1DB954")
      .setTimestamp();

    if (queue.currentTrack) {
      embed.addFields({
        name: "🎶 Sedang Diputar",
        value: `**${queue.currentTrack.title}**\n*oleh ${queue.currentTrack.artist}*\n*Diminta oleh: ${queue.currentTrack.requestedBy}*`,
        inline: false,
      });
    }

    if (queue.tracks.length > 0) {
      const trackList = queue.tracks
        .slice(0, 10)
        .map((track, index) => {
          const duration = Math.floor(track.duration / 1000 / 60);
          return `**${index + 1}.** ${track.title} - *${
            track.artist
          }* (${duration}m)`;
        })
        .join("\n");

      embed.addFields({
        name: `📝 Selanjutnya (${queue.tracks.length} lagu)`,
        value:
          trackList + (queue.tracks.length > 10 ? "\n*...dan lainnya*" : ""),
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  }
}
