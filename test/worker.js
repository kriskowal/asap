
if (typeof Worker !== "undefined") {
    var worker = new Worker("./worker.js");
    worker.onmessage = function (event) {
        window.global_test_results = event.data;
    };
} else {
    window.global_test_results = {};
}

