import { Message } from "discord.js";
import { SpotifyBot } from "../index";

export interface Command {
  name: string;
  description: string;
  usage: string;
  execute: (bot: SpotifyBot, message: Message, args: string[]) => Promise<void>;
}
