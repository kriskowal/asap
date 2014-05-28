"use strict";

var gauntlet = require("./gauntlet");
var asap = require("../asap");
var rawAsap = require("../raw");

console.log(rawAsap.requestFlush);

gauntlet(asap, "asap", function (error, asapResults) {
    if (error) {
        global.global_test_results = {error: error};
        throw error;
    }
    gauntlet(rawAsap, "raw asap", function (error, rawAsapResults) {
        var results = asapResults.concat(rawAsapResults);
        results.forEach(function (result) {
            console.log(result.subjectName, result.name, ((result.count / result.totalDuration) * 1000).toFixed(0), "ops/sec");
        });
        global.global_test_results = {
            results: results
        };
    });
});

