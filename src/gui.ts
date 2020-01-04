import Discord from "discord.js";

import Guiworks from "./extension";
import GuiEvent from "./guievent";

/**
 * A Gui class used by Guiworks to reactively render embeds
 * @abstract
 */
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

    /**
     * Triggers a re-render of this Gui instance
     * May take a while to re-render due to rate limiting
     */
    triggerRender() { if (this._instance) this._instance.triggerRender(this); }

    /**
     * Properly finalize this Gui instance and remove it from the Guiworks instance
     */
    terminate(deleteMessage?: boolean) { if (this._instance) this._instance.remove(this, deleteMessage); }

    /**
     * Checks if a user is participating - aka if their changes to the reactions should call {@link Gui#update}
     * @param user The user that's being checked
     */
    isParticipating(user: Discord.User): boolean { return true; }

    /**
     * The reactions that should be checked and added to the embed
     */
    targetReactions(): Array<string | Discord.Emoji | Discord.ReactionEmoji> { return []; }

    initialize() {}
    finalize() {}

    /**
     * An update function for when an event occurs, for example when a reaction is added
     * @param event An event passed down by the Guiworks instance
     */
    update(event: GuiEvent) {
        throw new Error("Gui needs to be extended, it cannot be used directly");
    }

    /**
     * A render function that is called every time the Gui is about to be re-rendered
     * Note: Do as minimal logic in this function as possible
     */
    render(): Discord.RichEmbed {
        throw new Error("Gui needs to be extended, it cannot be used directly");
    }

    /**
     * @returns A time in milliseconds after which this Gui should be re-rendered, or undefined
     */
    automaticRender(): number | undefined { return undefined; }
}
