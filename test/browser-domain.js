"use strict";

var EventEmitter = require("events").EventEmitter;
var asap = require("./asap-implementation");

// This is a very rudimentary domain shim meant only to work with asap and with asap's tests. Unlike the real domain
// module, it requires manual teardown. It hooks in to `asap.onerror`.

var activeDomain = null;

exports.create = function () {
    if (activeDomain) {
        throw new Error("A domain is already active! You need to tear it down first!");
    }

    activeDomain = new EventEmitter();
    activeDomain.run = function (f) {
        f();
    };

    return activeDomain;
};

asap.setOnError(function (error) {
    if (activeDomain) {
        activeDomain.emit("error", error);

    } else {
        throw error;
    }
});

exports.teardown = function () {
    activeDomain = null;
};
