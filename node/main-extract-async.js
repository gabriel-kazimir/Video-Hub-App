"use strict";
// async & chokidar Code written by Cal2195
// Was originally added to `main-extract.ts` but was moved here for clarity
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
exports.preventSleep = exports.removeThumbnailsNotInHub = exports.extractAnyMissingThumbs = exports.startWatcher = exports.closeWatcher = exports.resetWatchers = exports.startFileSystemWatching = exports.metadataQueueRunner = exports.resetAllQueues = void 0;
var powerSaveBlocker = require('electron').powerSaveBlocker;
var async = require('async');
var chokidar = require('chokidar');
var path = require("path");
var fs = require('fs');
var fdir_1 = require("fdir");
var main_globals_1 = require("./main-globals");
var main_filenames_1 = require("./main-filenames");
var main_extract_1 = require("./main-extract");
var main_support_1 = require("./main-support");
// ONLY FOR LOGGING
var performance = require('perf_hooks').performance;
// =====================================================================================================================
// The three queues will be `QueueObject` - https://caolan.github.io/async/v3/docs.html#QueueObject
// meta queue
var metadataQueue; // QueueObject - accepts a `.push(TempMetadataQueueObject)`
var metaDone = 0;
var metaExtractionStartTime = 0;
// thumb queue
var thumbQueue; // QueueObject
var thumbsDone = 0;
var thumbExtractionStartTime = 0;
// delete queue
var deleteThumbQueue; // QueueObject
var numberOfThumbsDeleted = 0;
// =====================================================================================================================
// Create maps where the value = 1 always.
// It is faster to check if key exists than searching through an array.
var alreadyInAngular = new Map(); // full paths to videos we have metadata for in Angular
// These two are together:
var watcherMap = new Map();
var allFoundFilesMap = new Map();
// both these numbers     ^^^^^^ match up - they refer to the same `inputSource`
// =====================================================================================================================
// Miscellaneous
var preventSleepIds = []; // prevent and allow sleep
// =====================================================================================================================
resetAllQueues();
/**
 * Reset all three queues:
 *  - Meta queue
 *  - Thumb queue
 *  - Delet queue
 */
function resetAllQueues() {
    allowSleep();
    // kill all previeous
    if (thumbQueue && typeof thumbQueue.kill === 'function') {
        thumbQueue.kill();
    }
    if (metadataQueue && typeof metadataQueue.kill === 'function') {
        metadataQueue.kill();
    }
    if (deleteThumbQueue && typeof deleteThumbQueue.kill === 'function') {
        deleteThumbQueue.kill();
    }
    // Meta queue ========================================================================================================
    metaDone = 0;
    metaExtractionStartTime = 0;
    metadataQueue = async.queue(metadataQueueRunner, 1); // 1 is the number of parallel worker functions
    // ^--- experiment with numbers to see what is fastest (try 8)
    metadataQueue.drain(function () {
        thumbQueue.resume();
        logPerformance('META QUEUE took ', metaExtractionStartTime);
    });
    // Thumbs queue ======================================================================================================
    thumbsDone = 0;
    thumbExtractionStartTime = 0;
    thumbQueue = async.queue(thumbQueueRunner, 1); // 1 is the number of threads
    thumbQueue.drain(function () {
        logPerformance('THUMB QUEUE took ', thumbExtractionStartTime);
        thumbsDone = 0;
        (0, main_support_1.sendCurrentProgress)(1, 1, 'done');
        console.log('thumbnail extraction complete!');
        allowSleep();
    });
    // Delete queue ======================================================================================================
    deleteThumbQueue = async.queue(deleteThumbQueueRunner, 1);
    deleteThumbQueue.drain(function () {
        console.log('all screenshots now deleted');
        main_globals_1.GLOBALS.angularApp.sender.send('number-of-screenshots-deleted', numberOfThumbsDeleted);
    });
}
exports.resetAllQueues = resetAllQueues;
/**
 * Extraction queue runner
 * Runs for every element in the `thumbQueue`
 * @param element -- ImageElement to extract screenshots for
 * @param done    -- callback to indicate the current extraction finished
 */
function thumbQueueRunner(element, done) {
    var screenshotOutputFolder = path.join(main_globals_1.GLOBALS.selectedOutputFolder, 'vha-' + main_globals_1.GLOBALS.hubName);
    var shouldExtractClips = main_globals_1.GLOBALS.screenshotSettings.clipSnippets > 0;
    hasAllThumbs(element.hash, screenshotOutputFolder, shouldExtractClips)
        .then(function () {
        done();
    })
        .catch(function () {
        (0, main_support_1.sendCurrentProgress)(// TODO check whether sending data off by 1
        thumbsDone, thumbsDone + thumbQueue.length() + 1, 'importingScreenshots');
        thumbsDone++;
        (0, main_extract_1.extractAll)(element, main_globals_1.GLOBALS.selectedSourceFolders[element.inputSource].path, screenshotOutputFolder, main_globals_1.GLOBALS.screenshotSettings, done);
    });
}
/**
 * Send element back to Angular; if any screenshots missing, queue it for extraction
 * @param imageElement
 */
function sendNewVideoMetadata(imageElement) {
    alreadyInAngular.set(imageElement.fullPath, 1);
    delete imageElement.fullPath; // downgrade to `ImageElement` from `ImageElementPlus`
    var elementForAngular = (0, main_support_1.insertTemporaryFieldsSingle)(imageElement);
    main_globals_1.GLOBALS.angularApp.sender.send('new-video-meta', elementForAngular);
    if (thumbExtractionStartTime === 0) {
        thumbExtractionStartTime = performance.now();
    }
    thumbQueue.push(imageElement);
}
/**
 * Create empty element, extract and update metadata, send over to Angular
 * @param fileInfo - various stat metadata about the file
 * @param done
 */
function metadataQueueRunner(file, done) {
    if (metaExtractionStartTime === 0) {
        metaExtractionStartTime = performance.now();
    }
    if (main_globals_1.GLOBALS.demo && alreadyInAngular.size >= 50) {
        console.log(' - DEMO LIMIT REACHED - CANCELING SCAN !!!');
        (0, main_support_1.sendCurrentProgress)(50, 50, 'done');
        metadataQueue.kill();
        thumbQueue.resume();
        return;
    }
    (0, main_support_1.sendCurrentProgress)(metaDone, metaDone + metadataQueue.length() + 1, 'importingMeta');
    metaDone++;
    (0, main_support_1.extractMetadataAsync)(file.fullPath, main_globals_1.GLOBALS.screenshotSettings)
        .then(function (imageElement) {
        imageElement.cleanName = (0, main_support_1.cleanUpFileName)(file.name);
        imageElement.fileName = file.name;
        imageElement.fullPath = file.fullPath; // insert this converting `ImageElement` to `ImageElementPlus`
        imageElement.inputSource = file.inputSource;
        imageElement.partialPath = file.partialPath;
        sendNewVideoMetadata(imageElement);
        done();
    }, function () {
        done(); // error, just continue
    });
}
exports.metadataQueueRunner = metadataQueueRunner;
/**
 * Use `fdir` to quickly generate file list and add it to `metadataQueue`
 * @param inputDir    -- full path to the input folder
 * @param inputSource -- the number corresponding to the `inputSource` in ImageElement -- must be set!
 */
function superFastSystemScan(inputDir, inputSource) {
    main_globals_1.GLOBALS.angularApp.sender.send('started-watching-this-dir', inputSource);
    metadataQueue.pause();
    thumbQueue.pause();
    var crawler = new fdir_1.fdir()
        .exclude(function (dir) { return dir.startsWith('vha-'); }) // .exclude `dir` is the folder name, not full path
        .withFullPaths()
        .crawl(inputDir);
    var t0 = performance.now(); // LOGGING
    crawler.withPromise().then(function (files) {
        // LOGGING =====================================================================================
        logPerformance('scan took ', t0);
        console.log('Found ', files.length, ' files in given directory');
        // =============================================================================================
        var allAcceptableFiles = __spreadArray(__spreadArray([], main_filenames_1.acceptableFiles, true), main_globals_1.GLOBALS.additionalExtensions, true);
        files.forEach(function (fullPath) {
            var parsed = path.parse(fullPath);
            if (!allAcceptableFiles.includes(parsed.ext.substr(1).toLowerCase())) {
                return;
            }
            if (!allFoundFilesMap.has(inputSource)) {
                allFoundFilesMap.set(inputSource, new Map());
            }
            allFoundFilesMap.get(inputSource).set(fullPath, 1);
            if (alreadyInAngular.has(fullPath)) {
                return;
            }
            var partial = path.relative(inputDir, parsed.dir).replace(/\\/g, '/');
            var newItem = {
                fullPath: fullPath,
                inputSource: inputSource,
                name: parsed.base,
                partialPath: '/' + partial,
            };
            metadataQueue.push(newItem);
        });
        main_globals_1.GLOBALS.angularApp.sender.send('all-files-found-in-dir', inputSource, allFoundFilesMap.get(inputSource));
        metadataQueue.resume();
    });
}
/**
 * Create a new `chokidar` watcher for a particular directory
 * @param inputDir    -- full path to input folder
 * @param inputSource -- the number corresponding to the `inputSource` in ImageElement -- must be set!
 * @param persistent  -- whether to continue watching after the initial scan
 */
function startFileSystemWatching(inputDir, inputSource, persistent) {
    // only run `chokidar` if `persistent`
    if (!persistent) {
        superFastSystemScan(inputDir, inputSource);
        return;
    }
    var t0 = performance.now();
    console.log('================================================================');
    console.log('SHOULD ONLY RUN ON PERSISTENT SCAN !!!');
    console.log('starting watcher ', inputSource, typeof (inputSource), inputDir);
    main_globals_1.GLOBALS.angularApp.sender.send('started-watching-this-dir', inputSource);
    // WARNING - there are other ways to have a network address that are not accounted here !!!
    var isNetworkAddress = inputDir.startsWith('//')
        || inputDir.startsWith('\\\\');
    var watcherConfig = {
        cwd: inputDir,
        disableGlobbing: true,
        ignored: 'vha-*',
        persistent: true,
        usePolling: isNetworkAddress ? true : false,
    };
    var watcher = chokidar.watch(inputDir, watcherConfig);
    var allAcceptableFiles = __spreadArray(__spreadArray([], main_filenames_1.acceptableFiles, true), main_globals_1.GLOBALS.additionalExtensions, true);
    metadataQueue.pause();
    thumbQueue.pause();
    watcher
        .on('add', function (filePath) {
        var ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase();
        if (!allAcceptableFiles.includes(ext)) {
            return;
        }
        var subPath = ('/' + filePath.replace(/\\/g, '/')).replace('//', '/');
        var partialPath = subPath.substring(0, subPath.lastIndexOf('/'));
        var fileName = subPath.substring(subPath.lastIndexOf('/') + 1);
        var fullPath = path.join(inputDir, partialPath, fileName);
        if (!allFoundFilesMap.has(inputSource)) {
            allFoundFilesMap.set(inputSource, new Map());
        }
        allFoundFilesMap.get(inputSource).set(fullPath, 1);
        if (alreadyInAngular.has(fullPath)) {
            return;
        }
        var newItem = {
            fullPath: fullPath,
            inputSource: inputSource,
            name: fileName,
            partialPath: partialPath,
        };
        metadataQueue.push(newItem);
    })
        .on('unlink', function (partialFilePath) {
        console.log(' !!! FILE DELETED, updating Angular:', partialFilePath);
        main_globals_1.GLOBALS.angularApp.sender.send('single-file-deleted', inputSource, partialFilePath);
        // remove element from `alreadyInAngular`
        var basePath = main_globals_1.GLOBALS.selectedSourceFolders[inputSource].path;
        alreadyInAngular.delete(path.join(basePath, partialFilePath));
        // note: there is no need to watch for `unlinkDir` since `unlink` fires for every file anyway!
    })
        .on('ready', function () {
        console.log('Finished scanning', inputSource);
        metadataQueue.resume();
        main_globals_1.GLOBALS.angularApp.sender.send('all-files-found-in-dir', inputSource, allFoundFilesMap.get(inputSource));
        if (persistent) {
            console.log('^^^^^^^^ - CONTINUING to watch this directory!');
        }
        else {
            console.log('^^^^^^^^ - stopping watching this directory');
            watcher.close(); // chokidar seems to disregard `persistent` when `fsevents` is not enabled
        }
        logPerformance('Chokidar took ', t0);
    });
    watcherMap.set(inputSource, watcher);
}
exports.startFileSystemWatching = startFileSystemWatching;
/**
 * Close out all the wathers
 * reset the alreadyInAngular
 * @param finalArray
 */
function resetWatchers(finalArray) {
    // close every old watcher
    Array.from(watcherMap.keys()).forEach(function (key) {
        closeWatcher(key);
    });
    alreadyInAngular = new Map();
    allFoundFilesMap = new Map();
    finalArray.forEach(function (element) {
        var fullPath = path.join(main_globals_1.GLOBALS.selectedSourceFolders[element.inputSource].path, element.partialPath, element.fileName);
        alreadyInAngular.set(fullPath, 1);
    });
}
exports.resetWatchers = resetWatchers;
/**
 * Close the old watcher
 * happens when opening a new hub (or user toggles the `watch` near folder)
 * @param inputSource
 */
function closeWatcher(inputSource) {
    console.log('stop watching', inputSource);
    if (watcherMap.has(inputSource)) {
        console.log('closing ', inputSource);
        watcherMap.get(inputSource).close().then(function () {
            console.log(inputSource, ' closed!');
            // do nothing
        });
    }
}
exports.closeWatcher = closeWatcher;
/**
 * Start old watcher
 * happens when user toggles the `watch` near folder
 * @param inputSource
 * @param folderPath
 */
function startWatcher(inputSource, folderPath, persistent) {
    console.log('start watching !!!!', inputSource, typeof (inputSource), folderPath, persistent);
    main_globals_1.GLOBALS.selectedSourceFolders[inputSource] = {
        path: folderPath,
        watch: persistent,
    };
    preventSleep();
    startFileSystemWatching(folderPath, inputSource, persistent);
}
exports.startWatcher = startWatcher;
/**
 * Check if thumbnail, flimstrip, and clip is present
 * return boolean
 * @param fileHash           - unique identifier of the file
 * @param screenshotFolder   - path to where thumbnails are
 * @param shouldExtractClips - whether or not to extract clips
 */
function hasAllThumbs(fileHash, screenshotFolder, shouldExtractClips) {
    return new Promise(function (resolve, reject) {
        var thumb = path.join(screenshotFolder, '/thumbnails/', fileHash + '.jpg');
        var filmstrip = path.join(screenshotFolder, '/filmstrips/', fileHash + '.jpg');
        var clip = path.join(screenshotFolder, '/clips/', fileHash + '.mp4');
        var clipThumb = path.join(screenshotFolder, '/clips/', fileHash + '.jpg');
        Promise.all([
            fs.promises.access(thumb, fs.constants.F_OK),
            fs.promises.access(filmstrip, fs.constants.F_OK),
            shouldExtractClips
                ? fs.promises.access(clip, fs.constants.F_OK)
                : 'ok',
            shouldExtractClips
                ? fs.promises.access(clipThumb, fs.constants.F_OK)
                : 'ok'
        ])
            .then(function () {
            resolve(true);
        })
            .catch(function () {
            reject();
        });
    });
}
/**
 * Send all `imageElements` to the `thumbQueue`
 * @param fullArray          - ImageElement array
 */
function extractAnyMissingThumbs(fullArray) {
    preventSleep();
    fullArray.forEach(function (element) {
        thumbQueue.push(element);
    });
}
exports.extractAnyMissingThumbs = extractAnyMissingThumbs;
/**
 * !!! WARNING !!! THIS FUNCTION WILL DELETE STUFF !!!
 *
 * Scan the provided directory and delete any file not in `hashesPresent`
 * @param hashesPresent
 * @param directory
 */
function removeThumbnailsNotInHub(hashesPresent, directory) {
    deleteThumbQueue.pause();
    numberOfThumbsDeleted = 0;
    var crawler = new fdir_1.fdir()
        .withFullPaths()
        .filter(function (file) {
        var it = file.toLowerCase();
        return it.endsWith('.jpg') || it.endsWith('.mp4');
    })
        .crawl(directory);
    crawler.withPromise().then(function (files) {
        files.forEach(function (file) {
            var parsedPath = path.parse(file);
            var fileNameHash = parsedPath.name;
            if (!hashesPresent.has(fileNameHash)) {
                deleteThumbQueue.push(file);
                numberOfThumbsDeleted++;
            }
        });
        if (numberOfThumbsDeleted === 0) {
            main_globals_1.GLOBALS.angularApp.sender.send('number-of-screenshots-deleted', 0);
        }
        else {
            deleteThumbQueue.resume(); // else only send message after the delete queue is finished
        }
    });
}
exports.removeThumbnailsNotInHub = removeThumbnailsNotInHub;
function deleteThumbQueueRunner(pathToFile, done) {
    console.log('deleting:', pathToFile);
    fs.unlink(pathToFile, function (err) {
        done();
    });
}
/**
 * Prevent PC from going to sleep during screenshot extraction
 */
function preventSleep() {
    console.log('preventing sleep');
    preventSleepIds.push(powerSaveBlocker.start('prevent-app-suspension'));
}
exports.preventSleep = preventSleep;
/**
 * Allow PC to go to sleep after screenshots were extracted
 */
function allowSleep() {
    console.log('allowing sleep');
    if (preventSleepIds.length) {
        preventSleepIds.forEach(function (id) {
            powerSaveBlocker.stop(id);
        });
    }
    preventSleepIds = [];
}
function logPerformance(message, initial) {
    console.log(message + Math.round((performance.now() - initial) / 100) / 10 + ' seconds.');
}
//# sourceMappingURL=main-extract-async.js.map