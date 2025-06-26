import { Message } from "discord.js";
import { SpotifyBot } from "../index";
import { QueueCommand } from "../commands/QueueCommand";
import { HelpCommand } from "../commands/HelpCommand";
import { ListCommand } from "../commands/ListCommand";
import { SkipCommand } from "../commands/SkipCommand";
import { StopCommand } from "../commands/StopCommand";
import { PlayCommand } from "../commands/PlayCommand";

export class CommandHandler {
  private bot: SpotifyBot;
  private prefix: string;

  constructor(bot: SpotifyBot) {
    this.bot = bot;
    this.prefix = process.env.PREFIX || "!";
    this.loadCommands();
  }

  private loadCommands(): void {
    const commands = [
      new QueueCommand(),
      new HelpCommand(),
      new ListCommand(),
      new SkipCommand(),
      new StopCommand(),
      new PlayCommand(),
    ];

    commands.forEach((command) => {
      this.bot.commands.set(command.name, command);
    });
  }

  public async handleMessage(message: Message): Promise<void> {
    if (message.author.bot || !message.content.startsWith(this.prefix)) return;

    const args = message.content.slice(this.prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.bot.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(this.bot, message, args);
    } catch (error) {
      console.error("❌ Command execution error:", error);
      await message.reply("❌ Terjadi error saat menjalankan command!");
    }
  }
}
