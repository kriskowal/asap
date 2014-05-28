"use strict";

var Q = require("q");
var SauceLabs = require("saucelabs");
var getCredentials = require("./credentials");

return getCredentials()
.then(function (credentials) {
    var saucelabs = Q(new SauceLabs({
        username: credentials.SAUCE_USERNAME,
        password: credentials.SAUCE_ACCESS_KEY
    }));
    return saucelabs.ninvoke("getWebDriverBrowsers");
})
.then(function (configurations) {
    return configurations.map(function (configuration) {
        return {
            browserName: configuration.api_name,
            platform: configuration.os,
            version: configuration.short_version
        };
    });
})
.then(function (configurations) {
    console.log(JSON.stringify(configurations, null, 2));
})
.done();

