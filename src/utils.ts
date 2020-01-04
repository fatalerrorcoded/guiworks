import Discord from "discord.js";

/**
 * Compares two embeds (except for files)
 * @param first The first embed
 * @param second The second embed
 */
const compareEmbeds = (first: Discord.RichEmbed, second: Discord.RichEmbed): boolean => {
    // Yes I know that these can most likely be shortened by like a lot
    if (first.author !== second.author) return false;
    if (first.color !== second.color) return false;
    if (first.description !== second.description) return false;
    if (first.footer !== second.footer) return false;
    if (first.image !== second.image) return false;
    if (first.length !== second.length) return false;
    if (first.thumbnail !== second.thumbnail) return false;
    if (first.timestamp !== second.timestamp) return false;
    if (first.title !== second.title) return false;
    if (first.url !== second.url) return false;

    if (first.fields === undefined && second.fields !== undefined) return false;
    else if (first.fields !== undefined && second.fields === undefined) return false;
    else if (first.fields !== undefined && second.fields !== undefined) {
        if (first.fields.length !== second.fields.length) return false;
        for (let i = 0; i < first.fields.length; i++)
            if (first.fields[i] !== second.fields[i]) return false;
    }

    return true;
}

export { compareEmbeds };
