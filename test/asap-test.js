
require("./scaffold");

var asap = require("../asap");
var rawAsap = require("../raw");
var domain = require("./domain");

var MAX_RECURSION = 10;
var WAIT_FOR_NORMAL_CASE = 100;
var WAIT_FOR_ERRORS = 100;

if (typeof process === "undefined" && typeof window === "undefined") {
    // give web workers a chance
    WAIT_FOR_NORMAL_CASE = 1000;
    WAIT_FOR_ERRORS = 1000;
}

describeAsap("rawAsap", rawAsap);
describeAsap("asap", asap);

function describeAsap(name, asap) {

    it(name + " calls task in a future turn", function (done) {
        var called = false;
        asap(function () {
            called = true;
            done();
        });
        expect(called).toBe(false);
    });

    it(name + " calls task.call method in a future turn", function (done) {
        var called = false;
        asap({call: function (thisp) {
            called = true;
            done();
        }});
        expect(called).toBe(false);
    });

    it(name + " calls multiple tasks in order", function (done) {
        var calls = [];

        asap(function () {
            calls.push(0);
        });
        asap(function () {
            calls.push(1);
        });
        asap(function () {
            calls.push(2);
        });

        expect(calls).toEqual([]);
        setTimeout(function () {
            expect(calls).toEqual([0, 1, 2]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " calls tasks in breadth-first order", function (done) {
        var calls = [];

        asap(function () {
            calls.push(0);

            asap(function () {
                calls.push(2);

                asap(function () {
                    calls.push(5);
                });

                asap(function () {
                    calls.push(6);
                });
            });

            asap(function () {
                calls.push(3);
            });
        });

        asap(function () {
            calls.push(1);

            asap(function () {
                calls.push(4);
            });
        });

        expect(calls).toEqual([]);
        setTimeout(function () {
            expect(calls).toEqual([0, 1, 2, 3, 4, 5, 6]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " can schedule more than capacity tasks", function(done) {
        var target = 1060;
        var targetList = [];
        for (var i=0; i<target; i++) {
            targetList.push(i);
        }

        var newList = [];
        for (var i=0; i<target; i++) {
            (function(i) {
                asap(function() {
                    newList.push(i);
                });
            })(i);
        }

        setTimeout(function () {
            expect(newList).toEqual(targetList);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " can schedule more than capacity*2 tasks", function(done) {
        var target = 2060;
        var targetList = [];
        for (var i=0; i<target; i++) {
            targetList.push(i);
        }

        var newList = [];
        for (var i=0; i<target; i++) {
            (function(i) {
                asap(function() {
                    newList.push(i);
                });
            })(i);
        }

        setTimeout(function () {
            expect(newList).toEqual(targetList);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    // Recursion

    it(name + " can schedule tasks recursively", function (done) {
        var steps = [];

        asap(function () {
            steps.push(0);
            asap(function () {
                steps.push(2);
                asap(function () {
                    steps.push(4);
                });
                steps.push(3);
            });
            steps.push(1);
        });

        setTimeout(function () {
            expect(steps).toEqual([0, 1, 2, 3, 4]);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " can recurse " + MAX_RECURSION + " tasks deep", function (done) {
        var timesRecursed = 0;
        function go() {
            if (++timesRecursed < MAX_RECURSION) {
                asap(go);
            }
        }

        asap(go);

        setTimeout(function () {
            expect(timesRecursed).toBe(MAX_RECURSION);
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " can execute two branches of recursion in parallel", function (done) {
        var timesRecursed1 = 0;
        var timesRecursed2 = 0;
        var calls = [];

        function go1() {
            calls.push(timesRecursed1 * 2);
            if (++timesRecursed1 < MAX_RECURSION) {
                asap(go1);
            }
        }

        function go2() {
            calls.push(timesRecursed2 * 2 + 1);
            if (++timesRecursed2 < MAX_RECURSION) {
                asap(go2);
            }
        }

        asap(go1);
        asap(go2);

        setTimeout(function () {
            expect(calls.length).toBe(MAX_RECURSION * 2);
            for (var index = 0; index < MAX_RECURSION * 2; index++) {
                expect(calls[index]).toBe(index);
            }
            done();
        }, WAIT_FOR_NORMAL_CASE);
    });

    it(name + " does not stall with an explicit request to flush before error", function (done) {
        // TODO
        done();
    });

}

// Errors

it("asap throws errors in order", function (done) {
    var calls = [];
    var errors = [];

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(function () {
            calls.push(0);
            throw 0;
        });
        asap(function () {
            calls.push(1);
            throw 1;
        });
        asap(function () {
            calls.push(2);
            throw 2;
        });
    });

    expect(calls).toEqual([]);
    expect(errors).toEqual([]);
    setTimeout(function () {
        expect(calls).toEqual([0, 1, 2]);
        expect(errors).toEqual([0, 1, 2]);
        done();
    }, WAIT_FOR_ERRORS);
});

it("asap preserves the respective order of errors interleaved among successes", function (done) {
    var calls = [];
    var errors = [];

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(function () {
            calls.push(0);
        });
        asap(function () {
            calls.push(1);
            throw 1;
        });
        asap(function () {
            calls.push(2);
        });
        asap(function () {
            calls.push(3);
            throw 3;
        });
        asap(function () {
            calls.push(4);
            throw 4;
        });
        asap(function () {
            calls.push(5);
        });
    });

    expect(calls).toEqual([]);
    expect(errors).toEqual([]);
    setTimeout(function () {
        expect(calls).toEqual([0, 1, 2, 3, 4, 5]);
        expect(errors).toEqual([1, 3, 4]);
        done();
    }, WAIT_FOR_ERRORS);
});

it("asap executes tasks scheduled by another task that later throws an error", function (done) {
    var errors = [];

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(function () {
            asap(function () {
                throw 1;
            });

            throw 0;
        });
    });

    expect(errors).toEqual([]);
    setTimeout(function () {
        expect(errors).toEqual([0, 1]);
        done();
    }, WAIT_FOR_ERRORS);
});

it("asap executes a tree of tasks in breadth-first order when some tasks throw errors", function (done) {
    var calls = [];
    var errors = [];

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(function () {
            calls.push(0);

            asap(function () {
                calls.push(2);

                asap(function () {
                    calls.push(5);
                    throw 5;
                });

                asap(function () {
                    calls.push(6);
                });
            });

            asap(function () {
                calls.push(3);
            });

            throw 0;
        });

        asap(function () {
            calls.push(1);

            asap(function () {
                calls.push(4);
                throw 4;
            });
        });
    });

    expect(calls).toEqual([]);
    expect(errors).toEqual([]);
    setTimeout(function () {
        expect(calls).toEqual([0, 1, 2, 3, 4, 5, 6]);
        expect(errors).toEqual([0, 4, 5]);
        done();
    }, WAIT_FOR_ERRORS);
});

// Recursion and errors

it("asap rethrows task errors and preserves the order of recursive tasks", function (done) {
    var timesRecursed = 0;
    var errors = [];

    function go() {
        if (++timesRecursed < MAX_RECURSION) {
            asap(go);
            throw timesRecursed - 1;
        }
    }

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(go);
    });

    setTimeout(function () {
        expect(timesRecursed).toBe(MAX_RECURSION);
        expect(errors.length).toBe(MAX_RECURSION - 1);
        for (var index = 0; index < MAX_RECURSION - 1; index++) {
            expect(errors[index]).toBe(index);
        }
        done();
    }, WAIT_FOR_ERRORS);
});

it("asap can execute three parallel deep recursions in order, one of which throwing every task", function (done) {
    var timesRecursed1 = 0;
    var timesRecursed2 = 0;
    var timesRecursed3 = 0;
    var calls = [];
    var errors = [];

    function go1() {
        calls.push(timesRecursed1 * 3);
        if (++timesRecursed1 < MAX_RECURSION) {
            asap(go1);
        }
    }

    function go2() {
        calls.push(timesRecursed2 * 3 + 1);
        if (++timesRecursed2 < MAX_RECURSION) {
            asap(go2);
        }
    }

    function go3() {
        calls.push(timesRecursed3 * 3 + 2);
        if (++timesRecursed3 < MAX_RECURSION) {
            asap(go3);
            throw timesRecursed3 - 1;
        }
    }

    var d = domain.create();
    d.on("error", function (error) {
        errors.push(error);
    });

    d.run(function () {
        asap(go1);
        asap(go2);
        asap(go3);
    });

    setTimeout(function () {
        expect(calls.length).toBe(MAX_RECURSION * 3);
        for (var index = 0; index < MAX_RECURSION * 3; index++) {
            expect(calls[index]).toBe(index);
        }
        expect(errors.length).toBe(MAX_RECURSION - 1);
        for (var index = 0; index < MAX_RECURSION - 1; index++) {
            expect(errors[index]).toBe(index);
        }
        done();
    }, WAIT_FOR_ERRORS);
});

it("does not confuse domains when a task throws an error", function (done) {
    // TODO
    done();
});
