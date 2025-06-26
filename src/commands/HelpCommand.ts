import { Message, EmbedBuilder } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";
import { config } from "dotenv";

config();

export class HelpCommand implements Command {
  name = "help";
  description = "Menampilkan daftar semua command";
  usage = `${process.env.prefix}help`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Spotify Bot Commands")
      .setDescription("Bot musik dengan integrasi Spotify")
      .setColor("#1DB954")
      .setTimestamp();

    const commands = [
      {
        name: `🎵 ${process.env.PREFIX}play <url/search>`,
        value: [
          "Memutar musik dari Spotify URL atau pencarian.",
          `Contoh: \`${process.env.PREFIX}play https://open.spotify.com/track/...?\``,
          `Contoh: \`${process.env.PREFIX}play dua lipa levitating\``,
        ].join("\n"),
      },
      {
        name: `📝 ${process.env.PREFIX}queue`,
        value: "Menampilkan daftar lagu dalam queue",
      },
      {
        name: `📋 ${process.env.PREFIX}list`,
        value: "Menampilkan playlist yang tersimpan",
      },
      {
        name: `⏭️ ${process.env.PREFIX}skip`,
        value: "Melewati lagu yang sedang diputar",
      },
      {
        name: `⏹️ ${process.env.PREFIX}stop`,
        value: "Menghentikan musik dan membersihkan queue",
      },
      {
        name: `❓ ${process.env.PREFIX}help`,
        value: "Menampilkan pesan bantuan ini",
      },
    ];

    commands.forEach((cmd) => {
      embed.addFields({ name: cmd.name, value: cmd.value, inline: false });
    });

    embed.setFooter({
      text: "Powered by Spotify API",
      iconURL:
        "https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg",
    });

    await message.reply({ embeds: [embed] });
  }
}
