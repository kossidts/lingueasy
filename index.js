const { mergeConfigs, create_localizer_middleware } = require("./libs.js");

function init(expressApp, options) {
    const config = mergeConfigs(options);

    if (expressApp) {
        const expressMiddleware = create_localizer_middleware(config);
        expressApp.use(expressMiddleware);
    }
}

module.exports = init;
