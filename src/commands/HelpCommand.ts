import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class HelpCommand implements Command {
  name = "help";
  description = "Menampilkan daftar semua command";
  usage = `${process.env.PREFIX}help`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    const botName = bot.client.user?.username ?? "Bot";

    // Embed List Command
    const embedCommands = new EmbedBuilder()
      .setTitle(`🤖 ${botName} Commands`)
      .setDescription("Bot musik dengan integrasi Spotify dan YouTube 🎶")
      .setColor("#1DB954")
      .setTimestamp()
      .setFooter({
        text: `Bot aktif di server ${message.guild?.name}`,
        iconURL: bot.client.user?.displayAvatarURL() ?? undefined,
      });

    const commands = [
      {
        name: `🎵 ${process.env.PREFIX}play <url/pencarian>`,
        value: "Putar musik dari Spotify, YouTube, atau kata kunci.",
      },
      {
        name: `📝 ${process.env.PREFIX}queue`,
        value: "Lihat daftar lagu yang sedang antre.",
      },
      {
        name: `⏭️ ${process.env.PREFIX}skip`,
        value: "Lewati lagu saat ini.",
      },
      {
        name: `⏹️ ${process.env.PREFIX}stop`,
        value: "Stop musik dan bersihkan queue.",
      },
      {
        name: `❓ ${process.env.PREFIX}help`,
        value: "Tampilkan daftar command bot.",
      },
    ];

    commands.forEach((cmd) =>
      embedCommands.addFields({ name: cmd.name, value: cmd.value })
    );

    // Embed Sponsor
    const embedSponsor = new EmbedBuilder()
      .setTitle("📢 Papan Sponsor")
      .setDescription(
        "Ingin brand kamu tampil di sini?\n📬 Hubungi kami untuk kerja sama atau sponsorship."
      )
      .setColor("#f1c40f")
      .setImage("https://media.giphy.com/media/3o6ZtaO9BZHcOjmErm/giphy.gif")
      .setFooter({ text: "Dukung bot ini agar tetap online 🎧" });

    // Button Sponsor
    const sponsorButton = new ButtonBuilder()
      .setLabel("📬 Ajukan Sponsor")
      .setStyle(ButtonStyle.Link)
      .setURL("https://wahyudi.dev");

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      sponsorButton
    );

    if (
      "send" in message.channel &&
      typeof message.channel.send === "function"
    ) {
      await message.channel.send({ embeds: [embedCommands] });
      await message.channel.send({
        embeds: [embedSponsor],
        components: [row],
      });
    }
  }
}
