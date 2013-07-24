
"use strict";

// Make browserify ignore node-only modules.
var requireNodeOnly = require;

if (typeof asap === "undefined") {
    var asap = require("../asap");
    var expect = require("expect.js");
    var mocha = global.mocha || requireNodeOnly("mocha");

    // Some environments (node 0.6, browsers) do not have domains.
    try {
        var domain = requireNodeOnly("domain");
    } catch (e) {};
}

var MAX_TASKS = 4000;
var RECURSION_TAG = {};

var expectedOrder = [];
var calledOrder = [];
var nErrorsToHandle = 0;
var nTasksCalledBeforeErrorEvent = 0;
var doneCallback;
var currDomain;
var currPattern;

afterEach(function () {
    //console.log(calledOrder.length);
    expectedOrder = [];
    calledOrder = [];
    nErrorsToHandle = 0;
    nTasksCalledBeforeErrorEvent = 0;
    doneCallback = void 0;
    currDomain = void 0;
    currPattern = void 0;
    if (currDomain) {
        currDomain.exit();
        currDomain = null;
    }
});

var _asap = asap;

asap = function (task) {
    var index = expectedOrder.length;
    if (index >= MAX_TASKS) {
        return;
    }

    var topPattern = currPattern;
    expectedOrder.push(index);

    _asap(function () {
        if (topPattern !== currPattern) {
           return;
        }

        if (nErrorsToHandle) {
           ++nTasksCalledBeforeErrorEvent;
        }

        calledOrder.push(index);

        try {
            if (typeof task === "function") {
                task();
            } else {
                runPattern(task);
            }

        } catch (e) {
            if (currDomain) {
                ++nErrorsToHandle;
                throw e;
            }
        }

        maybeDone();
    });
};

function runPattern(pattern) {
    for (var i = 0; i < pattern.length; ++i) {
        var x = pattern[i];

        if (x === RECURSION_TAG) {
            runPattern(currPattern);

        } else if (typeof x === "function") {
            x();

        } else {
            asap(x);
        }
    }
}

function maybeDone() {
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
            currPattern = pattern;
            doneCallback = done;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function () {
                    nErrorsToHandle--;
                    maybeDone();
                });
                currDomain.enter();
            }

            try {
                runPattern(pattern);
            } catch (e) {}

            expect(calledOrder.length).to.be(0);

            maybeDone();
        });

        if (domain) {
            it("should halt flushing until exceptions are not handled", function () {
                expect(nTasksCalledBeforeErrorEvent).to.be(0);
            });
        }
    });
}

//______________________________________________________________________________

function error() {
    throw new Error();
}

var e = error;
var R = RECURSION_TAG;

runCase("single task", [] );
runCase("multiple tasks", [], [], [] );
runCase("multiple tasks that throws", [e], [e], [e] );
runCase("multiple mixed tasks", [], [e], [], [e], [e], [], [] );

runCase("errors at end", [[e], e], e );
//runCase("errors at end", function () {
//    asap(function () {
//        asap(error);
//        error();
//    });
//    error();
//});

runCase("recursion", [R] );
//runCase("recursion", function run() {
//    asap(run);
//});

runCase("recursion with errors", [R, e] );
//runCase("recursion", function run() {
//    asap(function () {
//        run();
//        throw new Error();
//    });
//});

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
