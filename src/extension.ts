import Discord, { Collection } from "discord.js";
import { ulid } from "ulid";

import Gui from "./gui";
import GuiState from "./guistate";
import { compareEmbeds } from "./utils";

export default class Guiworks {
    client: Discord.Client;
    instancesByMsg: Collection<string, GuiState>;
    instancesByGui: Collection<string, GuiState>;

    renderTimeDifferential: number;
    rerenderInterval: NodeJS.Timeout;

    constructor(client: Discord.Client, params?: { renderTimeDiff?: number, rerenderInterval?: number }) {
        this.client = client;
        this.instancesByMsg = new Collection();
        this.instancesByGui = new Collection();

        if (params && params.renderTimeDiff !== undefined) this.renderTimeDifferential = params.renderTimeDiff;
        else this.renderTimeDifferential = 5000;
        
        let rerenderInterval;
        if (params && params.rerenderInterval !== undefined) rerenderInterval = params.rerenderInterval;
        else rerenderInterval = this.renderTimeDifferential / 2;

        this.rerenderInterval = setInterval(() => {
            const currentTime = new Date().getTime();
            for (let state of this.instancesByGui) {
                if (state[1].awaitingRender) {
                    if (currentTime >= state[1].lastRender.time.getTime() + this.renderTimeDifferential)
                        this.triggerRender(state[1].gui);
                } else {
                    let automaticRender = state[1].gui.automaticRender();
                    if (automaticRender && currentTime >= state[1].lastRender.time.getTime() + automaticRender)
                        this.triggerRender(state[1].gui);
                }
            }
        }, rerenderInterval);

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
        gui.guiworksInit(this, ulid());
        gui.initialize();
        const embed = gui.render();

        let message = await channel.send("", { embed });
        if (message instanceof Array) message = message[0];
        const state: GuiState = { gui, message, lastRender: { embed, time: new Date() }, awaitingRender: false};

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
        gui.finalize();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
        if (deleteMessage === true) state.message.delete();
    }

    triggerRender(gui: Gui) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        if (new Date().getTime() < state.lastRender.time.getTime() + this.renderTimeDifferential) {
            state.awaitingRender = true;
            this.updateLists(state);
            return;
        }

        try {
            const embed = gui.render();
            if (compareEmbeds(embed, state.lastRender.embed)) return;
            state.lastRender = { embed, time: new Date() };
            state.awaitingRender = false;
            this.updateLists(state);
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

        state.gui.finalize();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
    }

    private updateLists(state: GuiState) {
        this.instancesByGui.set(state.gui.id, state);
        this.instancesByMsg.set(state.message.id, state);
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
        if (state.gui.targetReactions().find((value) => {
                if (typeof value === "string") return value === reaction.emoji.name;
                else return value.id === reaction.emoji.id;
            })
        ) {
            if (state.gui.isParticipating(user) && !user.bot) {
                state.gui.update({ type: "reactionRemove", reaction, user });
                this.triggerRender(state.gui);
            }
            else if (user.id === this.client.user.id) {
                    reaction.message.react(reaction.emoji);
            }
        }
    }

    onMessageDelete(message: Discord.Message) {
        const state = this.instancesByMsg.get(message.id);
        if (state === undefined) return;
        state.gui.finalize();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(message.id);
    }
}
