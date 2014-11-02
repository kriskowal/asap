"use strict";

var configurations = require("./saucelabs-all-configurations.json");

var Set = require("collections/set");
var Map = require("collections/map");
var List = require("collections/list");

var browsers = new Map(new Map(new List(configurations).group(function (configuration) {
    return configuration.browserName;
})).map(function (value, key) {
    return [key, new Set(value.filter(function (configuration) {
            return configuration.version !== "beta";
    }).map(function (configuration) {
        return [configuration.version.split(".").map(function (number) {
            if (+number === +number) {
                return +number;
            } else {
                return number;
            }
        }), configuration.browserName];
    }).sorted().map(function (pair) {
        return pair[1] + ":" + pair[0].join(".");
    })).map(function (configuration) {
        var pair = configuration.split(":");
        return {
            browserName: pair[0],
            version: pair[1]
        };
    })];
})).toObject();

var platforms = new Map(new Set(configurations.map(function (configuration) {
    return configuration.platform;
})).group(function (configuration) {
    if (configuration.indexOf("Windows") >= 0) {
        return "windows";
    } else if (configuration.indexOf("Mac") >= 0) {
        return "mac";
    } else if (configuration.indexOf("Linux") >= 0) {
        return "linux";
    } else {
        return "other";
    }
})).toObject();

console.log(JSON.stringify({
    platforms: platforms,
    browsers: browsers
}, null, 4));
