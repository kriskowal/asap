
var ASAP = require("..");

var onerror;

function asap(task) {
	return ASAP(function () {
		if (onerror) {
			try {
				task();

			} catch (e) {
				onerror(e);
			}

		} else {
			task();
		}
	});
}

asap.setOnError = function (f) {
	if (onerror) {
		throw new Error("onerror already setted");
	}

	if (typeof f !== "function") {
		throw new TypeError("not a function");
	}

	onerror = f;
};

for (var key in ASAP) {
	asap[key] = ASAP[key];
}

module.exports = asap;
