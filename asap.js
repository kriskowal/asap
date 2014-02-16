"use strict";

var rawAsap = require("./raw");
var domain = require("domain");
var freeTasks = [];

/**
 * Calls a task as soon as possible after returning, in its own event, with
 * priority over IO events. An exception thrown in a task can be handled by
 * `process.on("uncaughtException") or `domain.on("error")`, but will otherwise
 * crash the process. If the error is handled, all subsequent tasks will
 * resume.
 *
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawTask.domain = domain.active;
    rawAsap(rawTask);
}

function RawTask() {
    this.task = null;
    this.domain = null;
}

RawTask.prototype.call = function () {
    if (this.domain) {
        this.domain.enter();
    }
    try {
        this.task.call();
    } catch (error) {
        if (this.domain) {
            this.domain.exit();
        }
        // In node, uncaught exceptions are considered fatal errors.
        // Re-throw them to interrupt flushing!

        // Ensure that flushing continues if an uncaught exception is
        // suppressed listening process.on("uncaughtException") or
        // domain("error").
        rawAsap.requestFlush();

        if (this.domain) {
            this.domain.enter();
        }
        throw error;
    } finally {
        if (this.domain) {
            this.domain.exit();
        }
        this.task = null;
        this.domain = null;
        freeTasks.push(this);
    }
};

