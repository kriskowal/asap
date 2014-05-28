"use strict";

// This script asks every available Saucelabs Web Driver configuration which
// event queue flush request methods are available.

// I previously used this script to generate the data for this report:
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

var publishBundle = require("./publish-bundle");
var run = require("./saucelabs");

publishBundle("scripts/event-queue-query.js")
.then(function (location) {
    return run(location, {
        name: "event-queue-query",
        build: Math.random().toString(36).slice(2)
    }, "scripts/saucelabs-fast-configurations.json");
})
.then(function (results) {
    console.log();
    console.log("os,browser,version,settimeout,setimmediate,messagechannel,mutationobserver,webkitmutationobserver");
    results.forEach(function (result) {
        var configuration = result.configuration;
        var results = result.results;
        console.log([
            configuration.platform,
            configuration.browserName,
            configuration.version,
        ].concat([
            results.settimeout,
            results.setimmediate,
            results.messagechannel,
            results.mutationobserver,
            results.webkitmutationobserver
        ].map(yesno)).join(","));
    });
})
.done();

function yesno(x) {
    return x === "undefined" ? "FALSE" : "TRUE";
}

