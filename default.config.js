const appRoot = require("app-root-path");

module.exports = {
    path_to_translations_dir: `${appRoot}/languages`,
    exclude_dirs: [".git", "node_modules", "vendors"],
    exclude_files: ["*min.js"],
    includes_files: ["*.ejs", "*.js"],
};
