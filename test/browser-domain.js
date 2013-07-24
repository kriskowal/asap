"use strict";

var EventEmitter = require("events").EventEmitter;
var asap = require("..");

// This is a very rudimentary domain shim meant only to work with asap and with asap's tests. Unlike the real domain
// module, it requires manual teardown. It hooks in to `asap.onerror`.

var domainIsActive = false;

exports.create = function () {
    if (domainIsActive) {
        throw new Error("A domain is already active! You need to tear it down first!");
    }
    domainIsActive = true;

    var d = new EventEmitter();
    d.run = function (f) {
        f();
    };

    asap.onerror = function (error) {
        d.emit("error", error);
    };

    return d;
};

exports.teardown = function () {
    asap.onerror = null;
    domainIsActive = false;
};
