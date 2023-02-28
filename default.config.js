const root = process.cwd(); // require.main.path

module.exports = {
    path_to_translations_dir: `${root}/languages`,
    exclude_dirs: [".git", "node_modules", "vendors"],
    exclude_files: ["*min.js"],
    includes_files: ["*.ejs", "*.js"],
};
