"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including network IO events in Node.js and
// animation, reflow, and redraw events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Not every browser supports `push` on arrays.
    queue[queue.length] = task;
}

var queue = [];
var flushing = false;
var requestFlush;
var index = 0;
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        if (index > capacity) {
            queue.splice(0, capacity);
            index -= capacity;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
var BrowserMutationObserver = window.MutationObserver || window.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
if (typeof BrowserMutationObserver === "function") {
    // Modern browsers
    // Android 4-4.3
    // Chrome 26-34
    // Firefox 14-29
    // Internet Explorer 11
    // iPad Safari 6-7.1
    // iPhone Safari 7-7.1
    // Safari 6-7
    requestFlush = makeRequestFlushFromMutationObserver();
} else if (
    typeof importScripts === "function" &&
    typeof MessageChannel === "function"
) {
    // Mutation observers are not available in web workers since there is no
    // DOM in that context. Message ports are guaranteed to be available, but
    // don't always work reliably in Safari or Internet Explorer 10.
    // However, if message ports don't work reliably for you, the worker is
    // going to have trouble communicating, so we take a calculated risk and
    // use the message channel to emit high priority events.
    requestFlush = makeRequestFlushFromMessageChannel();
} else if (typeof setImmediate === "function") {
    // Internet Explorer 10 is the only browser that has setImmediate but does
    // not have MutationObservers. We use `setImmediate` in IE 10 for both
    // windows and workers.
    requestFlush = makeRequestFlushFromSetImmediate();
} else {
    // Erstwhile engines
    // Firefox 3-13
    // Internet Explorer 6-9
    // iPad Safari 4.3
    // Lynx 2.8.7
    requestFlush = makeRequestFlushFromSetTimeout();
}

// Requests that the high priority event queue be flushed as soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

function makeRequestFlushFromMutationObserver() {
    var toggle = 1;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestFlush() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// However, MessageChannel is the only known high priority event queue
// available in web workers, and exists in every browser that implements web
// workers. If message channels don't work in web workers, even in Safari,
// your program will have bigger problems than ASAP.

function makeRequestFlushFromMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function requestFlush() {
        channel.port2.postMessage(0);
    };
}

// Internet Explorer 10 does not support `MutationObserver`, but does support
// `setImmediate`. However, there is a bug in Internet Explorer 10. It is not
// sufficient to assign `setImmediate` to `requestFlush` because `setImmediate`
// must be called *by name* and therefore must be wrapped in a closure.

function makeRequestFlushFromSetImmediate() {
    return function requestFlush() {
        setImmediate(flush);
    };
}

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// We elected not to add a "scroll" event listener to force a flush.

function makeRequestFlushFromSetTimeout() {
    return function requestFlush() {
        setTimeout(flush, 0);
    };
}

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

