"use strict";

var Q = require("q");
var getCredentials = require("./credentials");
var getAnnotations = require("./annotations");
var run = require("./saucelabs");
var publishWorkerTest = require("./publish-worker-test");
var captureSaucelabsMatrix = require("./saucelabs-matrix");

return Q([
    getCredentials(),
    getAnnotations(),
    publishWorkerTest()
]).spread(function (credentials, annotations, location) {
    return run(location, {
        name: "worker-test",
        build: Math.random().toString(36).slice(2)
    }, process.argv[2] || "scripts/saucelabs-spot-configurations.json", null, 40e3)
    .then(function () {
        return captureSaucelabsMatrix(credentials, annotations, "saucelabs-worker-results-matrix.svg");
    });
})
.done(console.log);

