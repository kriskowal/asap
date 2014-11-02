
if (typeof Worker !== "undefined") {
    var worker = new Worker("./worker.js");
    worker.onmessage = function (event) {
        window.global_test_results = {passed: event.data === "passed"};
        document.body.innerHTML = event.data;
    };
} else {
    // An empty object gets transported as `null` by something in the Sauce
    // Labs stack on some older Internet Explorers.
    window.global_test_results = {support: false};
    document.body.innerHTML = "no worker support";
}

