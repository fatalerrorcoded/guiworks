import Discord, { Collection } from "discord.js";
import { ulid } from "ulid";

import Gui from "./gui";
import GuiState from "./guistate";
import { compareEmbeds } from "./utils";

export default class Guiworks {
    client: Discord.Client;
    instancesByMsg: Collection<string, GuiState>;
    instancesByGui: Collection<string, GuiState>;

    constructor(client: Discord.Client) {
        this.client = client;
        this.instancesByMsg = new Collection();
        this.instancesByGui = new Collection();

        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.onReactionAdd = this.onReactionAdd.bind(this);
        this.onReactionRemove = this.onReactionRemove.bind(this);
        this.onMessageDelete = this.onMessageDelete.bind(this);

        client.on('messageReactionAdd', this.onReactionAdd);
        client.on('messageReactionRemove', this.onReactionRemove);
        client.on('messageDelete', this.onMessageDelete);
    }

    async add(channel: Discord.TextBasedChannelFields, gui: Gui) {
        gui.init(this, ulid());
        const embed = gui.render();

        let message = await channel.send("", { embed });
        if (message instanceof Array) message = message[0];
        const state: GuiState = { gui, message, lastEmbed: embed };

        this.instancesByMsg.set(message.id, state);
        this.instancesByGui.set(gui.id, state);

        (async () => {
            let emotes = gui.targetReactions();
            for (let emote of emotes) {
                await message.react(emote);
            }
        })().catch((err) => {
            console.error(err);
            this.guiError(state);
        });
    }

    remove(gui: Gui, deleteMessage?: boolean) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        gui.destroy();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
        if (deleteMessage === true) state.message.delete();
    }

    triggerRender(gui: Gui) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        try {
            const embed = gui.render();
            if (compareEmbeds(embed, state.lastEmbed)) return;
            state.lastEmbed = embed;
            state.message.edit("", { embed });
        } catch (err) {
            console.error(err);
            this.guiError(state);
        }
    }

    private guiError(state: GuiState) {
        let guiErrorEmbed = new Discord.RichEmbed();
        guiErrorEmbed.setColor("#FF0000");
        guiErrorEmbed.setTitle("GUI error");
        guiErrorEmbed.setDescription("This GUI has errored, the error has been reported");
        guiErrorEmbed.setFooter("Guiworks v0.1.0");
        state.message.edit("", {
            embed: guiErrorEmbed
        });
        state.message.clearReactions().catch(() => {});

        state.gui.destroy();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
    }

    onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        if (state.gui.isParticipating(user) && !user.bot
            && state.gui.targetReactions().find((value) => {
                if (typeof value === "string") return value === reaction.emoji.name;
                else return value.id === reaction.emoji.id;
            })
        ) {
            state.gui.update({ type: "reactionAdd", reaction, user });
            this.triggerRender(state.gui);
        }
    }

    onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        if (user.id === this.client.user.id
            && state.gui.targetReactions().find((value) => {
                if (typeof value === "string") return value === reaction.emoji.name;
                else return value.id === reaction.emoji.id;
            })
        ) {
                reaction.message.react(reaction.emoji);
        }
    }

    onMessageDelete(message: Discord.Message) {
        const state = this.instancesByMsg.get(message.id);
        if (state === undefined) return;
        state.gui.destroy();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(message.id);
    }
}
