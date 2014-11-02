
// Not every browser has a console
if (typeof console === "undefined") {
    console = {
        log: function () {}
    };
}

var tests = [];
var currentTest;
var passed = 0;
var failed = 0;

// Test declaration is synchronous.
setTimeout(run, 0);

function run() {
    var index = 0;
    next();
    function next(error) {
        if (error) {
            done(error);
        } else if (index === tests.length) {
            done(null);
        } else {
            tests[index++].run(next);
        }
    }
    function done(error) {
        if (error) {
            throw error;
        }
        console.log(passed + " passed");
        console.log(failed + " failed");
        global.global_test_results = {
            passed: !failed
        };
        if (global.postMessage) {
            if (typeof window !== "undefined") {
                global.postMessage(failed ? "failed" : "passed", "*");
            } else {
                global.postMessage(failed ? "failed" : "passed");
            }
        }
        if (typeof process !== "undefined") {
            process.exit(failed ? -1 : 0);
        }
    }
}

global.it = it;
function it(name, callback) {
    tests.push(new Test(name, callback));
};

global.expect = expect;
function expect(value) {
    return new Expectation(value, currentTest);
}

function Test(name, callback) {
    this.name = name;
    this.callback = callback;
    this.failed = false;
}

Test.prototype.run = function (done) {
    var self = this;
    console.log("> " +  this.name);
    currentTest = this;
    this.callback(function (error) {
        if (error) {
            done(error);
        }
        if (self.failed) {
            failed++;
        } else {
            passed++;
        }
        done();
    });
};

function Expectation(value, test) {
    this.value = value;
    this.test = test;
}

Expectation.prototype.toBe = function (value) {
    var ok = this.value === value;
    if (!ok) {
        this.test.failed = true;
        console.log("Expected " + this.value + " to be " + value);
    }
};

Expectation.prototype.toEqual = function (value) {
    var ok = equals(this.value, value);
    if (!ok) {
        this.test.failed = true;
        console.log("Expected", this.value, "to equal", value);
    }
};

function equals(a, b) {
    if (isArray(a)) {
        if (!isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (var index = 0; index < a.length; index++) {
            if (!equals(a[index], b[index])) {
                return false;
            }
        }
        return true;
    } else {
        return a === b;
    }
}

function isArray(object) {
    return typeof object === "object" && Object.prototype.toString.call(object) === "[object Array]";
}

