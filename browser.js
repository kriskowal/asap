"use strict";

var rawAsap = require("./raw");
var freeTasks = [];

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
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
    rawAsap(task);
}

function RawTask() {
    this.task = null;
}

RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        // In a web browser, exceptions are not fatal. However, to avoid
        // slowing down the queue of pending tasks, we rethrow the error in a
        // lower priority turn.
        setTimeout(function () {
            throw error;
        }, 0);
    } finally {
        this.task = null;
        freeTasks.push(this);
    }
};

