var Benchmark = require("benchmark");

var suite = new Benchmark.Suite({
    onCycle: function (event) {
        console.log("" + event.target);
    }
});

function addTimer(s, f) {
    suite.add(s, function (deferred) {
        f(function () {
            deferred.resolve();
        });
    }, {
        defer: true
    });
}

function time(s, f) {
    // This is to make sure that the function doesn't
    // have any errors before benchmarking it
    f(function () {});

    addTimer(s, f);
}

function run() {
    suite.run();
}

exports.time = time;
exports.run = run;
