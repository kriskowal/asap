
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
var nErrorsToHandle = 0;
var nTasksCalledTooSoon = 0;
var doneCallback;
var currDomain;
var currPattern;

function error() {
    if (currDomain) {
        nErrorsToHandle++;
    }
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
        if (top_pattern !== currPattern) {
            return;
        }

        if (nErrorsToHandle) {
            nTasksCalledTooSoon++;
        }

        calledOrder.push(index);
        handlePattern(sub_pattern);
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
    if (doneCallback && nErrorsToHandle === 0 && calledOrder.length >= expectedOrder.length) {
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

        it("should run tasks in order", function (done) {
            expectedOrder = [];
            calledOrder = [];
            nErrorsToHandle = 0;
            nTasksCalledTooSoon = 0;
            currPattern = pattern;
            doneCallback = done;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function () {
                    nErrorsToHandle--;
                    checkIfDone();
                });
                currDomain.enter();
            }

            try {
                handlePattern(pattern);
            } catch (e) {
                nErrorsToHandle--;
            }

            expect(calledOrder.length).to.be(0);
        });

        it("should halt flushing until exceptions are not handled", function () {
            expect(nTasksCalledTooSoon).to.be(0);
        });
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
    describe("asap() and domains:", function () {

        it("should bind tasks to active domain", function (done) {
            var domain0 = domain.active;
            var domain1 = domain.create();

            //expect(!!domain0).to.be(false);

            domain1.run(function () {
                asap(function () {
                   expect(domain.active).to.be(domain1);
                });
            });

            asap(function () {
                expect(domain.active).to.be(domain0);
                done();
            });
        });

        // TODO: remove in future!
        if (domain.create().dispose) {
            it("shouldn't run taskks bound to disposed domains", function (done) {
                var d = domain.create();

                asap(d.bind(function () {
                    expect(true).to.be(false);
                }));

                d.dispose();

                asap(done);
            });
        }
    });
}
