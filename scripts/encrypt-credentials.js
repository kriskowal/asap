"use strict";

var Q = require("q");
var ChildProcess = require("child_process");
var Reader = require("q-io/reader");
var getCredentials = require("./credentials");

getCredentials()
.then(function (credentials) {
    return new Reader(Object.keys(credentials))
    .forEach(function (key) {
        var value = credentials[key];
        console.log(key);
        return encrypt(key, value);
    });
})
.done();

function encrypt(key, value) {
    var deferred = Q.defer();
    var git = ChildProcess.spawn("travis", [
         "encrypt",
         "--add",
         "env.global",
         key + "=" + value
    ], {
        stdio: [0, 1, 2]
    });
    git.on("exit", function (code) {
        if (code) {
            deferred.reject(new Error("Exit with status " + code));
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise;
}

