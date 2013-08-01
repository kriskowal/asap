"use strict";

var asap = require("..");
var _ = require("lodash");
var EventEmitter = require("events").EventEmitter;

// This is a very rudimentary domain shim meant only to work with asap and with asap's tests. Unlike the real domain
// module, it requires manual teardown.

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

asap._throw = function (error) {
    if (activeDomain) {
        activeDomain.emit("error", error);
    } else {
        throw error;
    }
};

exports.teardown = function () {
    activeDomain = null;
};
