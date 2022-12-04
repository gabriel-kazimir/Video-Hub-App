"use strict";
/*
 * This whole file is meant to contain only PURE functions
 *
 * There should be no side-effects of running any of them
 * They should depend only on their inputs and behave exactly
 * the same way each time they run no matter the outside state
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpDirectoryWatchers = exports.upgradeToVersion3 = exports.insertTemporaryFieldsSingle = exports.insertTemporaryFields = exports.sendFinalObjectToAngular = exports.parseAdditionalExtensions = exports.sendCurrentProgress = exports.extractMetadataAsync = exports.cleanUpFileName = exports.createDotPlsFile = exports.writeVhaFileToDisk = exports.alphabetizeFinalArray = exports.getHtmlPath = void 0;
var main_globals_1 = require("./main-globals"); // TODO -- eliminate dependence on `GLOBALS` in this file!
var path = require("path");
var exec = require('child_process').exec;
var ffprobePath = require('@ffprobe-installer/ffprobe').path.replace('app.asar', 'app.asar.unpacked');
var fs = require('fs');
var hasher = require('crypto').createHash;
var final_object_interface_1 = require("../interfaces/final-object.interface");
var main_extract_async_1 = require("./main-extract-async");
/**
 * Return an HTML string for a path to a file
 * e.g. `C:\Some folder` becomes `C:/Some%20folder`
 * @param anyOsPath
 */
function getHtmlPath(anyOsPath) {
    // Windows was misbehaving
    // so we normalize the path (just in case) and replace all `\` with `/` in this instance
    // because at this point Electron will be showing images following the path provided
    // with the `file:///` protocol -- seems to work
    var normalizedPath = path.normalize(anyOsPath);
    var forwardSlashes = normalizedPath.replace(/\\/g, '/');
    return forwardSlashes.replace(/ /g, '%20');
}
exports.getHtmlPath = getHtmlPath;
/**
 * Label the video according to closest resolution label
 * @param width
 * @param height
 */
function labelVideo(width, height) {
    var label = '';
    var bucket = 0.5;
    if (width === 3840 && height === 2160) {
        label = '4K';
        bucket = 3.5;
    }
    else if (width === 1920 && height === 1080) {
        label = '1080';
        bucket = 2.5;
    }
    else if (width === 1280 && height === 720) {
        label = '720';
        bucket = 1.5;
    }
    else if (width > 3840) {
        label = '4K+';
        bucket = 3.5;
    }
    else if (width > 1920) {
        label = '1080+';
        bucket = 2.5;
    }
    else if (width > 1280) {
        label = '720+';
        bucket = 1.5;
    }
    return { label: label, bucket: bucket };
}
/**
 * Alphabetizes an array of `ImageElement`
 * prioritizing the folder, and then filename
 */
function alphabetizeFinalArray(imagesArray) {
    return imagesArray.sort(function (x, y) {
        var folder1 = x.partialPath.toLowerCase();
        var folder2 = y.partialPath.toLowerCase();
        var file1 = x.fileName.toLowerCase();
        var file2 = y.fileName.toLowerCase();
        if (folder1 > folder2) {
            return 1;
        }
        else if (folder1 === folder2 && file1 > file2) {
            return 1;
        }
        else if (folder1 === folder2 && file1 === file2) {
            return 0;
        }
        else if (folder1 === folder2 && file1 < file2) {
            return -1;
        }
        else if (folder1 < folder2) {
            return -1;
        }
    });
}
exports.alphabetizeFinalArray = alphabetizeFinalArray;
/**
 * Generate the file size formatted as ### MB or #.# GB
 * THIS CODE DUPLICATES THE CODE IN `file-size.pipe.ts`
 * @param fileSize
 */
function getFileSizeDisplay(sizeInBytes) {
    if (sizeInBytes) {
        var rounded = Math.round(sizeInBytes / 1000000);
        return (rounded > 999
            ? (rounded / 1000).toFixed(1) + ' GB'
            : rounded + ' MB');
    }
    else {
        return '';
    }
}
/**
 * Generate duration formatted as X:XX:XX
 * @param numOfSec
 */
function getDurationDisplay(numOfSec) {
    if (numOfSec === undefined || numOfSec === 0) {
        return '';
    }
    else {
        var hh = (Math.floor(numOfSec / 3600)).toString();
        var mm = (Math.floor(numOfSec / 60) % 60).toString();
        var ss = (Math.floor(numOfSec) % 60).toString();
        return (hh !== '0' ? hh + ':' : '')
            + (mm.length !== 2 ? '0' + mm : mm)
            + ':'
            + (ss.length !== 2 ? '0' : '') + ss;
    }
}
/**
 * Count the number of unique folders in the final array
 */
function countFoldersInFinalArray(imagesArray) {
    var finalArrayFolderMap = new Map;
    imagesArray.forEach(function (element) {
        if (!finalArrayFolderMap.has(element.partialPath)) {
            finalArrayFolderMap.set(element.partialPath, 1);
        }
    });
    return finalArrayFolderMap.size;
}
/**
 * Mark element as `deleted` (to remove as duplicate) if the previous element is identical
 * expect `alphabetizeFinalArray` to run first - so as to only compare adjacent elements
 * Unsure how duplicates can creep in to `ImageElement[]`, but at least they will be removed
 *
 *  !!! WARNING - currently does not merge the `tags` arrays (or other stuff)
 *  !!!           so tags and metadata could be lost :(
 *
 * @param imagesArray
 */
function markDuplicatesAsDeleted(imagesArray) {
    var currentElement = (0, final_object_interface_1.NewImageElement)();
    imagesArray.forEach(function (element) {
        if (element.fileName === currentElement.fileName
            && element.partialPath === currentElement.partialPath
            && element.inputSource === currentElement.inputSource) {
            element.deleted = true;
            console.log('DUPE FOUND: ' + element.fileName);
        }
        currentElement = element;
    });
    return imagesArray;
}
/**
 * Write the final object into `vha` file
 *  -- this correctly alphabetizes all the videos
 *  -- it adds the correct number of folders in final array
 * @param finalObject   -- finalObject
 * @param pathToFile    -- the path with name of `vha` file to write to disk
 * @param done          -- function to execute when done writing the file
 */
function writeVhaFileToDisk(finalObject, pathToTheFile, done) {
    finalObject.images = finalObject.images.filter(function (element) { return !element.deleted; });
    finalObject.images = stripOutTemporaryFields(finalObject.images);
    // remove any videos that have no reference (unsure how this could happen, but just in case)
    var allKeys = Object.keys(finalObject.inputDirs);
    finalObject.images = finalObject.images.filter(function (element) {
        return allKeys.includes(element.inputSource.toString());
    });
    finalObject.images = alphabetizeFinalArray(finalObject.images); // needed for `default` sort to show proper order
    finalObject.images = markDuplicatesAsDeleted(finalObject.images); // expects `alphabetizeFinalArray` to run first
    finalObject.images = finalObject.images.filter(function (element) { return !element.deleted; }); // remove any marked in above method
    finalObject.numOfFolders = countFoldersInFinalArray(finalObject.images);
    var json = JSON.stringify(finalObject);
    // backup current file
    try {
        fs.renameSync(pathToTheFile, pathToTheFile + '.bak');
    }
    catch (err) {
        console.log('Error backup up file! Moving on...');
        console.log(err);
    }
    // write the file
    fs.writeFile(pathToTheFile, json, 'utf8', done);
    // TODO ? CATCH ERRORS ?
}
exports.writeVhaFileToDisk = writeVhaFileToDisk;
/**
 * Strip out all the temporary fields
 * @param imagesArray
 */
function stripOutTemporaryFields(imagesArray) {
    imagesArray.forEach(function (element) {
        delete (element.durationDisplay);
        delete (element.fileSizeDisplay);
        delete (element.index);
        delete (element.resBucket);
        delete (element.resolution);
        delete (element.selected);
    });
    return imagesArray;
}
/**
 * Format .pls file and write to hard drive
 * @param savePath -- location to save the temp.pls file
 * @param playlist -- array of ImageElements
 * @param done     -- callback
 */
function createDotPlsFile(savePath, playlist, sourceFolderMap, done) {
    var writeArray = [];
    writeArray.push('[playlist]');
    writeArray.push('NumberOfEntries=' + playlist.length);
    for (var i = 0; i < playlist.length; i++) {
        var fullPath = path.join(sourceFolderMap[playlist[i].inputSource].path, playlist[i].partialPath, playlist[i].fileName);
        writeArray.push('File' + (i + 1) + '=' + fullPath);
        writeArray.push('Title' + (i + 1) + '=' + playlist[i].cleanName);
    }
    writeArray.push(''); // empty line at the end requested by VLC Wiki
    var singleString = writeArray.join('\n');
    fs.writeFile(savePath, singleString, 'utf8', done);
}
exports.createDotPlsFile = createDotPlsFile;
/**
 * Clean up the displayed file name
 * (1) remove extension
 * (2) replace underscores with spaces            "_"   => " "
 * (3) replace periods with spaces                "."   => " "
 * (4) replace multi-spaces with a single space   "   " => " "
 * @param original {string}
 * @return {string}
 */
function cleanUpFileName(original) {
    return original.split('.').slice(0, -1).join('.') // (1)
        .split('_').join(' ') // (2)
        .split('.').join(' ') // (3)
        .split(/\s+/).join(' '); // (4)
}
exports.cleanUpFileName = cleanUpFileName;
/**
 * Iterates ffprobe output to find stream with the best resolution (just width, for now)
 *
 * @param metadata  the ffProbe metadata object
 */
function getBestStream(metadata) {
    try {
        return metadata.streams.reduce(function (a, b) { return a.width > b.width ? a : b; });
    }
    catch (e) {
        // if metadata.streams is an empty array or something else is wrong with it
        // return an empty object so later calls to `stream.width` or `stream.height` do not throw exceptions
        return {};
    }
}
/**
 * Return the duration from file by parsing metadata
 * @param metadata
 */
function getFileDuration(metadata) {
    var _a, _b, _c;
    if ((_b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.streams) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.duration) {
        return metadata.streams[0].duration;
    }
    else if ((_c = metadata === null || metadata === void 0 ? void 0 : metadata.format) === null || _c === void 0 ? void 0 : _c.duration) {
        return metadata.format.duration;
    }
    else {
        return 0;
    }
}
//Calculation of video bitrate in mb/s
function getBitrate(fileSize, duration) {
    var bitrate = ((fileSize / 1000) / duration) / 1000;
    return Math.round(bitrate * 100) / 100;
}
/**
 * Return the average frame rate of files
 * ===========================================================================================
 *  TO SWITCH TO AVERAGE FRAME RATE,
 *  replace both instances of r_frame_rate with avg_frame_rate
 *  only in this method
 * ===========================================================================================
 * @param metadata
 */
function getFps(metadata) {
    var _a, _b;
    if ((_b = (_a = metadata === null || metadata === void 0 ? void 0 : metadata.streams) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.r_frame_rate) {
        var fps = metadata.streams[0].r_frame_rate;
        var fpsParts = fps.split('/');
        var evalFps = Number(fpsParts[0]) / Number(fpsParts[1]); // FPS is a fraction like `24000/1001`
        return Math.round(evalFps);
    }
    else {
        return 0;
    }
}
// ===========================================================================================
// Other supporting methods
// ===========================================================================================
/**
 * Compute the number of screenshots to extract for a particular video
 * @param screenshotSettings
 * @param duration - number of seconds in a video
 */
function computeNumberOfScreenshots(screenshotSettings, duration) {
    var total;
    // fixed or per minute
    if (screenshotSettings.fixed) {
        total = screenshotSettings.n;
    }
    else {
        total = Math.ceil(duration / 60 / screenshotSettings.n);
    }
    // never fewer than 3 screenshots
    if (total < 3) {
        total = 3;
    }
    // never more than would fit in a JPG
    var screenWidth = screenshotSettings.height * (16 / 9);
    if (total * screenWidth > 65535) {
        total = Math.floor(65535 / screenWidth);
    }
    // never more screenshots than seconds in a clip
    if (duration < total) {
        total = Math.max(2, Math.floor(duration));
    }
    return total;
}
/**
 * Hash a given file using its size
 * @param pathToFile  -- path to file
 * @param stats -- Stats from `fs.stat(pathToFile)`
 */
function hashFileAsync(pathToFile, stats) {
    return new Promise(function (resolve, reject) {
        var sampleSize = 16 * 1024;
        var sampleThreshold = 128 * 1024;
        var fileSize = stats.size;
        var data;
        if (fileSize < sampleThreshold) {
            fs.readFile(pathToFile, function (err, data2) {
                if (err) {
                    throw err;
                }
                // append the file size to the data
                var buf = Buffer.concat([data2, Buffer.from(fileSize.toString())]);
                // make the magic happen!
                var hash = hasher('md5').update(buf.toString('hex')).digest('hex');
                resolve(hash);
            }); // too small, just read the whole file
        }
        else {
            data = Buffer.alloc(sampleSize * 3);
            fs.open(pathToFile, 'r', function (err, fd) {
                fs.read(fd, data, 0, sampleSize, 0, function (err2, bytesRead, buffer) {
                    fs.read(fd, data, sampleSize, sampleSize, Math.floor(fileSize / 2), function (err3, bytesRead2, buffer2) {
                        fs.read(fd, data, sampleSize * 2, sampleSize, fileSize - sampleSize, function (err4, bytesRead3, buffer3) {
                            fs.close(fd, function (err5) {
                                // append the file size to the data
                                var buf = Buffer.concat([data, Buffer.from(fileSize.toString())]);
                                // make the magic happen!
                                var hash = hasher('md5').update(buf.toString('hex')).digest('hex');
                                resolve(hash);
                            });
                        });
                    });
                });
            });
        }
    });
}
/**
 * Extracts information about a single file using `ffprobe`
 * Stores information into the ImageElement and returns it via callback
 * @param filePath              path to the file
 * @param screenshotSettings    ScreenshotSettings
 * @param callback
 */
function extractMetadataAsync(filePath, screenshotSettings) {
    return new Promise(function (resolve, reject) {
        var ffprobeCommand = '"' + ffprobePath + '" -of json -show_streams -show_format -select_streams V "' + path.normalize(filePath) + '"';
        exec(ffprobeCommand, function (err, data, stderr) {
            if (err) {
                reject();
            }
            else {
                var metadata = JSON.parse(data);
                var stream = getBestStream(metadata);
                var fileDuration = getFileDuration(metadata);
                var realFps_1 = getFps(metadata);
                var duration_1 = Math.round(fileDuration) || 0;
                var origWidth_1 = stream.width || 0; // ffprobe does not detect it on some MKV streams
                var origHeight_1 = stream.height || 0;
                fs.stat(filePath, function (err2, fileStat) {
                    if (err2) {
                        reject();
                    }
                    var imageElement = (0, final_object_interface_1.NewImageElement)();
                    imageElement.birthtime = Math.round(fileStat.birthtimeMs);
                    imageElement.duration = duration_1;
                    imageElement.fileSize = fileStat.size;
                    imageElement.height = origHeight_1;
                    imageElement.mtime = Math.round(fileStat.mtimeMs);
                    imageElement.screens = computeNumberOfScreenshots(screenshotSettings, duration_1);
                    imageElement.width = origWidth_1;
                    imageElement.fps = realFps_1;
                    hashFileAsync(filePath, fileStat).then(function (hash) {
                        imageElement.hash = hash;
                        resolve(imageElement);
                    });
                });
            }
        });
    });
}
exports.extractMetadataAsync = extractMetadataAsync;
/**
 * Sends progress to Angular App
 * @param current number
 * @param total number
 * @param stage ImportStage
 */
function sendCurrentProgress(current, total, stage) {
    main_globals_1.GLOBALS.angularApp.sender.send('import-progress-update', current, total, stage);
    if (stage !== 'done') {
        main_globals_1.GLOBALS.winRef.setProgressBar(current / total);
    }
    else {
        main_globals_1.GLOBALS.winRef.setProgressBar(-1);
    }
}
exports.sendCurrentProgress = sendCurrentProgress;
/**
 * Parse additional extension string
 * @param additionalExtension string
 */
function parseAdditionalExtensions(additionalExtension) {
    return additionalExtension.split(',').map((function (token) {
        return token.trim();
    }));
}
exports.parseAdditionalExtensions = parseAdditionalExtensions;
/**
 * Send final object to Angular; uses `GLOBALS` as input!
 * @param finalObject
 * @param globals
 */
function sendFinalObjectToAngular(finalObject, globals) {
    // finalObject.images = alphabetizeFinalArray(finalObject.images); // TODO -- check -- unsure if needed
    finalObject.images = insertTemporaryFields(finalObject.images);
    globals.angularApp.sender.send('final-object-returning', finalObject, globals.currentlyOpenVhaFile, getHtmlPath(globals.selectedOutputFolder));
}
exports.sendFinalObjectToAngular = sendFinalObjectToAngular;
/**
 * Writes / overwrites:
 *   unique index for default sort
 *   video resolution string
 *   resolution category for resolution filtering
 */
function insertTemporaryFields(imagesArray) {
    imagesArray.forEach(function (element, index) {
        element = insertTemporaryFieldsSingle(element);
        element.index = index; // TODO -- rethink index -- maybe fix here ?
    });
    return imagesArray;
}
exports.insertTemporaryFields = insertTemporaryFields;
/**
 * Insert temporary fields but just for one file
 */
function insertTemporaryFieldsSingle(element) {
    // set resolution string & bucket
    var resolution = labelVideo(element.width, element.height);
    element.durationDisplay = getDurationDisplay(element.duration);
    element.fileSizeDisplay = getFileSizeDisplay(element.fileSize);
    element.bitrate = getBitrate(element.fileSize, element.duration);
    element.resBucket = resolution.bucket;
    element.resolution = resolution.label;
    return element;
}
exports.insertTemporaryFieldsSingle = insertTemporaryFieldsSingle;
/**
 * If .vha2 version 2, create `inputDirs` from `inputDir` and add `inputSource` into every element
 * Keep `inputDir` for backwards compatibility - in case user wants to come back to VHA2
 * @param finalObject
 */
function upgradeToVersion3(finalObject) {
    if (finalObject.version === 2) {
        console.log('OLD version file -- converting!');
        finalObject.inputDirs = {
            0: {
                path: finalObject.inputDir,
                watch: false
            }
        };
        finalObject.version = 3;
        finalObject.images.forEach(function (element) {
            element.inputSource = 0;
            element.screens = computeNumberOfScreenshots(finalObject.screenshotSettings, element.duration);
            // update number of screens to account for too-many or too-few cases
            // as they were not handlede prior to version 3 release
        });
    }
}
exports.upgradeToVersion3 = upgradeToVersion3;
/**
 * Only called when creating a new hub OR opening a hub
 * Notify Angular that a folder is 'connected'
 * If user wants continuous watching, watching directories with `chokidar`
 * @param inputDirs
 * @param currentImages -- if creating a new VHA file, this will be [] empty (and `watch` = false)
 */
function setUpDirectoryWatchers(inputDirs, currentImages) {
    console.log('---------------------------------');
    console.log(' SETTING UP FILE SYSTEM WATCHERS');
    console.log('---------------------------------');
    (0, main_extract_async_1.resetWatchers)(currentImages);
    Object.keys(inputDirs).forEach(function (key) {
        var pathToDir = inputDirs[key].path;
        var shouldWatch = inputDirs[key].watch;
        console.log(key, 'watch =', shouldWatch, ':', pathToDir);
        // check if directory connected
        fs.access(pathToDir, fs.constants.W_OK, function (err) {
            if (!err) {
                main_globals_1.GLOBALS.angularApp.sender.send('directory-now-connected', parseInt(key, 10), pathToDir);
                if (shouldWatch || currentImages.length === 0) {
                    // Temp logging
                    if (currentImages.length === 0) {
                        console.log('FIRST SCAN');
                    }
                    else {
                        console.log('PERSISTENT WATCHING !!!');
                    }
                    (0, main_extract_async_1.startFileSystemWatching)(pathToDir, parseInt(key, 10), shouldWatch);
                }
            }
        });
    });
}
exports.setUpDirectoryWatchers = setUpDirectoryWatchers;
//# sourceMappingURL=main-support.js.map