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

    console.log(config);
    console.log(command);
    console.log(files);
}

create_l10n();
module.exports = cli;
