
"use strict";

if (typeof asap === "undefined") {
    var asap = require("../asap");
    var expect = require("expect.js");
    var mocha = require("mocha");

    var domain;
    try {
        domain = require("domain");
    } catch (e) {}
}


var MAX_TASKS = 4000;
var RECURSION_TAG = {};

var expected_oreder = [];
var called_order = [];
var n_called_on_error = 0;
var doneCallback;
var currDomain;
var currPattern;

function error() {
    n_called_on_error = called_order.length;
    throw new Error();
}

afterEach(function () {
    if (currDomain) {
        currDomain.exit();
        currDomain = null;
    }
});

function queueTask(sub_pattern) {
    var index = expected_oreder.length;
    if (index >= MAX_TASKS) return;
    var top_pattern = currPattern;

    expected_oreder.push(index);

    asap(function () {
        if (top_pattern === currPattern) {
            called_order.push(index);
            handlePattern(sub_pattern);
        }
    });
}

function handlePattern(pattern) {
    if (pattern === RECURSION_TAG) {
        pattern = currPattern;
    }

    for (var i = 0; i < pattern.length; ++i) {
        var x = pattern[i];

        if (typeof x === "function") {
            if (currDomain) {
                n_called_on_error = -1;
                x();
            } else {
                // in browsers exceptions doesn't halt the flushing,
                // so do not propagate them - just stop.
                try {
                    x();
                } catch (e) {
                    break;
                }
            }
        } else {
            queueTask(x);
        }
    }

    checkIfDone();
}

function checkIfDone() {
    if (doneCallback && called_order.length >= expected_oreder.length) {
        expect(called_order).to.eql(expected_oreder);
        //console.log(called_order.length);
        var done = doneCallback;
        doneCallback = void 0;
        done();
    }
}

function runCase(desc) {
    var pattern = [].slice.call(arguments, 1);

    describe(desc+": ", function () {

        var not_halted_on_error = false;

        it("should run tasks in order", function (done) {
            expected_oreder = [];
            called_order = [];
            currPattern = pattern;
            doneCallback = done;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function () {
                    if (n_called_on_error !== called_order.length) {
                        not_halted_on_error = true;
                    }
                    checkIfDone();
                });
                currDomain.enter();
            }

            try {
                handlePattern(pattern);
            } catch (e) {}

            expect(called_order.length).to.be(0);
        });

        if (domain) {
            it("should halt flushing until exceptions are not handled", function () {
                expect(not_halted_on_error).to.be(false);
            });
        }
    });
}

//______________________________________________________________________________

var e = error;
var R = RECURSION_TAG;

runCase("single task", [] );
runCase("multiple tasks", [], [], [] );
runCase("multiple tasks that throws", [e], [e], [e] );
runCase("multiple mixed tasks", [], [e], [], [e], [e], [], [] );
runCase("errors at end", [[e], e], e );
runCase("recursion", [R] );
runCase("recursion with errors", [R, e] );
runCase("multiple recursions", [R], [R], [R, e] );
runCase("recursion - mixed", [R, [], e] );
runCase("recursion - mixed 2", [R, [[[[], e]]], e] );

