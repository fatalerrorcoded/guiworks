import Discord from "discord.js";

import Guiworks from "./extension";

export default class Gui {
    private _instance: Guiworks | undefined;
    private _id: string | undefined;
    constructor() {}
    guiworksInit(instance: Guiworks, id: string) {
        this._instance = instance;
        this._id = id;
    }

    get id(): string {
        if (!this._id) return "";
        return this._id;
    }

    triggerRender() { if (this._instance) this._instance.triggerRender(this); }
    terminate() { if (this._instance) this._instance.remove(this); }

    isParticipating(user: Discord.User): boolean { return true; }
    targetReactions(): Array<string | Discord.Emoji | Discord.ReactionEmoji> { return []; }

    initialize() {}

    update(event: any) {
        throw new Error("Gui needs to be extended, it cannot be used directly");
    }

    render(): Discord.RichEmbed {
        throw new Error("Gui needs to be extended, it cannot be used directly");
    }

    finalize() {}
}
