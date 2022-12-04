"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomizeArray = void 0;
/**
 * Randomize the order of elements and return new array
 * Fisher-Yates (aka Knuth) Shuffle
 * https://stackoverflow.com/a/2450976/5017391
 * @param arr
 */
function randomizeArray(arr, currentIndex) {
    currentIndex = currentIndex ? currentIndex : 0;
    var temporaryValue;
    var randomIndex;
    var newArray = __spreadArray([], arr, true);
    // While there remain elements to shuffle...
    while (currentIndex !== arr.length) {
        // Pick a remaining element...
        randomIndex = currentIndex + Math.floor(Math.random() * (arr.length - currentIndex));
        // And swap it with the current element.
        temporaryValue = newArray[currentIndex];
        newArray[currentIndex] = newArray[randomIndex];
        newArray[randomIndex] = temporaryValue;
        currentIndex += 1;
    }
    return newArray;
}
exports.randomizeArray = randomizeArray;
//# sourceMappingURL=utility.js.map