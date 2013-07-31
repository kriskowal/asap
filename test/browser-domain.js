"use strict";

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

global.asap = _.wrap(asap, function (originalAsap, task) {
    originalAsap(function () {
        try {
            task();

        } catch (error) {
            if (activeDomain) {
                activeDomain.emit("error", error);
            } else {
                throw error;
            }
        }
    });
});

exports.teardown = function () {
    activeDomain = null;
};
