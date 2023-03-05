const path = require("node:path");
const fs = require("node:fs");

const express = require("express");

const lingueasy = require("lingueasy");

const app = express();
const port = 8823;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

lingueasy.init(app);

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
    });
    // Ein schnelles, offenes, unkompliziertes Web-Framework für Übersetzungen
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
