const { sanitizeLocal } = require("./utils");

const localizations = {
};

/**
 * An express middleware that detects the current user preferred lang
 *
 * @param {Request} req
 * @param {Response} res
 * @param {next} next
 */
const localizer = (req, res, next) => {
    // TODO skip routes that do not need translation: check req.originalUrl and return next() on match

    let lang = req.session?.lang;
    if (!lang) {
        lang = req.acceptsLanguages(...Object.keys(localizations));
    }

    lang = sanitizeLocal(lang, true);

    next();
};
