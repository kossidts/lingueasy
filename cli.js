const { exec } = require("node:child_process");

const appRoot = require("app-root-path");
const resolver = require("await-resolver");

const pkg = require("./package.json");
const { mergeConfigs } = require("./libs.js");

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
async function create_l10n() {
    const config = mergeConfigs();
    let command = "grep -rlE ";
    command += ` --exclude-dir={${config.localization.exclude_dirs.join(",")}}`;
    command += ` --exclude={${config.localization.exclude_files.join(",")}}`;
    command += ` --include={${config.localization.includes_files.join(",")}}`;
    command += ` "_[_f]\\(" ${appRoot}`;
    const [cmdError, cmdResults] = await resolver(bash_promise(command));
    if (cmdError) {
        throw cmdError;
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
            .filter(({ line }) => /\_[\_|f]\(/.text(line));

        // TODO: Verify the path
        let relativeFilePath = path.relative(pathProjectRoot, file);

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
    // TODO translform the l10nCollection into a json template

    console.log(config);
    console.log(command);
    console.log(files);
}

create_l10n();
module.exports = cli;
