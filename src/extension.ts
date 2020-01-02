import Discord, { Collection } from "discord.js";

import Gui from "./gui";

export default class Guiworks {
    client: Discord.Client;
    instances: Collection<string, Gui>;

    constructor(client: Discord.Client) {
        this.client = client;
        this.instances = new Collection();

        client.on('messageReactionAdd', this.onReactionAdd);
        client.on('messageReactionRemove', this.onReactionRemove);
    }

    async add(channel: Discord.TextChannel, instance: Gui) {
        instance.init(this);
        const embed = instance.render();

        let message = await channel.send(embed);
        if (message instanceof Array) message = message[0];
        this.instances.set(message.id, instance);
    }

    onReactionAdd(reaction: Discord.MessageReaction, user: Discord.User) {

    }

    onReactionRemove(reaction: Discord.MessageReaction, user: Discord.User) {

    }
}
