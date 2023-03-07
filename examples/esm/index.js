import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import express from "express";
import session from "express-session";
import lingueasy from "lingueasy";

const pkg = JSON.parse(await fs.readFile(new URL("./package.json", import.meta.url)));
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const app = express();
const port = 8827;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Session middleware have to be set before invoking lingueasy
app.use(session({ secret: "very-radom-secret-key", resave: false, saveUninitialized: false, httpOnly: true }));

// Invoke lingueasy
lingueasy(app);

app.get("/", (req, res) => {
    // The translating functions are available as
    // req.app.locals.__
    // req.app.locals._f
    // req.app.locals.lingueasy.__
    // req.app.locals.lingueasy._f
    // The current language is
    // req.app.locals.lingueasy.lang
    // console.log(req.app.locals.lingueasy);

    const _f = req.app.locals._f;
    const __ = req.app.locals.__;

    res.render("home", {
        title: "Translate With Lingueasy",
        content: _f("The server of this example page is listening on port %2$s.", 100, port),
        module_type: pkg.type,
    });
});

app.get("/switch-language", (req, res) => {
    const lingueasy = req.app.locals.lingueasy;
    const target = req.query.redirectTo || "/";

    /**
     * Update the session to the new lang if:
     * - query contains a lang (the query lang)
     * - the query lang differs from the current lingueasy.lang (same as session.lang)
     * - the query lang exists in the lingueasy.languages array, which contains all supported/available languages
     */
    if (req.query.lang && req.query.lang !== lingueasy.lang && lingueasy.languages.includes(req.query.lang)) {
        req.session.lang = req.query.lang;
        return req.session.save(err => {
            if (err) {
                console.error(err);
            }
            res.redirect(target);
        });
    }

    res.redirect(target);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
