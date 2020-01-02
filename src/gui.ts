import Discord from "discord.js";

import Guiworks from "./extension";

export default class Gui {
    private instance: Guiworks | undefined;
    init(instance: Guiworks) {
        this.instance = instance;
    }

    render(): Discord.RichEmbed {
        throw new Error("Gui needs to be extended, it cannot be used directly");
    }
}
