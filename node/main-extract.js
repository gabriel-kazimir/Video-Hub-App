"use strict";
/**
 * This file contains all the logic for extracting:
 * first thumbnail,
 * full filmstrip,
 * the preview clip
 * the clip's first thumbnail
 *
 * All functions are PURE
 *
 * Huge thank you to cal2195 for the code contribution
 * He implemented the efficient filmstrip and clip extraction!
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceThumbnailWithNewImage = exports.extractAll = void 0;
// ========================================================================================
//          Imports
// ========================================================================================
// cool method to disable all console.log statements!
// console.log('console.log disabled in main-extract.ts');
// console.log = function() {};
// const { performance } = require('perf_hooks');  // for logging time taken during debug
var fs = require('fs');
var path = require("path");
var spawn = require('child_process').spawn;
var ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked');
var main_globals_1 = require("./main-globals");
// ========================================================================================
//          FFMPEG arg generating functions
// ========================================================================================
/**
 * Generate the ffmpeg args to extract a single frame according to settings
 * @param pathToVideo
 * @param screenshotHeight
 * @param duration
 * @param savePath
 */
var extractSingleFrameArgs = function (pathToVideo, screenshotHeight, duration, savePath) {
    var ssWidth = screenshotHeight * (16 / 9);
    var args = [
        '-ss', (duration / 10).toString(),
        '-i', pathToVideo,
        '-frames', '1',
        '-q:v', '2',
        '-vf', scaleAndPadString(ssWidth, screenshotHeight),
        savePath,
    ];
    return args;
};
/**
 * Take N screenshots of a particular file
 * at particular file size
 * save as particular fileHash
 * (if filmstrip not already present)
 *
 * @param pathToVideo          -- full path to the video file
 * @param duration             -- duration of clip
 * @param screenshotHeight     -- height of screenshot in pixels
 * @param numberOfScreenshots  -- number of screenshots to extract
 * @param savePath             -- full path to file name and extension
 */
var generateScreenshotStripArgs = function (pathToVideo, duration, screenshotHeight, numberOfScreenshots, savePath) {
    var current = 0;
    var totalCount = numberOfScreenshots;
    var step = duration / (totalCount + 1);
    var args = [];
    var allFramesFiltered = '';
    var outputFrames = '';
    // Hardcode a specific 16:9 ratio
    var ssWidth = screenshotHeight * (16 / 9);
    var fancyScaleFilter = scaleAndPadString(ssWidth, screenshotHeight);
    // make the magic filter
    while (current < totalCount) {
        var time = (current + 1) * step; // +1 so we don't pick the 0th frame
        args.push('-ss', time.toString(), '-i', pathToVideo);
        allFramesFiltered += '[' + current + ':V]' + fancyScaleFilter + '[' + current + '];';
        outputFrames += '[' + current + ']';
        current++;
    }
    args.push('-frames', '1', '-filter_complex', allFramesFiltered + outputFrames + 'hstack=inputs=' + totalCount, savePath);
    return args;
};
/**
 * Generate the mp4 preview clip of the video file
 * (if clip is not already present)
 *
 * @param pathToVideo   -- full path to the video file
 * @param duration      -- duration of the original video file
 * @param clipHeight    -- height of clip
 * @param clipSnippets  -- number of clip snippets to extract
 * @param snippetLength -- length in seconds of each snippet
 * @param savePath      -- full path to file name and extension
 */
var generatePreviewClipArgs = function (pathToVideo, duration, clipHeight, clipSnippets, snippetLength, savePath) {
    var current = 1;
    var totalCount = clipSnippets;
    var step = duration / (totalCount + 1);
    var args = [];
    var concat = '';
    // make the magic filter
    while (current <= totalCount) {
        var time = current * step;
        var preview_duration = snippetLength;
        args.push('-ss', time.toString(), '-t', preview_duration.toString(), '-i', pathToVideo);
        concat += '[' + (current - 1) + ':V]' + '[' + (current - 1) + ':a]';
        current++;
    }
    concat += 'concat=n=' + totalCount + ':v=1:a=1[v][a];[v]scale=-2:' + clipHeight + '[v2]';
    args.push('-filter_complex', concat, '-map', '[v2]', '-map', '[a]', savePath);
    // phfff glad that's over
    return args;
};
/**
 * Extract the first frame from the preview clip
 *
 * @param pathToClip -- full path to where the .mp4 clip is located
 * @param fileHash   -- full path to where the .jpg should be saved
 */
var extractFirstFrameArgs = function (pathToClip, pathToThumb) {
    var args = [
        '-ss', '0',
        '-i', pathToClip,
        '-frames', '1',
        '-f', 'image2',
        pathToThumb,
    ];
    return args;
};
// ========================================================================================
//          Extraction engine
// ========================================================================================
/**
 * Extract thumbnail, filmstrip, and possibly clip
 *
 * Extract following this order. Each stage returns a boolean
 * (^) means RESTART -- go back to (1) with the next item-to-extract on the list
 *
 * SOURCE FILE ============================
 *   (1) check if input file exists
 *         T:                           (2)
 *         F:                           (^) restart
 * THUMB ==================================
 *   (2) check thumb exists
 *         T:                           (4)
 *         F:                           (3)
 *   (3) extract the SINGLE screenshot
 *         T:                           (4)
 *         F:                           (^) restart - assume corrupt
 * FILMSTRIP ==============================
 *   (4) check filmstrip exists
 *         T:                           (6)
 *         F:                           (5)
 *   (5) extract the FILMSTRIP
 *         T: (clipSnippets === 0) ?
 *             T:   nothing to do       (^) restart
 *             F:                       (6)
 *         F:                           (^) restart - assume corrupt
 * CLIP ===================================
 *   (6) check clip exists
 *         T:                           (8)
 *         F:                           (7)
 *   (7) extract the CLIP
 *         T:                           (8)
 *         F:                           (^) restart - assume corrupt
 * CLIP THUMB =============================
 *   (8) check clip thumb exists
 *         T:                           (^) restart
 *         F:                           (9)
 *   (9) extract the CLIP preview
 *         T:                           (^) restart
 *         F:                           (^) restart
 *
 * @param currentElement     -- ImageElement to extract thumbs
 * @param videoFolderPath    -- path to base folder where videos are
 * @param screenshotFolder   -- path to folder where .jpg files will be saved
 * @param screenshotSettings -- ScreenshotSettings object
 * @param done               -- execute this method when done extracting
 */
function extractAll(currentElement, videoFolderPath, screenshotFolder, screenshotSettings, done) {
    var clipHeight = screenshotSettings.clipHeight; // -- number in px how tall each clip should be
    var clipSnippets = screenshotSettings.clipSnippets; // -- number of clip snippets to extract; 0 == do not extract clip
    var screenshotHeight = screenshotSettings.height; // -- number in px how tall each screenshot should be
    var snippetLength = screenshotSettings.clipSnippetLength; // -- length of each snippet in the clip
    var pathToVideo = path.join(videoFolderPath, currentElement.partialPath, currentElement.fileName);
    var duration = currentElement.duration;
    var fileHash = currentElement.hash;
    var numOfScreens = currentElement.screens;
    var sourceHeight = currentElement.height;
    var thumbnailSavePath = path.normalize(screenshotFolder + '/thumbnails/' + fileHash + '.jpg');
    var filmstripSavePath = path.normalize(screenshotFolder + '/filmstrips/' + fileHash + '.jpg');
    var clipSavePath = path.normalize(screenshotFolder + '/clips/' + fileHash + '.mp4');
    var clipThumbSavePath = path.normalize(screenshotFolder + '/clips/' + fileHash + '.jpg');
    var maxRunTime = setExtractionDurations(sourceHeight, numOfScreens, screenshotHeight, clipSnippets, snippetLength, clipHeight);
    checkFileExists(pathToVideo) // (1)
        .then(function (videoFileExists) {
        // console.log('01 - video file live = ' + videoFileExists);
        if (!videoFileExists) {
            throw new Error('VIDEO FILE NOT PRESENT');
        }
        else {
            return checkFileExists(thumbnailSavePath); // (2)
        }
    })
        .then(function (thumbExists) {
        // console.log('02 - thumbnail already present = ' + thumbExists);
        if (thumbExists) {
            return true;
        }
        else {
            var ffmpegArgs = extractSingleFrameArgs(pathToVideo, screenshotHeight, duration, thumbnailSavePath);
            return spawn_ffmpeg_and_run(ffmpegArgs, maxRunTime.thumb, 'thumb'); // (3)
        }
    })
        .then(function (thumbSuccess) {
        // console.log('03 - single screenshot now present = ' + thumbSuccess);
        if (!thumbSuccess) {
            throw new Error('SINGLE SCREENSHOT EXTRACTION TIMED OUT - LIKELY CORRUPT');
        }
        else {
            return checkFileExists(filmstripSavePath); // (4)
        }
    })
        .then(function (filmstripExists) {
        // console.log('04 - filmstrip already present = ' + filmstripExists);
        if (filmstripExists) {
            return true;
        }
        else {
            var ffmpegArgs = generateScreenshotStripArgs(pathToVideo, duration, screenshotHeight, numOfScreens, filmstripSavePath);
            return spawn_ffmpeg_and_run(ffmpegArgs, maxRunTime.filmstrip, 'filmstrip'); // (5)
        }
    })
        .then(function (filmstripSuccess) {
        // console.log('05 - filmstrip now present = ' + filmstripSuccess);
        if (!filmstripSuccess) {
            throw new Error('FILMSTRIP GENERATION TIMED OUT - LIKELY CORRUPT');
        }
        else if (clipSnippets === 0) {
            throw new Error('USER DOES NOT WANT CLIPS');
        }
        else {
            return checkFileExists(clipSavePath); // (6)
        }
    })
        .then(function (clipExists) {
        // console.log('04 - preview clip already present = ' + clipExists);
        if (clipExists) {
            return true;
        }
        else {
            var ffmpegArgs = generatePreviewClipArgs(pathToVideo, duration, clipHeight, clipSnippets, snippetLength, clipSavePath);
            return spawn_ffmpeg_and_run(ffmpegArgs, maxRunTime.clip, 'clip'); // (7)
        }
    })
        .then(function (clipGenerationSuccess) {
        // console.log('07 - preview clip now present = ' + clipGenerationSuccess);
        if (clipGenerationSuccess) {
            return checkFileExists(clipThumbSavePath); // (8)
        }
        else {
            throw new Error('ERROR GENERATING CLIP');
        }
    })
        .then(function (clipThumbExists) {
        // console.log('05 - preview clip thumb already present = ' + clipThumbExists);
        if (clipThumbExists) {
            return true;
        }
        else {
            var ffmpegArgs = extractFirstFrameArgs(clipSavePath, clipThumbSavePath);
            return spawn_ffmpeg_and_run(ffmpegArgs, maxRunTime.clipThumb, 'clip thumb'); // (9)
        }
    })
        .then(function (success) {
        // console.log('09 - preview clip thumb now exists = ' + success);
        if (success) {
            // console.log('======= ALL STEPS SUCCESSFUL ==========');
        }
        done();
    })
        .catch(function (err) {
        // console.log('===> ERROR - RESTARTING: ' + err);
        done();
    });
}
exports.extractAll = extractAll;
/**
 * Set the ExtractionDurations - the maximum running time per extraction type
 * if ffmpeg takes longer, it is taken out the back and shot - killed with no mercy
 *
 * These computations are not exact, they are meant meant to give a rough timeout window
 * to prevent corrupt files from slowing down the extraction too much
 *
 * @param sourceHeight - height of the original video
 * @param numOfScreens
 * @param screenshotHeight
 * @param clipSnippets
 * @param snippetLength
 * @param clipHeight
 */
function setExtractionDurations(sourceHeight, numOfScreens, screenshotHeight, clipSnippets, snippetLength, clipHeight) {
    // screenshot heights range from 144px to 504px
    // we'll call 144 the baseline and increase duration based on this
    // number of pixels grows ~ as square of height, so we square below
    // this means at highest resolution we multyply by 12.5 the time we wait
    var thumbHeightRatio = screenshotHeight / 144; // max 3.5 or 12.25 when squared
    var thumbHeightFactor = 1 + (thumbHeightRatio * thumbHeightRatio / 4); // square of ratio
    // not using Math.pow(n,2) because this is apparently faster https://stackoverflow.com/a/26594370/5017391
    var clipHeightRatio = clipHeight / 144; // max 3.5 or 12.25 when squared
    var clipHeightFactor = 1 + (clipHeightRatio * clipHeightRatio / 4); // square of ratio
    var sourceRatio = (sourceHeight === 0) ? 1 : (sourceHeight / 720); // 3 when source is 4k
    var sourceFactor = 1 + (sourceRatio * sourceRatio / 3); // square of ratio
    return {
        thumb: 500 * sourceFactor * thumbHeightFactor,
        filmstrip: 350 * sourceFactor * thumbHeightFactor * numOfScreens,
        clip: 350 * sourceFactor * clipHeightFactor * clipSnippets * snippetLength,
        clipThumb: 400 * clipHeightRatio, // never above 600ms
    };
}
/**
 * Return promise for whether file exists
 * @param pathToFile string
 */
function checkFileExists(pathToFile) {
    return new Promise(function (resolve, reject) {
        fs.access(pathToFile, fs.constants.F_OK, function (err) {
            return (resolve(!err));
        });
    });
}
/**
 * Replace original file with new file
 * use ffmpeg to convert and letterbox to fit width and height
 *
 * @param oldFile full path to thumbnail to replace
 * @param newFile full path to sounce image to use as replacement
 * @param height
 */
function replaceThumbnailWithNewImage(oldFile, newFile, height) {
    console.log('Resizing new image and replacing old thumbnail');
    var width = Math.floor(height * (16 / 9));
    var args = [
        '-y', '-i', newFile,
        '-vf', scaleAndPadString(width, height),
        oldFile,
    ];
    return spawn_ffmpeg_and_run(args, 1000, 'replacing thumbnail');
    // resizing an image file with ffmpeg should take less than 1 second
}
exports.replaceThumbnailWithNewImage = replaceThumbnailWithNewImage;
/**
 * Generate the correct `scale=` & `pad=` string for ffmpeg
 * @param width
 * @param height
 */
function scaleAndPadString(width, height) {
    // sweet thanks to StackExchange!
    // https://superuser.com/questions/547296/resizing-videos-with-ffmpeg-avconv-to-fit-into-static-sized-player
    return 'scale=w=' + width + ':h=' + height + ':force_original_aspect_ratio=decrease,' +
        'pad=' + width + ':' + height + ':(ow-iw)/2:(oh-ih)/2';
}
/**
 * Spawn ffmpeg and run the appropriate arguments
 * Kill the process after maxRunningTime
 * @param args            args to pass into ffmpeg
 * @param maxRunningTime  maximum time to run ffmpeg
 * @param description     log for console.log
 */
function spawn_ffmpeg_and_run(args, maxRunningTime, description) {
    return new Promise(function (resolve, reject) {
        // Uncomment things in this method (and the `performance` import) to check how long extraction takes
        // const t0: number = performance.now();
        var ffmpeg_process = spawn(ffmpegPath, args);
        var killProcessTimeout = setTimeout(function () {
            if (!ffmpeg_process.killed) {
                ffmpeg_process.kill();
                // console.log(description + ' KILLED EARLY');
                return resolve(false);
            }
        }, maxRunningTime);
        // Note from past Cal to future Cal:
        // ALWAYS READ THE DATA, EVEN IF YOU DO NOTHING WITH IT
        ffmpeg_process.stdout.on('data', function (data) {
            if (main_globals_1.GLOBALS.debug) {
                console.log(data);
            }
        });
        ffmpeg_process.stderr.on('data', function (data) {
            if (main_globals_1.GLOBALS.debug) {
                console.log('grep stderr: ' + data);
            }
        });
        ffmpeg_process.on('exit', function () {
            clearTimeout(killProcessTimeout);
            // const t1: number = performance.now();
            // console.log(description + ' ' + Math.round(t1 - t0) + ' < ' + maxRunningTime);
            return resolve(true);
        });
    });
}
//# sourceMappingURL=main-extract.js.map