"use strict";

var Q = require("q");
var FS = require("q-io/fs");
var URL = require("url");
var build = require("mr/build");
var getCredentials = require("./credentials");
var S3 = require("./s3");

module.exports = publishWorkerTest;
function publishWorkerTest() {
    var targetPath = targetPath || getAdhocTargetPath();
    return Q([
        getCredentials(),
        build(FS.join("test/asap-test.js")),
        build(FS.join("test/worker.js")),
    ]).spread(function (credentials, workerScript, testScript) {
        var s3 = new S3({
            bucket: credentials.S3_BUCKET,
            key: credentials.S3_ACCESS_KEY_ID,
            secret: credentials.S3_ACCESS_KEY
        });
        workerScript = new Buffer(workerScript, "utf-8");
        var page = new Buffer("<body><script src=\"test.js\"></script></body>");
        return Q.all([
            s3.put(URL.resolve(targetPath, "test.js"), testScript, "application/javascript"),
            s3.put(URL.resolve(targetPath, "worker.js"), workerScript, "application/javascript"),
            s3.put(URL.resolve(targetPath, "test.html"), page, "text/html")
        ]).then(function () {
            return URL.resolve(URL.resolve(credentials.S3_WEBSITE, targetPath), "test.html");
        });
    });
}

function getAdhocTargetPath() {
    var nonce = Math.random().toString(36).slice(2, 7);
    return "adhoc/" + nonce + "/";
}

if (require.main === module) {
    publishWorkerTest().done(console.log);
}

