"use strict";

var FS = require("q-io/fs");

module.exports = getCredentials;
function getCredentials(credentialsPath) {
    return FS.read(credentialsPath || "credentials.json", {charset: "utf-8"})
    .then(JSON.parse, function () {
        if (!process.env.TRAVIS) {
            throw new Error("Can't find credentials.json in the working directory, nor a TRAVIS environment");
        } else {
            // TravisCI will acquire the encrypted configuration through environment
            // variables.
            return process.env;
        }
    });
}

