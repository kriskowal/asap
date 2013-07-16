
"use strict";

if (typeof asap === "undefined") {
    var asap = require("../asap");
    var expect = require("expect.js");
    var mocha = require("mocha");
    var domain = require("domain");
}


var MAX_TASKS = 4000;
var RECURSION_TAG = {};

var expectedOrder = [];
var calledOrder = [];
var nCalledOnError = 0;
var doneCallback;
var currDomain;
var currPattern;

function error() {
    nCalledOnError = calledOrder.length;
    throw new Error();
}

afterEach(function () {
    if (currDomain) {
        currDomain.exit();
        currDomain = null;
    }
});

function queueTask(sub_pattern) {
    var index = expectedOrder.length;
    if (index >= MAX_TASKS) return;
    var top_pattern = currPattern;

    expectedOrder.push(index);

    asap(function () {
        if (top_pattern === currPattern) {
            calledOrder.push(index);
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
                nCalledOnError = -1;
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
    if (doneCallback && calledOrder.length >= expectedOrder.length) {
        expect(calledOrder).to.eql(expectedOrder);
        //console.log(calledOrder.length);
        var done = doneCallback;
        doneCallback = void 0;
        done();
    }
}

function runCase(desc) {
    var pattern = [].slice.call(arguments, 1);

    describe(desc+": ", function () {

        var notHaltedOnError = false;

        it("should run tasks in order", function (done) {
            expectedOrder = [];
            calledOrder = [];
            currPattern = pattern;
            doneCallback = done;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function () {
                    if (nCalledOnError !== calledOrder.length) {
                        notHaltedOnError = true;
                    }
                    checkIfDone();
                });
                currDomain.enter();
            }

            try {
                handlePattern(pattern);
            } catch (e) {}

            expect(calledOrder.length).to.be(0);
        });

        if (domain) {
            it("should halt flushing until exceptions are not handled", function () {
                expect(notHaltedOnError).to.be(false);
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

if (domain) {
    describe("disposed domains", function () {
        it("shouldn't run tasks bound to disposed domains", function (done) {
            var d = domain.create();

            asap(d.bind(function () {
                expect(true).to.be(false);
            }));

            d.dispose();

            asap(done);
        });
    });
}
