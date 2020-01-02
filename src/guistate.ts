import Discord from "discord.js";

import Gui from "./gui";

export default interface GuiState {
    gui: Gui,
    message: Discord.Message,
}
