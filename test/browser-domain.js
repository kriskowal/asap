"use strict";

var EventEmitter = require("events").EventEmitter;
var asap = require("../asap");

// This is a very rudimentary domain shim meant only to work with asap and with
// asap's tests. Unlike the real domain module. Only one domain may be used at
// a time. Since this is only used for testing, there is no cleanup.

var active;

exports.create = function () {
    active = new EventEmitter();
    active.run = function (f) {
        f();
    };
    return active;
};

asap.onerror = function (error) {
    var domain = active;
    if (domain) {
        domain.emit("error", error);
    } else {
        throw error;
    }
};

