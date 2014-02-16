"use strict";

/**
 * Use the fastest means possible to execute a task in its own turn, with
 * priority over other events including network IO events in Node.js and
 * animation, reflow, and redraw events in browsers.
 *
 * An exception thrown by a task will interfere with the execution of all
 * further tasks. Either handle exceptions in tasks, or make use of the fully
 * cooked `asap` based on this raw `rawAsap`.
 */
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    queue.push(task);
}

/*
 * The deque is a circular buffer with good locality of reference and
 * aggregated memory allocation and never releasing garbage. We use
 * this data structure because we need:
 * 1. Fast length checks, as opposed to a linked list.
 * 2. It avoids modulus operations by using capacities that are powers of two,
 * as opposed to circular buffers that allocate arbitrary capacities.
 * 3. While other data structures are better suited for multi-threaded situations,
 * in JavaScript, this will never be a concern.
 */

// 1024 = initial capacity
var queue = [];
var flushing = false;
var requestFlush = void 0;
var hasSetImmediate = typeof setImmediate === "function";
// Note that some fake-Node.js environments, like the Mocha test runner
// introduce a `process` global. We use `toString` to ascertain that
// the `process` object is provided by Node.js.
var isNodeJS = (
    typeof process === "object" &&
    ({}).toString.call(process) === "[object process]"
);
var BrowserMutationObserver;
if (typeof MutationObserver !== "undefined") {
    BrowserMutationObserver = MutationObserver;
}
if (typeof WebKitMutationObserver !== "undefined") {
    BrowserMutationObserver = WebKitMutationObserver;
}

var index = 0;
function flush() {
    /* jshint loopfunc: true */
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// Select a flush request technique
if (hasSetImmediate) {
    // In IE10, or https://github.com/NobleJS/setImmediate
    // or Node.js if it exists, to avoid tick recursion
    requestFlush = function () {
        setImmediate(flush);
    };
} else if (isNodeJS) {
    // Node.js
    requestFlush = function () {
        process.nextTick(flush);
    };
} else if (BrowserMutationObserver) {
    // Modern browsers
    requestFlush = makeRequestFlushFromMutationObserver();
} else {
    // Erstwhile engines
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

/**
 * Requests that the high priority event queue be flushed as soon as possible.
 * This is useful to prevent an error thrown in a task from stalling the event
 * queue if the exception handled by Node.js’s
 * `process.on("uncaughtException")` or by a domain.
 */
rawAsap.requestFlush = requestFlush;

function makeRequestFlushFromMutationObserver() {
    var toggle = 1;
    var observe = new BrowserMutationObserver(flush);
    var node = document.createTextNode("");
    return function requestFlush() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// A technique using MessageChannel has been abandoned. There is a narrow
// window of browsers that support before mutation observers were available and
// after message channels became availabe. However, within that window, Mobile
// Internet Explorer had issues with the approach.
// https://github.com/cujojs/when/issues/197
//
// Also, Safari 6.0.5 would intermittently fail to create a message port on a
// page's first load, so we had to use a back up plan in that case, racing
// setTimeout and the message to flush.
// Also, Opera required a message payload, so a closure was absolutely
// necessary.
//
// However, for posterity, this module came to be in response to Malte Ubl’s
// discovery of the message channel trick for shimming nextTick
// http://www.nonblocking.io/2011/06/windownexttick.html

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to abandom MessageChannel and to
// capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

