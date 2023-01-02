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

    /**
     * Retrieve the current users preferred language from the session.
     * If not available, use one of the avalaible translation language that the users browser supports.
     */
    let lang = req.session?.lang || req.acceptsLanguages(...Object.keys(localizations));

    lang = sanitizeLocal(lang, true);

    next();
};

/**
 * Sanitizes a given string into a local name (e.g. en_GB, en, fr_FR, fr, de_DE...)
 * or return an empty string if the provided string does not match the format of locals
 *
 * i.e
 * input -> output (output in case short !== true)
 * de    -> de (de_DE)
 * en    -> en (en_EN)
 * en-us -> en (en_US)
 *
 * @param {string} local
 * @param {boolean} short Whether the short form (en, fr, de, ...) or the long form (en_GB, fr_FR, de_DE, ...)
 * @returns {string}
 */
function sanitizeLocal(local, short = true) {
    if (typeof local !== "string") {
        return "";
    }
    local = local.trim();
    if (local.length < 2) {
        return "";
    }
    short = short === true;
    if (local.length == 2) {
        if (short) {
            return local.toLowerCase();
        }
        local = `${local}_${local}`;
    }

    local = local.replace(/([a-z]{2})[\-|\_]([a-z]{2})/i, (_, p1, p2) => `${p1.toLowerCase()}_${p2.toUpperCase()}`);

    if (!/[a-z]{2}_[A-Z]{2}/.test(local)) {
        return "";
    }
    if (short) {
        return local.slice(0, 2);
    }
    return local;
}

module.exports = {
    sanitizeLocal,
};
