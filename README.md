# guiworks
A React-style Discord.js library for interactive embeds

## Installation
You can install guiworks using either
```bash
npm install --save guiworks
```
or
```bash
yarn add guiworks
```

## Usage
First, you need to initialize a Guiworks instance right after your Discord.js client
```js
import Guiworks from "guiworks";

const client = new Discord.Client();
const guiworks = new Guiworks();
```

Now you can register new Gui instances by running `guiworks.add()`
```js
guiworks.add(textChannel, new MyGreatGui());
```

### Guis
A basic Gui only needs to extend Guiworks's Gui class and implement the methods `update` and `render`, and either `targetReactions` or `automaticRender`
```js
import { Gui } from "guiworks";

class MyGreatGui extends Gui {
    constructor() {
        super();
    }

    update(event) {}

    render() {
        const embed = new Discord.RichEmbed();
        embed.setTitle("This is my great Gui!");
        return embed;
    }

    targetReactions() {
        return ["👍"]
    }

    automaticRender() {
        // Automatic render every 15 seconds;
        return 15000;
    }
}
```

`update` gets called every time a reaction gets added or removed. An event has a `type`, and it can be either `reactionAdd` or `reactionRemove`.

For both, there are also `reaction` and `user` variables set

Other functions that you can implement are `initialize()`, `finalize()` and `isParticipating(user)`.

Every implementation of Gui also provides two functions, `triggerRender()` to trigger a re-render at will, and `terminate()`, which will tell the Guiworks instance to terminate the Gui instance.