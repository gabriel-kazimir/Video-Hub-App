"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpIpcMessages = void 0;
var electron_1 = require("electron");
var path = require("path");
var fs = require('fs');
var trash = require('trash');
var exec = require('child_process').exec;
var main_globals_1 = require("./main-globals");
var main_support_1 = require("./main-support");
var main_extract_1 = require("./main-extract");
var main_extract_async_1 = require("./main-extract-async");
/**
 * Set up the listeners
 * @param ipc
 * @param win
 * @param pathToAppData
 * @param systemMessages
 */
function setUpIpcMessages(ipc, win, pathToAppData, systemMessages) {
    var _this = this;
    /**
     * Un-Maximize the window
     */
    ipc.on('un-maximize-window', function (event) {
        if (electron_1.BrowserWindow.getFocusedWindow()) {
            electron_1.BrowserWindow.getFocusedWindow().unmaximize();
        }
    });
    /**
     * Minimize the window
     */
    ipc.on('minimize-window', function (event) {
        if (electron_1.BrowserWindow.getFocusedWindow()) {
            electron_1.BrowserWindow.getFocusedWindow().minimize();
        }
    });
    /**
     * Open the explorer to the relevant file
     */
    ipc.on('open-in-explorer', function (event, fullPath) {
        electron_1.shell.showItemInFolder(fullPath);
    });
    /**
     * Open a URL in system's default browser
     */
    ipc.on('please-open-url', function (event, urlToOpen) {
        electron_1.shell.openExternal(urlToOpen, { activate: true });
    });
    /**
     * Maximize the window
     */
    ipc.on('maximize-window', function (event) {
        if (electron_1.BrowserWindow.getFocusedWindow()) {
            electron_1.BrowserWindow.getFocusedWindow().maximize();
        }
    });
    /**
     * Open a particular video file clicked inside Angular
     */
    ipc.on('open-media-file', function (event, fullFilePath) {
        fs.access(fullFilePath, fs.constants.F_OK, function (err) {
            if (!err) {
                electron_1.shell.openPath(path.normalize(fullFilePath));
            }
            else {
                event.sender.send('file-not-found');
            }
        });
    });
    /**
     * Open a particular video file clicked inside Angular at particular timestamp
     */
    ipc.on('open-media-file-at-timestamp', function (event, executablePath, fullFilePath, args) {
        fs.access(fullFilePath, fs.constants.F_OK, function (err) {
            if (!err) {
                var cmdline = "\"".concat(path.normalize(executablePath), "\" \"").concat(path.normalize(fullFilePath), "\" ").concat(args);
                console.log(cmdline);
                exec(cmdline);
            }
            else {
                event.sender.send('file-not-found');
            }
        });
    });
    /**
     * Handle dragging a file out of VHA into a video editor (e.g. Vegas or Premiere)
     * if `imgPath` points to a file that does not exist, replace with default image
     */
    ipc.on('drag-video-out-of-electron', function (event, filePath, imgPath) {
        fs.access(imgPath, fs.constants.F_OK, function (err) {
            if (!err) {
                event.sender.startDrag({
                    file: filePath,
                    icon: imgPath,
                });
            }
            else {
                var tempIcon = electron_1.app.isPackaged ? './resources/assets/logo.png' : './src/assets/logo.png';
                event.sender.startDrag({
                    file: filePath,
                    icon: tempIcon,
                });
            }
        });
    });
    /**
     * Select default video player
     */
    ipc.on('select-default-video-player', function (event) {
        console.log('asking for default video player');
        electron_1.dialog.showOpenDialog(win, {
            title: systemMessages.selectDefaultPlayer,
            filters: [
                {
                    name: 'Executable',
                    extensions: ['exe', 'app']
                }, {
                    name: 'All files',
                    extensions: ['*']
                }
            ],
            properties: ['openFile']
        }).then(function (result) {
            var executablePath = result.filePaths[0];
            if (executablePath) {
                event.sender.send('preferred-video-player-returning', executablePath);
            }
        }).catch(function (err) { });
    });
    /**
     * Create and play the playlist
     * 1. filter out *FOLDER*
     * 2. save .pls file
     * 3. ask OS to open the .pls file
     */
    ipc.on('please-create-playlist', function (event, playlist, sourceFolderMap, execPath) {
        var cleanPlaylist = playlist.filter(function (element) {
            return element.cleanName !== '*FOLDER*';
        });
        var savePath = path.join(main_globals_1.GLOBALS.settingsPath, 'temp.pls');
        if (cleanPlaylist.length) {
            (0, main_support_1.createDotPlsFile)(savePath, cleanPlaylist, sourceFolderMap, function () {
                if (execPath) { // if `preferredVideoPlayer` is sent
                    var cmdline = "\"".concat(path.normalize(execPath), "\" \"").concat(path.normalize(savePath), "\"");
                    console.log(cmdline);
                    exec(cmdline);
                }
                else {
                    electron_1.shell.openPath(savePath);
                }
            });
        }
    });
    /**
     * Delete file from computer (send to recycling bin / trash) or dangerously delete (bypass trash)
     */
    ipc.on('delete-video-file', function (event, basePath, item, dangerousDelete) {
        var fileToDelete = path.join(basePath, item.partialPath, item.fileName);
        if (dangerousDelete) {
            fs.unlink(fileToDelete, function (err) {
                if (err) {
                    console.log('ERROR:', fileToDelete + ' was NOT deleted');
                }
                else {
                    notifyFileDeleted(event, fileToDelete, item);
                }
            });
        }
        else {
            (function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, trash(fileToDelete)];
                        case 1:
                            _a.sent();
                            notifyFileDeleted(event, fileToDelete, item);
                            return [2 /*return*/];
                    }
                });
            }); })();
        }
    });
    /**
     * Helper function for `delete-video-file`
     * @param event
     * @param fileToDelete
     * @param item
     */
    function notifyFileDeleted(event, fileToDelete, item) {
        fs.access(fileToDelete, fs.constants.F_OK, function (err) {
            if (err) {
                console.log('FILE DELETED SUCCESS !!!');
                event.sender.send('file-deleted', item);
            }
        });
    }
    /**
     * Method to replace thumbnail of a particular item
     */
    ipc.on('replace-thumbnail', function (event, pathToIncomingJpg, item) {
        var fileToReplace = path.join(main_globals_1.GLOBALS.selectedOutputFolder, 'vha-' + main_globals_1.GLOBALS.hubName, 'thumbnails', item.hash + '.jpg');
        var height = main_globals_1.GLOBALS.screenshotSettings.height;
        (0, main_extract_1.replaceThumbnailWithNewImage)(fileToReplace, pathToIncomingJpg, height)
            .then(function (success) {
            if (success) {
                event.sender.send('thumbnail-replaced');
            }
        })
            .catch(function (err) { });
    });
    /**
     * Summon system modal to choose INPUT directory
     * where all the videos are located
     */
    ipc.on('choose-input', function (event) {
        electron_1.dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(function (result) {
            var inputDirPath = result.filePaths[0];
            if (inputDirPath) {
                event.sender.send('input-folder-chosen', inputDirPath);
            }
        }).catch(function (err) { });
    });
    /**
     * Summon system modal to choose NEW input directory for a now-disconnected folder
     * where all the videos are located
     */
    ipc.on('reconnect-this-folder', function (event, inputSource) {
        electron_1.dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(function (result) {
            var inputDirPath = result.filePaths[0];
            if (inputDirPath) {
                event.sender.send('old-folder-reconnected', inputSource, inputDirPath);
            }
        }).catch(function (err) { });
    });
    /**
     * Stop watching a particular folder
     */
    ipc.on('stop-watching-folder', function (event, watchedFolderIndex) {
        console.log('stop watching:', watchedFolderIndex);
        (0, main_extract_async_1.closeWatcher)(watchedFolderIndex);
    });
    /**
     * Stop watching a particular folder
     */
    ipc.on('start-watching-folder', function (event, watchedFolderIndex, path2, persistent) {
        // annoyingly it's not a number :     ^^^^^^^^^^^^^^^^^^ -- because object keys are strings :(
        console.log('start watching:', watchedFolderIndex, path2, persistent);
        (0, main_extract_async_1.startWatcher)(parseInt(watchedFolderIndex, 10), path2, persistent);
    });
    /**
     * extract any missing thumbnails
     */
    ipc.on('add-missing-thumbnails', function (event, finalArray, extractClips) {
        (0, main_extract_async_1.extractAnyMissingThumbs)(finalArray);
    });
    /**
     * Remove any thumbnails for files no longer present in the hub
     */
    ipc.on('clean-old-thumbnails', function (event, finalArray) {
        // !!! WARNING
        var screenshotOutputFolder = path.join(main_globals_1.GLOBALS.selectedOutputFolder, 'vha-' + main_globals_1.GLOBALS.hubName);
        // !! ^^^^^^^^^^^^^^^^^^^^^^ - make sure this points to the folder with screenshots only!
        var allHashes = new Map();
        finalArray
            .filter(function (element) { return !element.deleted; })
            .forEach(function (element) {
            allHashes.set(element.hash, 1);
        });
        (0, main_extract_async_1.removeThumbnailsNotInHub)(allHashes, screenshotOutputFolder); // WARNING !!! this function will delete stuff
    });
    /**
     * Summon system modal to choose OUTPUT directory
     * where the final .vha2 file, vha-folder, and all screenshots will be saved
     */
    ipc.on('choose-output', function (event) {
        electron_1.dialog.showOpenDialog(win, {
            properties: ['openDirectory']
        }).then(function (result) {
            var outputDirPath = result.filePaths[0];
            if (outputDirPath) {
                event.sender.send('output-folder-chosen', outputDirPath);
            }
        }).catch(function (err) { });
    });
    /**
     * Try to rename the particular file
     */
    ipc.on('try-to-rename-this-file', function (event, sourceFolder, relPath, file, renameTo, index) {
        console.log('renaming file:');
        var original = path.join(sourceFolder, relPath, file);
        var newName = path.join(sourceFolder, relPath, renameTo);
        console.log(original);
        console.log(newName);
        var success = true;
        var errMsg;
        // check if already exists first
        if (fs.existsSync(newName)) {
            console.log('some file already EXISTS WITH THAT NAME !!!');
            success = false;
            errMsg = 'RIGHTCLICK.errorFileNameExists';
        }
        else {
            try {
                fs.renameSync(original, newName);
            }
            catch (err) {
                success = false;
                console.log(err);
                if (err.code === 'ENOENT') {
                    // const pathObj = path.parse(err.path);
                    // console.log(pathObj);
                    errMsg = 'RIGHTCLICK.errorFileNotFound';
                }
                else {
                    errMsg = 'RIGHTCLICK.errorSomeError';
                }
            }
        }
        event.sender.send('rename-file-response', index, success, renameTo, file, errMsg);
    });
    /**
     * Close the window / quit / exit the app
     */
    ipc.on('close-window', function (event, settingsToSave, finalObjectToSave) {
        // convert shortcuts map to object
        settingsToSave.shortcuts = Object.fromEntries(settingsToSave.shortcuts);
        var json = JSON.stringify(settingsToSave);
        try {
            fs.statSync(path.join(pathToAppData, 'video-hub-app-2'));
        }
        catch (e) {
            fs.mkdirSync(path.join(pathToAppData, 'video-hub-app-2'));
        }
        // TODO -- catch bug if user closes before selecting the output folder ?!??
        fs.writeFile(path.join(main_globals_1.GLOBALS.settingsPath, 'settings.json'), json, 'utf8', function () {
            if (finalObjectToSave !== null) {
                (0, main_support_1.writeVhaFileToDisk)(finalObjectToSave, main_globals_1.GLOBALS.currentlyOpenVhaFile, function () {
                    try {
                        main_globals_1.GLOBALS.readyToQuit = true;
                        electron_1.BrowserWindow.getFocusedWindow().close();
                    }
                    catch (_a) { }
                });
            }
            else {
                try {
                    main_globals_1.GLOBALS.readyToQuit = true;
                    electron_1.BrowserWindow.getFocusedWindow().close();
                }
                catch (_a) { }
            }
        });
    });
}
exports.setUpIpcMessages = setUpIpcMessages;
//# sourceMappingURL=main-ipc.js.map