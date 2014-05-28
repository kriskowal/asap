"use strict";

var FS = require("q-io/fs");
var ChildProcess = require("child_process");
var NodeReader = require("q-io/node/reader");

// Creates an annotations object for the working copy of the current Git
// repository, suitable for determining where to publish a build on S3,
// and for annotating a Selenium WebDriver session.
//
// If the repository is clean, tagged, and the tag matches the version in
// package.json, produces a release annotation.
//
// If the repository is clean, produces an integration testing annotation,
// based on the last commit hash.
//
// If the repository is dirty, produces a development testing annotation,
// based on the last commit hash and a randomly generated nonce to avoid
// overlap with other developer testing deployments.

module.exports = getAnnotations;
function getAnnotations() {
    return getGitHash("HEAD").then(function (hash) {
        return gitIsClean().then(function (gitIsClean) {
            if (gitIsClean) {
                return FS.read("package.json", {charset: "utf-8"})
                .then(function (configJson) {
                    var config = JSON.parse(configJson);
                    return getGitHash("v" + config.version).then(function (vHash) {
                        var parts = config.version.split(".");
                        var major = parts[0];
                        if (hash === vHash) {
                            return {
                                type: "release",
                                tags: ["release", "v" + config.version],
                                hash: hash,
                                version: config.version,
                                build: "v" + config.version,
                                train: "v" + major,
                                path: "release/" + config.version + "/",
                                trainPath: "train/release-" + major + "/"
                            };
                        } else {
                            return {
                                type: "integration",
                                tags: ["integration", hash.slice(0, 7)],
                                hash: hash,
                                build: hash.slice(0, 7),
                                path: "integration/" + hash + "/",
                                trainPath: "train/integration-" + major + "/"
                            };
                        }
                    });
                });
            } else {
                var nonce = Math.random().toString(36).slice(2, 7);
                return {
                    type: "development",
                    tags: ["development", hash.slice(0, 7), nonce],
                    hash: hash,
                    nonce: nonce,
                    build: hash.slice(0, 7) + "-" + nonce,
                    path: "development/" + hash + "-" + nonce + "/",
                    trainPath: "train/development/"
                };
            }
        });
    });
}

function getGitHash(rev) {
    var git = ChildProcess.spawn("git", ["rev-parse", rev]);
    var out = NodeReader(git.stdout, "utf-8");
    return out.read().then(function (line) {
        return line.trim();
    });
}

function gitIsClean() {
    var git = ChildProcess.spawn("git", ["status", "--porcelain"]);
    var out = NodeReader(git.stdout, "utf-8");
    return out.read().then(function (line) {
        return line.trim() === "";
    });
}

