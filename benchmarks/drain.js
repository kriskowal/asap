var benchmark = require("./scaffold");
var asap = require("../asap");

benchmark.time("Drain", function (done) {
    var pending = 100;

    for (var i = 0; i < 100; ++i) {
        asap(function () {
            --pending;
            if (pending === 0) {
                done();
            }
        });
    }
});
