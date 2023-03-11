# Lingueasy

[![License][license-image]][license-url] [![NPM Package Version][npm-image-version]][npm-url] ![GitHub top language][language-image] ![Size][size-image] ![Last Commit][commit-image]

**Code less, write less, reach more clients around the world.**

A fast, minimalist and easy to use library for translating source codes.

Lingueasy creates translation templates based on the source code and it can automatically translate them to your target languages using the built-in `Deepl API`. But you are also free to manually translate the templates.

## Installation

```bash
$ npm i lingueasy
```

## Usage

##### Require CommonJS

```js
const lingueasy = require("lingueasy");
```

##### Import ES-Module

```js
import lingueasy from "lingueasy";
```

### With ExpressJS and ejs view templates

```js
const path = require("node:path");

const express = require("express");
const session = require("express-session");
const lingueasy = require("lingueasy");

const app = express();
const port = 8823;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Session middleware have to be set before invoking lingueasy
const sessionOptions = {};
app.use(session(sessionOptions));

lingueasy(app);
```

You can configure lingueasy to include or exclude some files from being translated. See the [configuration section](#configuration) for more info.

#### Accessing the translation functions

The translating functions are exposed to `app.locals` which can be accessed by any route handler

```js
const port = 8823;
let pageview = 0;
app.get("/", (req, res) => {
    req.app.locals.__;
    req.app.locals._f;
    req.app.locals.lingueasy.__;
    req.app.locals.lingueasy._f;
    req.app.locals.lingueasy.lang; // the current language

    // shorthand
    const _f = req.app.locals._f;
    const __ = req.app.locals.__;

    pageview++;

    res.render("home", {
        title: "Translate With Lingueasy",
        serverIp: "127.0.0.1",
        port: port,
        content: _f("This server is listening on port %2$s and this page have been visited %1$s times", pageview, port),
    });
});
```

Since the functions are available on `app.locals` they are automatically exposed to the views. E.g. in `ejs` view there are multiple way to access the translating functions

```ejs views/home.ejs
<p><%= __('.....'); %></p>
<p><%= _f('... %3$s ... %1$s ...', var1, ..., varN); %></p>

<p><%= locals.__('.....'); %></p>
<p><%= locals._f('... %3$s ... %1$s ...', var1, ..., varN); %></p>

<p><%= lingueasy.__('.....'); %></p>
<p><%= lingueasy._f('... %3$s ... %1$s ...', var1, ..., varN); %></p>
<p><%= lingueasy.lang %></p>

<p><%= locals.lingueasy.__('.....'); %></p>
<p><%= locals.lingueasy._f('... %3$s ... %1$s ...', var1, ..., varN); %></p>
<p><%= locals.lingueasy.lang %></p>
```

### Translation syntax

#### Simple texts

```js
__("Fast, minimalist and easy to use library for translations.");

// Multiline translation
__(`Fast, minimalist and easy to use library for translations.
This is a very long text 
on multiple lines...`);
```

#### Text with variables

While there are multiple ways to make a string translatable, some choices may be bad for translation. For example:

```js
__("For more documentation visit") + ' <a href="https://example.com">' + __("the github repo") + "</a>";
```

The sentence is splitted into parts which gives the translator no context. A slighly better approach would be:

```js
_f("For more documentation visit %1$s the github repo %2$s", '<a href="https://example.com">', "</a>");
```

But it's hard to understand the role of the placeholders. **A better way to make this sentence translatable would be**:

```js
_f('For more documentation visit <a href="%s">the github repo</a>', "https://example.com");
```

because most translation tools can handle html markups correctly i.e. they will not translate HTML/XML markups.

## Generate translations

Add the lingueasy script to your package.json script:

```json
"scripts": {
    "lingueasy:generate": "lingueasy generate",
    "lingueasy:localize:de": "lingueasy localize de",
    "lingueasy:localize:fr": "lingueasy localize fr --deepl",
    "lingueasy:localize:es": "lingueasy localize es --deepl"
},
```

and run it `npm run lingueasy:localize:de`. Feel free to name the scripts as you wish and replace the locals (language code) with your target language code.

The `lingueasy:generate` script soley generates the translation template. It is optional since `lingueasy:localize:*` scripts invoke it to update the template before translation.

With the flag `--deepl` the translations will be generated automatically using the `deepl api`. For this to work you need to provide your own API key using environment variables e.g. a `.env` file with the following variables.

```sh
DEEPL_ENDPOINT=https://api-free.deepl.com/v2
DEEPL_AUTH_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx:fx
```

**API resources are used with care: Lingueasy is optimized to translate a string only once even if you run the same script multiple times.**

### Configuration

Lingueasy will assume english (en) as the default language of the source code and will create the translations in the `languages` folder at the root of the project i.e. at the same level as the `package.json` file.

While a configuration is optional, you can provide a configuration file `lingueasy.config.js` (in case of es-module `lingueasy.config.cjs`) at the root of the project. The config file should default export an object:

```js
module.exports = {
    // Location of translations
    path_to_translations_dir: "/full/path/to/languages",
    // List of directories to exclude
    exclude_dirs: [".git", "node_modules", "vendors"],
    // List of files to exclude
    exclude_files: ["*min.js"],
    // List of files to include
    includes_files: ["*.ejs", "*.js"],
};
```

## License

See [LICENSE][license-url].

## Copyright

Copyright &copy; 2022. Kossi D. T. Saka.

[npm-image-version]: https://img.shields.io/npm/v/lingueasy.svg
[npm-image-downloads]: https://img.shields.io/npm/dm/lingueasy.svg?color=purple
[npm-url]: https://npmjs.org/package/lingueasy
[license-image]: https://img.shields.io/github/license/kossidts/lingueasy
[license-url]: https://github.com/kossidts/lingueasy/blob/master/LICENSE
[language-image]: https://img.shields.io/github/languages/top/kossidts/lingueasy?color=yellow
[size-image]: https://img.shields.io/github/repo-size/kossidts/lingueasy?color=light
[commit-image]: https://img.shields.io/github/last-commit/kossidts/lingueasy
[actions-url]: https://github.com/kossidts/lingueasy/actions
[workflow-image]: https://github.com/kossidts/lingueasy/actions/workflows/node.js.yml/badge.svg
[workflow-image-2]: https://github.com/kossidts/lingueasy/workflows/Node.js%20CI/badge.svg
