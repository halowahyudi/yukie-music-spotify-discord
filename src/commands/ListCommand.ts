import { Message, EmbedBuilder } from "discord.js";
import { SpotifyBot } from "../index";
import { Command } from "../types/Command";

export class ListCommand implements Command {
  name = "list";
  description = "Menampilkan playlist populer (contoh)";
  usage = `${process.env.PREFIX}list`;

  async execute(
    bot: SpotifyBot,
    message: Message,
    args: string[]
  ): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle("🎵 Playlist Populer")
      .setDescription("Beberapa playlist Spotify yang populer:")
      .setColor("#1DB954")
      .setTimestamp();

    const playlists = [
      {
        name: "🔥 Today's Top Hits",
        value:
          "Lagu-lagu terpopuler hari ini\n`!play https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`",
      },
      {
        name: "🌟 Global Top 50",
        value:
          "50 lagu terpopuler di dunia\n`!play https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF`",
      },
      {
        name: "🎸 Rock Classics",
        value:
          "Klasik rock terbaik sepanjang masa\n`!play https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U`",
      },
      {
        name: "🎤 Pop Rising",
        value:
          "Artis pop yang sedang naik daun\n`!play https://open.spotify.com/playlist/37i9dQZF1DWUa8ZRTfalHk`",
      },
    ];

    playlists.forEach((playlist) => {
      embed.addFields({
        name: playlist.name,
        value: playlist.value,
        inline: false,
      });
    });

    embed.setFooter({
      text: `Gunakan ${process.env.PREFIX}play <url> untuk memutar playlist`,
      iconURL:
        "https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg",
    });

    await message.reply({ embeds: [embed] });
  }
}
