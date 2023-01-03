const appRoot = require("app-root-path");
const real_typeof = require("@kdts/real-typeof");

const pkg = require("./package.json");
const defaultConfig = require("./default.config.js");

function mergeConfigs() {
    let config = null;
    try {
        config = require(`${appRoot}/${pkg.name}.config.js`);
    } catch (error) {}

    // Merge the config with the default configs
    config = Object.assign({}, defaultConfig, config);
    config.exclude_dirs = [...new Set(config.exclude_dirs.concat(defaultConfig.exclude_dirs))];
    config.exclude_files = [...new Set(config.exclude_files.concat(defaultConfig.exclude_files))];
    config.includes_files = [...new Set(config.includes_files.concat(defaultConfig.includes_files))];
    config.localizations = {};

    // en: {}, // require locals /languages/locals/en.json
    return config;
}

// Cache the translating functions for efficiency
const translators = new Map();

/**
 * Create translating functions
 * @param {string} lang the target language
 * @param {object} localizations The translation object
 * @returns {array} An array of translation functions
 */
function create_translators(lang, localizations) {
    if (translators.has(lang)) {
        return translators.get(lang);
    }
    /**
     * Translate a given string
     * @param {string} str The string to translate
     * @returns {string} The translated string of the original string in case the translation is missing
     */
    const __ = str => {
        localizations[lang]?.[str] || str;
    };

    /**
     * Translate a tring with placeholders
     * @param {string} str The string to translate containing placeholders
     * @param {...any} args List of values for the placeholders
     * @returns {string} The translates string with values in place
     *
     * @usage
     * _f('You must be %s years old', 18)
     * is the same as __('You must be %s years old').replace('%s', 18)
     * but is more powerful
     *
     * _f('Mr. %2$s %1$s is %3$s years old.', firstname, lastname, age)
     *
     */
    const _f = (str, ...args) => {
        let formatted = __(str).replace(/(%(?:(\d+)\$)?[s|d|f])/g, function (_, p1, p2) {
            let index = ~~p2 > 0 ? ~~p2 - 1 : 0;

            return args[index];
        });

        return formatted;
    };

    let _translators = translators.set(lang, [__, _f]);

    return _translators;
}

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

    const [__, _f] = create_translators(lang, localizations);

    req.app.locals.lingueasy = {
        lang,
        __,
        _f,
    };

    req.app.locals.__ = __;
    req.app.locals._f = _f;

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
