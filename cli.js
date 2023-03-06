#!/usr/bin/env node

const path = require("node:path");
const fs = require("node:fs/promises");
const { exec } = require("node:child_process");

const resolver = require("await-resolver");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const pkg = require("./package.json");
const { mergeConfigs, sanitizeLocal, translation_template_name } = require("./libs.js");

const defined_args = ["generate", "localize"];
const args = process.argv.slice(2);

if (!args.length || defined_args.indexOf(args[0]) === -1) {
    console.log("Missing argument:");
    console.log("\t", path.basename(process.argv[1]), defined_args.join("|"));
    process.exit();
}
const task = args[0];

if (task === "generate") {
    create_l10n()
        .then(() => {
            // console.log("generated");
        })
        .catch(error => {
            console.log(error);
        })
        .finally(() => {
            process.exit();
        });
}

let translator = "";
if (task === "localize") {
    if (args.length < 2) {
        console.log("Missing the lang option: (e.g. en or en_us)");
        console.log("\t", path.basename(process.argv[1]), "localize <lang>");
        process.exit();
    }
    if (args[2] && /^\-\-/.test(args[2])) {
        translator = args[2].slice(2).toLowerCase();
    }

}

/**
 * A helper function to ease running bash commands in async mode
 *
 * @param {string} cmd The bash command to run
 */
function bash_promise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { shell: true }, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            if (stderr) {
                reject(stderr);
            }
            resolve(stdout);
        });
    });
}

const cli = {};

/**
 * Greps translatable files i.e. files containing translation functions like __(), _f()
 * and generates the translation templates
 */
async function create_l10n() {
    const config = mergeConfigs();

    // Return an error if a the language dir cannot be created
    const [createDirError] = await resolver(fs.mkdir(config.path_to_translations_dir, { recursice: true }));
    if (createDirError && createDirError.code !== "EEXIST") {
        // throw createDirError;
        return console.error(createDirError);
    }
    console.log("Configuation to generate/update translation templates:");
    console.log(config);

    const projectRootPath = "" + process.cwd();
    let command = "grep -rlE ";
    command += ` --exclude-dir={${config.exclude_dirs.join(",")}}`;
    command += ` --exclude={${config.exclude_files.join(",")}}`;
    command += ` --include={${config.includes_files.join(",")}}`;
    command += ` "_[_f]\\(" ${projectRootPath}`;

    const [cmdError, cmdResults] = await resolver(bash_promise(command));
    if (cmdError) {
        return console.error(cmdError);
    }
    // Remove empty entries
    const files = cmdResults.split(/\r?\n/).filter(Boolean);

    const l10nCollection = [];

    let regexs = {
        "__(*)": new RegExp(/\_\_\(\s?[\'|\"](.*?)[\'|\"]\s?\)/, "g"),
        "_f(*, ...args)": new RegExp(/\_f\(\s?[\'|\"](.*?)[\'|\"]\s?,\s?.*?\)/, "g"),
    };

    /**
     * Search for:
     * - "__(*)"
     *  e.g. __("search...text")     or  __('search...text')    or  __(`search...text`)
     * - "_f(*, ...args)"
     *  e.g. _f("search...text", *)  or  _f('search...text', *) or  _f(`search...text`, *)
     */
    let re = new RegExp(/\_[\_|f]\(\s?[\'|\`|\"]((?:.|\n)*?)[\'|\`|\"]\s?(?:\,\s?.*?)?\)/, "gm");

    for (const file of files) {
        console.log("Processing: ", file);
        let [fileContentErr, fileContent] = await resolver(fs.readFile(file, { encoding: "utf-8" }));
        if (fileContentErr) {
            console.error(fileContentErr);
            continue;
        }
        let lines = fileContent
            // split the filecontent into an array of lines
            .split(/\r?\n/)
            // transform each line into an object {lineNumber:x, line:""}
            .map((line, idx, lines) => {
                let lineObj = { lineNumber: idx + 1, line };
                // recombine multilines translations
                if (/\_[\_|f]\(\s?\`\s?/.test(line) && !/\s?\`\s?\)/.test(line)) {
                    let nextLineIndex = idx + 1;
                    lineObj.line += "\n" + lines[nextLineIndex];
                    while (!/\s?\`\s?(?:\,\s?.*?)?\)/.test(lineObj.line) && nextLineIndex < lines.length) {
                        lineObj.line += "\n" + lines[++nextLineIndex];
                    }
                }
                return lineObj;
            })
            // remove unnecessary lines
            .filter(({ line }) => /\_[\_|f]\(/.test(line));

        let relativeFilePath = path.relative(projectRootPath, file);

        lines.forEach(entry => {
            while ((match = re.exec(entry.line)) != null) {
                l10nCollection.push({
                    lineNumber: `${relativeFilePath}:${entry.lineNumber}`,
                    text: match[1],
                });
            }
        });
    }

    // TODO translform the l10nCollection into a pot template
    let l10nPot = l10nCollection.reduce((acc, cur) => {
        acc += `#: ${cur.lineNumber}\n`;
        const lines = cur.text.split(/\r?\n/);
        if (lines.length <= 1) {
            acc += `msgid "${cur.text}"\n`;
            acc += `msgstr ""\n`;
        } else {
            acc += `msgid ""\n`;
            for (const line of lines) {
                acc += `"${line}\\n"\n`;
            }
        }
        acc += "\n";
        return acc;
    }, "");

    const l10nPot_path = path.join(config.path_to_translations_dir, `${translation_template_name}.pot`);
    const [potError] = await resolver(fs.writeFile(l10nPot_path, l10nPot));

    if (potError) {
        return console.error(potError);
    }
    /**
     * Translform the l10nCollection into a json template
     *
     * Retrieve the text to be translated, remove duplicates, sort them alphebetically,
     * JSON.strigify and store the result into as json file
     */
    let l10nJson = new Set(l10nCollection.map(obj => obj.text));
    l10nJson = [...l10nJson].sort().map(key => [key, ""]);
    l10nJson = Object.fromEntries(l10nJson);
    l10nJson = JSON.stringify(l10nJson, null, 4);

    const l10nJson_path = path.join(config.path_to_translations_dir, `${translation_template_name}.json`);
    const [jsonError] = await resolver(fs.writeFile(l10nJson_path, l10nJson));

    if (jsonError) {
        return console.error(jsonError);
    }

    console.log("Done");
}
}

function get_active_translator() {
    if (translator === "deepl" && get_deepl_config() != null) {
        return "deepl";
    }
    return "";
}

function translate(translator, source_lang, target_lang, text) {
    switch (translator) {
        case "deepl":
            return deepl_translate(source_lang, target_lang, text);

        case "":
        default:
            return "";
    }
}

function get_deepl_config() {
    if (!process.env.DEEPL_ENDPOINT || !process.env.DEEPL_AUTH_KEY) {
        console.log("Missing at least one environment variable: the deepl api endpoint (DEEPL_ENDPOINT) or the api key (DEEPL_AUTH_KEY).");
        return null;
    }

    return {
        api_endpoint: process.env.DEEPL_ENDPOINT,
        requestHeaders: {
            "User-Agent": "lingueasy",
            Authorization: `DeepL-Auth-Key ${process.env.DEEPL_AUTH_KEY}`,
        },
    };
}

function deepl_translate(source_lang, target_lang, text) {
    const deepL = get_deepl_config();
    if (!deepL) {
        return Promise.reject(new Error("Probably missing DeepL API Keys"));
    }
    const formData = new URLSearchParams();
    formData.append("source_lang", source_lang);
    formData.append("preserve_formatting", 1);
    formData.append("target_lang", target_lang.replace("_", "-"));
    formData.append("tag_handling", "html");
    formData.set("text", text);

    return new Promise((resolve, reject) => {
        fetch(`${deepL.api_endpoint}/translate`, {
            headers: deepL.requestHeaders,
            method: "post",
            body: formData,
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(result => {
                result = result.translations?.[0] || {};
                if (!result.text) {
                    return reject(new Error("No translation"));
                }

                resolve(result.text);
            });
        // .catch(reject);
    });
}

function deepl_stats() {
    const deepL = get_deepl_config();
    if (!deepL) {
        return;
    }
    fetch(`${deepL.api_endpoint}/usage`, { headers: deepL.requestHeaders })
        .then(response => {
            if (!response.ok) {
                // console.log(response);
                throw new Error(`${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(result => {
            console.log(result);
            let remainingCharacterCount = result.character_limit - result.character_count;
            let remaining_percentage = Number(remainingCharacterCount / result.character_limit);
            let remaining_percentage_formatted = remaining_percentage.toLocaleString("de-DE", { style: "percent", minimumFractionDigits: 2 });

            console.log(`Remaining characters: ${remainingCharacterCount} (${remaining_percentage_formatted})`);
        })
        .catch(console.error);
}

module.exports = cli;
