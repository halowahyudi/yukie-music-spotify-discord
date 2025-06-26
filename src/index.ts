import { Client, GatewayIntentBits, Collection } from "discord.js";
import { config } from "dotenv";
import { SpotifyService } from "./services/SpotifyService";
import { MusicService } from "./services/MusicService";
import { CommandHandler } from "./handlers/CommandHandler";
import { Command } from "./types/Command";
import { HelpCommand } from "./commands/HelpCommand";

config();

class SpotifyBot {
  public client: Client;
  public commands: Collection<string, Command>;
  public spotifyService: SpotifyService;
  public musicService: MusicService;
  public commandHandler: CommandHandler;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.commands = new Collection();
    this.spotifyService = new SpotifyService();
    this.musicService = new MusicService();
    this.commandHandler = new CommandHandler(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.once("ready", () => {
      console.log(`✅ Bot siap! Logged in sebagai ${this.client.user?.tag}`);
    });

    this.client.on("guildCreate", async (guild) => {
      try {
        const channel = guild.channels.cache.find(
          (ch) =>
            ch.isTextBased() &&
            ch.type === 0 && // GUILD_TEXT
            ch.permissionsFor(guild.members.me!)?.has("SendMessages")
        );

        if (!channel || !channel.isTextBased()) return;

        const helpCommand = new HelpCommand();
        await helpCommand.execute(this, await channel.send("Halo!"), []);
      } catch (error) {
        console.error(`❌ Error saat greeting di server ${guild.name}:`, error);
      }
    });

    this.client.on("messageCreate", async (message) => {
      await this.commandHandler.handleMessage(message);
    });

    this.client.on("voiceStateUpdate", (oldState, newState) => {
      this.musicService.handleVoiceStateUpdate(oldState, newState);
    });
  }

  public async start(): Promise<void> {
    try {
      await this.spotifyService.initialize();
      await this.client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
      console.error("❌ Error starting bot:", error);
      process.exit(1);
    }
  }
}

const bot = new SpotifyBot();
bot.start();

export { SpotifyBot };
