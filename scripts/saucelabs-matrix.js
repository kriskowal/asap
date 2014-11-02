"use strict";

var URL = require("url");
var HTTP = require("q-io/http");
var S3 = require("./s3");

module.exports = captureMatrix;
function captureMatrix(credentials, annotations, name) {
    var s3 = new S3({
        bucket: credentials.S3_BUCKET,
        key: credentials.S3_ACCESS_KEY_ID,
        secret: credentials.S3_ACCESS_KEY
    });
    return HTTP.read("https://saucelabs.com/browser-matrix/" + credentials.SAUCE_USERNAME + ".svg")
    .then(function (content) {
        var path = URL.resolve(annotations.trainPath, name || "saucelabs-results-matrix.svg");
        return s3.put(path, content, "image/svg+xml", {
            "Cache-Control": "no-cache"
        })
        .thenResolve(URL.resolve(credentials.S3_WEBSITE, path));
    });
}

