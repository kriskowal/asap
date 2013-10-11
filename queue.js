"use strict";

// Queue is a circular buffer with good locality of reference and doesn't
// allocate new memory unless there are more than [InitialCapacity] parallel
// tasks in which case it will resize itself generously to x8 more
// capacity. The use case of asap should require no or few
// amount of resizes during runtime.

// Calling a task frees a slot immediately so if the calling
// has a side effect of queuing itself again, it can be sustained
// without additional memory

//This solution is specifically using
//http://en.wikipedia.org/wiki/Circular_buffer#Use_a_Fill_Count
//Because:
//1. We need fast .length() operation, since queue
//  could have changed after every iteration
//2. Modulus can be negated by using power-of-two
//  capacities and replacing it with bitwise AND
//3. It will not be used in a multi-threaded situation.

var DEQUE_MAX_CAPACITY = (1 << 30) | 0;
var DEQUE_MIN_CAPACITY = 16;

function arrayCopy(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
    }
}

function pow2AtLeast(n) {
    n = n >>> 0;
    n = n - 1;
    n = n | (n >> 1);
    n = n | (n >> 2);
    n = n | (n >> 4);
    n = n | (n >> 8);
    n = n | (n >> 16);
    return n + 1;
}

function getCapacity(capacity) {
    if (typeof capacity !== "number") return DEQUE_MIN_CAPACITY;
    return pow2AtLeast(
        Math.min(
            Math.max(DEQUE_MIN_CAPACITY, capacity), DEQUE_MAX_CAPACITY)
    );
}

function Queue(capacity) {
    this._capacity = getCapacity(capacity);
    this._length = 0;
    this._front = 0;
    this._makeCapacity();
}

Queue.prototype.push = function (item) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = item;
    this._length = length + 1;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = void 0;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};


Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._makeCapacity = function () {
    var len = this._capacity;
    for (var i = 0; i < len; ++i) {
        this[i] = void 0;
    }
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(getCapacity(this._capacity * 8));
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldFront = this._front;
    var oldCapacity = this._capacity;
    var oldQueue = new Array(oldCapacity);
    var length = this.length();

    arrayCopy(this, 0, oldQueue, 0, oldCapacity);
    this._capacity = capacity;
    this._makeCapacity();
    this._front = 0;
    //Can perform direct linear copy
    if (oldFront + length <= oldCapacity) {
        arrayCopy(oldQueue, oldFront, this, 0, length);
    } else { //Cannot perform copy directly, perform as much as possible
        //at the end, and then copy the rest to the beginning of the buffer
        var lengthBeforeWrapping =
            length - ((oldFront + length) & (oldCapacity - 1));

        arrayCopy(oldQueue, oldFront, this, 0, lengthBeforeWrapping);
        arrayCopy(oldQueue, 0, this, lengthBeforeWrapping,
            length - lengthBeforeWrapping);
    }
};

module.exports = Queue;