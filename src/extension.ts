import Discord, { Collection } from "discord.js";
import { ulid } from "ulid";

import Gui from "./gui";
import GuiState from "./guistate";
import { compareEmbeds } from "./utils";

/**
 * The main Guiworks class
 */
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

        // Interval for re-renders and periodic renders
        this.rerenderInterval = setInterval(() => {
            const currentTime = new Date().getTime();
            for (let state of this.instancesByGui) {
                // If we are awaiting a render...
                if (state[1].awaitingRender) {
                    // check if more than X milliseconds have passed, if so, render
                    if (currentTime >= state[1].lastRender.time.getTime() + this.renderTimeDifferential)
                        this.triggerRender(state[1].gui);
                } else {
                    let automaticRender = state[1].gui.automaticRender();
                    // Check if the Gui has an automatic render and if it should've triggered by now
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

    /**
     * Initializes and registers a Gui instance with this Guiworks instance
     * @param channel The channel where the Gui should be sent
     * @param gui The Gui instance to initialize and register
     */
    async add(channel: Discord.TextBasedChannelFields, gui: Gui) {
        // Initialize GUI
        gui.guiworksInit(this, ulid());
        gui.initialize();
        const embed = gui.render();

        // Send message
        let message = await channel.send("", { embed });
        if (message instanceof Array) message = message[0];

        // Configure state
        const state: GuiState = { gui, message, lastRender: { embed, time: new Date() }, awaitingRender: false};
        this.instancesByMsg.set(message.id, state);
        this.instancesByGui.set(gui.id, state);

        // Add reactions
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

    /**
     * Finalizes a Gui and removes it from this Guiworks instance
     * Rerenders the Gui a final time after finalizing it but before it's removed from the Guiworks instance if the message is not deleted
     * @param gui The Gui instance to finalize
     * @param deleteMessage If the message should be deleted
     */
    remove(gui: Gui, deleteMessage?: boolean) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        gui.finalize();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
        if (deleteMessage === true) state.message.delete().catch(() => {});
        else {
            try {
                state.message.clearReactions();
                state.message.edit("", state.gui.render());
            } catch (err) {
                console.error(err);
                this.guiError(state);
            }
        }
    }

    /**
     * Triggers a re-render of a Gui instance
     * @param gui The Gui instance to re-render
     */
    triggerRender(gui: Gui) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        // Check if it's less than X milliseconds past the last render
        if (new Date().getTime() < state.lastRender.time.getTime() + this.renderTimeDifferential) {
            // If so, we "await" the render as a rate limit to not abuse the Discord API
            state.awaitingRender = true;
            this.updateLists(state);
            return;
        }

        try {
            const embed = gui.render();
            // Compare the embeds to check if we do need to render or not
            if (compareEmbeds(embed, state.lastRender.embed)) return;
            // Set state and edit the message
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

    private onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        // Check if the user is participating and if the reaction is on the target reactions list
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

    private onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        // Check if the reaction is on the target reaction
        if (state.gui.targetReactions().find((value) => {
                if (typeof value === "string") return value === reaction.emoji.name;
                else return value.id === reaction.emoji.id;
            })
        ) {
            // If the user is participating, push an update
            if (state.gui.isParticipating(user) && !user.bot) {
                state.gui.update({ type: "reactionRemove", reaction, user });
                this.triggerRender(state.gui);
            }
            // Check if the bot's reaction has been removed while it's on the target reaction list
            else if (user.id === this.client.user.id) {
                // If so, re-add it
                reaction.message.react(reaction.emoji);
            }
        }
    }

    private onMessageDelete(message: Discord.Message) {
        const state = this.instancesByMsg.get(message.id);
        if (state === undefined) return;
        state.gui.finalize();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(message.id);
    }
}
