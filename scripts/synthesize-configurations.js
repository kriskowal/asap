"use strict";

var configurations = require("./saucelabs-all-configurations.json");
var selection = require("./selection.json");
var Map = require("collections/map");

var latests = new Map(new Map(selection.browsers).map(function (versions, name) {
    return [name, versions.pop().version];
}));

var selections = configurations.filter(function (configuration) {
    if (configuration.browserName === "internet explorer") {
        return true;
    } else {
        return configuration.version === latests.get(configuration.browserName);
    }
});

console.log(JSON.stringify(selections, null, 4));
