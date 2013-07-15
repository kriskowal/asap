
"use strict";

var domain;

if ( typeof asap === "undefined" ) {
    global.asap = require("../asap");
    var expect = require("expect.js");
    var mocha = require("mocha");
    try {
        domain = require("domain");
    } catch (e) {}
}

function error() {
    n_called_on_error = called_ids.length;
    throw new Error();
}

var RECURSIVE = {};

var MAX_TASKS = global.MAX_TASKS || 4000;

var next_id = 1;
var expected_ids = [];
var called_ids = [];
var n_called_on_error = 0;
var doneCallback;
var currDomain;
var validTag;
var currPattern;

afterEach(function () {
    if (currDomain) {
        currDomain.exit();
        currDomain = null;
    }
});

function queueTask(childs) {
    if (next_id >= MAX_TASKS) return;
    var id = next_id++;
    var top_pattern = currPattern;
    expected_ids.push(id);

    asap(function () {
        if (top_pattern === currPattern) {
            called_ids.push(id);
            handlePattern(childs);
        }
    });
}

function handlePattern(pattern) {
    if (pattern === R) {
        pattern = currPattern;
    }

    for (var i = 0; i < pattern.length; ++i) {
        var x = pattern[i];

        if (typeof x === "function") {
            if (currDomain) {
                n_called_on_error = -1;
                x();
            } else {
                // in browsers exceptions don't halt the flushing,
                // so do not propagate them - just stop
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
    if (doneCallback && called_ids.length >= expected_ids.length) {
        expect(called_ids).to.eql(expected_ids);
        //console.log(called_ids.length);
        var done = doneCallback;
        doneCallback = void 0;
        done();
    }
}

function runCase(desc) {
    var pattern = [].slice.call(arguments, 1);

    describe(desc+": ", function () {

        var not_halted_on_error = false;

        it("should run expacted tasks in order, regardless of exceptions", function (done) {
            next_id = 1;
            expected_ids = [];
            called_ids = [];
            currPattern = pattern;
            doneCallback = done;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function () {
                    if (n_called_on_error !== called_ids.length) {
                        not_halted_on_error = true;
                    }
                    checkIfDone();
                });
                currDomain.enter();
            }

            try {
                handlePattern(pattern);
            } catch (e) {}

            expect(called_ids.length).to.be(0);
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
var R = RECURSIVE; // token for recursions

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
