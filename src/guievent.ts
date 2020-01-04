import Discord from "discord.js";

/*interface GuiEvent {
    type: "reactionAdd" | "reactionRemove"
}*/

interface GuiEvent {
    type: "reactionAdd" | "reactionRemove",
    reaction: Discord.MessageReaction,
    user: Discord.User
}

export default GuiEvent;
