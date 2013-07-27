
"use strict";

if (typeof asap === "undefined") {
    // Make browserify ignore node-only modules.
    var requireNodeOnly = require;

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
var ASAP = asap;
var process = global.process;

// Be sure to use the Node.js process!
if (({}).toString.call(process) !== "[object process]") {
    process = null;
}

afterEach(function () {
    asap = ASAP;
});


function ignoreError(error) {
    error._asap_ignore_this_ = true;
}

// Workaround for https://github.com/joyent/node/issues/4375 -
// "domain.on('error') should suppress other uncaughtException handlers"
if (process) (function(){
    var on = process.on;
    var removeListener = process.removeListener;

    function wrap(handler) {
        handler._asap_wrapper_ = function (er) {
            if (!er._asap_ignore_this_) {
                handler(er);
            }
        };
        return handler._asap_wrapper_;
    }

    process.on = function(type, handler) {
        if (type === "uncaughtException") {
            handler = wrap(handler);
        }

        return on.call(process, type, handler);
    };

    process.removeListener = function(type, handler) {
        return removeListener.call(process, type, handler._asap_wrapper_ || handler);
    };
})();


function runCase(desc) {
    var topPattern = [].slice.call(arguments, 1);

    describe(desc+": ", function () {

        var nTasksCalledBeforeErrorEvent = 0;

        it("should run tasks in order", function (done) {
            var expectedOrder = [];
            var calledOrder = [];
            var nErrorsToHandle = 0;
            var currDomain;
            var finished = false;

            nTasksCalledBeforeErrorEvent = 0;
            asap = tmpAsap;

            if (domain) {
                currDomain = domain.create();
                currDomain.on("error", function (er) {
                    ignoreError(er);
                    nErrorsToHandle--;
                    maybeDone();
                });
                currDomain.enter();
            }

            try {
                runPattern(topPattern);
            } catch (e) {}

            expect(calledOrder.length).to.be(0);

            maybeDone();


            function tmpAsap(task) {
                var index = expectedOrder.length;
                if (index >= MAX_TASKS) {
                    return;
                }

                expectedOrder.push(index);

                ASAP(function () {
                    if (finished) {
                        return;
                    }

                    calledOrder.push(index);

                    if (nErrorsToHandle) {
                       ++nTasksCalledBeforeErrorEvent;
                    }

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
            }

            function runPattern(pattern) {
                for (var i = 0; i < pattern.length; ++i) {
                    var x = pattern[i];

                    if (x === RECURSION_TAG) {
                        runPattern(topPattern);

                    } else if (typeof x === "function") {
                        x();

                    } else {
                        asap(x);
                    }
                }
            }

            function maybeDone() {
                if (!finished && !nErrorsToHandle &&
                    calledOrder.length >= expectedOrder.length) {

                    finished = true;
                    if (currDomain) {
                        currDomain.exit();
                    }

                    expect(calledOrder).to.eql(expectedOrder);

                    done();
                }
            }
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
//runCase("recursion with errors", function run() {
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
            it("shouldn't run tasks bound to disposed domains", function (done) {
                var d = domain.create();

                asap(d.bind(function () {
                    expect(true).to.be(false);
                }));

                d.dispose();

                asap(done);
            });

            it("shouldn't run tasks implicitly bounded to disposed domains", function (done) {
                var d = domain.create();

                d.run(function () {
                    asap(function () {
                        expect(true).to.be(false);
                    });
                });

                d.dispose();

                asap(done);
            });
        }
    });
}
