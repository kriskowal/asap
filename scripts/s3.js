"use strict";

var Q = require("q");
var knox = require("knox");

module.exports = S3;
function S3(config) {
    this.knox = knox.createClient(config);
}

S3.prototype.put = function (path, content, contentType, moreHeaders) {
    var deferred = Q.defer();
    var headers = {
        "Content-Length": content.length,
        "Content-type": contentType,
        "x-amz-acl": "public-read"
    };
    for (var name in moreHeaders) {
        headers[name] = moreHeaders[name];
    }
    var request = this.knox.put(path, headers);
    request.on("response", function (response) {
        if (response.statusCode === 200) {
            // alt: response.resume();
            // does not appear to have any content typically
            response.pipe(process.stderr);
            response.on("end", deferred.resolve);
            response.on("error", deferred.reject);
        } else {
            deferred.reject("Can't post " + response.statusCode);
        }
    });
    request.end(content);
    return deferred.promise;
};

