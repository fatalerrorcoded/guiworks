import Discord, { Collection, ReactionEmoji } from "discord.js";
import { ulid } from "ulid";

import Gui from "./gui";
import GuiState from "./guistate"

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

        console.log("gay");
    }

    async add(channel: Discord.TextChannel, gui: Gui) {
        gui.init(this, ulid());
        const embed = gui.render();

        let message = await channel.send(embed);
        if (message instanceof Array) message = message[0];
        const state: GuiState = { gui, message };

        this.instancesByMsg.set(message.id, state);
        this.instancesByGui.set(gui.id, state);
    }

    remove(gui: Gui, deleteMessage?: boolean) {
        const state = this.instancesByGui.get(gui.id);
        if (state === undefined) return;
        gui.destroy();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(state.message.id);
        if (deleteMessage === true) state.message.delete();
    }

    onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        if (state.gui.isParticipating(user)
            && state.gui.targetReactions().find((value) => value.identifier == reaction.emoji.identifier)) {
                state.gui.update({ type: "reactionAdd", reaction, user });
        }
    }

    onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User) {
        const state = this.instancesByMsg.get(reaction.message.id);
        if (state === undefined) return;
        if (user.id === this.client.user.id
            && state.gui.targetReactions().find((value) => value.identifier == reaction.emoji.identifier))
                reaction.message.react(reaction.emoji);
    }

    onMessageDelete(message: Discord.Message) {
        const state = this.instancesByMsg.get(message.id);
        if (state === undefined) return;
        state.gui.destroy();
        this.instancesByGui.delete(state.gui.id);
        this.instancesByMsg.delete(message.id);
    }
}
