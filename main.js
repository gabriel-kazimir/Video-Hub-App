"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Update the `demo` and `version` when building
var main_globals_1 = require("./node/main-globals");
main_globals_1.GLOBALS.macVersion = process.platform === 'darwin';
var path = require("path");
var fs = require('fs');
var electron = require('electron');
var nativeTheme = require('electron').nativeTheme;
var electron_1 = require("electron");
var windowStateKeeper = require('electron-window-state');
// Methods
var main_touch_bar_1 = require("./node/main-touch-bar");
var server_1 = require("./node/server");
var main_ipc_1 = require("./node/main-ipc");
var main_support_1 = require("./node/main-support");
var main_extract_async_1 = require("./node/main-extract-async");
// Variables
var pathToAppData = electron_1.app.getPath('appData');
var pathToPortableApp = process.env.PORTABLE_EXECUTABLE_DIR;
main_globals_1.GLOBALS.settingsPath = pathToPortableApp ? pathToPortableApp : path.join(pathToAppData, 'video-hub-app-2');
var English = require('./i18n/en.json');
var systemMessages = English.SYSTEM; // Set English as default; update via `system-messages-updated`
var screenWidth;
var screenHeight;
// TODO: CLEAN UP
var macFirstRun = true; // detect if it's the 1st time Mac is opening the file or something like that
var userWantedToOpen = null; // find a better pattern for handling this functionality
electron.Menu.setApplicationMenu(null);
// =================================================================================================
var win;
var myWindow = null;
var args = process.argv.slice(1);
var serve = args.some(function (val) { return val === '--serve'; });
main_globals_1.GLOBALS.debug = args.some(function (val) { return val === '--debug'; });
if (main_globals_1.GLOBALS.debug) {
    console.log('Debug mode enabled!');
}
// =================================================================================================
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
// For windows -- when loading the app the first time
if (args[0]) {
    if (!serve) {
        userWantedToOpen = args[0]; // TODO -- clean up file-opening code to not use variable
    }
}
var gotTheLock = electron_1.app.requestSingleInstanceLock(); // Open file on windows from file double click
if (!gotTheLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', function (event, argv, workingDirectory) {
        // dialog.showMessageBox(win, {
        //   message: 'second-instance: \n' + argv[0] + ' \n' + argv[1],
        //   buttons: ['OK']
        // });
        if (argv.length > 1) {
            openThisDamnFile(argv[argv.length - 1]);
        }
        // Someone tried to run a second instance, we should focus our window.
        if (myWindow) {
            if (myWindow.isMinimized()) {
                myWindow.restore();
            }
            myWindow.focus();
        }
    });
}
function createWindow() {
    var desktopSize = electron_1.screen.getPrimaryDisplay().workAreaSize;
    screenWidth = desktopSize.width;
    screenHeight = desktopSize.height;
    var mainWindowState = windowStateKeeper({
        defaultWidth: 850,
        defaultHeight: 850
    });
    if (main_globals_1.GLOBALS.macVersion) {
        electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate([
            {
                label: electron_1.app.name,
                submenu: [
                    { role: 'quit' },
                    { role: 'hide' },
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'selectAll' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' }
                ]
            },
            {
                label: "View",
                submenu: [
                    { role: "togglefullscreen" },
                ]
            },
            {
                label: "Window",
                role: 'windowMenu',
            },
        ]));
    }
    // Create the browser window.
    win = new electron_1.BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            allowRunningInsecureContent: true,
            contextIsolation: false,
            webSecurity: false // allow files from hard disk to show up
        },
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        center: true,
        minWidth: 420,
        minHeight: 250,
        icon: path.join(__dirname, 'src/assets/icons/png/64x64.png'),
        frame: false // removes the frame from the window completely
    });
    mainWindowState.manage(win);
    myWindow = win;
    // Open the DevTools.
    if (serve) {
        require('electron-reload')(__dirname, {
            electron: require("".concat(__dirname, "/node_modules/electron"))
        });
        win.loadURL('http://localhost:4200');
        setTimeout(function () {
            win.webContents.openDevTools();
        }, 1000);
    }
    else {
        var url = require('url').format({
            pathname: path.join(__dirname, 'dist/index.html'),
            protocol: 'file:',
            slashes: true
        });
        win.loadURL(url);
    }
    if (main_globals_1.GLOBALS.macVersion) {
        var touchBar = (0, main_touch_bar_1.createTouchBar)();
        if (touchBar) {
            win.setTouchBar(touchBar);
        }
    }
    // Watch for computer powerMonitor
    // https://electronjs.org/docs/api/power-monitor
    electron.powerMonitor.on('shutdown', function () {
        getAngularToShutDown();
    });
    win.on('close', function (event) {
        if (main_globals_1.GLOBALS.readyToQuit) {
            electron_1.app.exit();
        }
        else {
            getAngularToShutDown();
        }
    });
    // Emitted when the window is closed.
    win.on('closed', function () {
        // Dereference the window object, usually you would store window
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
    // Does not seem to be needed to remove all the Mac taskbar menu items
    // win.setMenu(null);
}
try {
    // OPEN FILE ON MAC FROM FILE DOUBLE CLICK
    // THIS RUNS (ONLY) on MAC !!!
    electron_1.app.on('will-finish-launching', function () {
        electron_1.app.on('open-file', function (event, filePath) {
            if (filePath) {
                if (!macFirstRun) {
                    openThisDamnFile(filePath);
                }
            }
        });
    });
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    electron_1.app.on('ready', createWindow);
    // Quit when all windows are closed.
    electron_1.app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        // if (process.platform !== 'darwin') {
        electron_1.app.quit();
        // }
    });
    electron_1.app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (win === null) {
            createWindow();
        }
    });
    electron_1.app.whenReady().then(function () {
        electron_1.protocol.registerFileProtocol('file', function (request, callback) {
            var pathname = request.url.replace('file:///', '');
            callback(pathname);
        });
    });
}
catch (_a) { }
if (main_globals_1.GLOBALS.macVersion) {
    electron_1.systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', function theThemeHasChanged() {
        if (nativeTheme.shouldUseDarkColors) {
            tellElectronDarkModeChange('dark');
        }
        else {
            tellElectronDarkModeChange('light');
        }
    });
}
/**
 * Notify front-end about OS change in Dark Mode setting
 * @param mode
 */
function tellElectronDarkModeChange(mode) {
    main_globals_1.GLOBALS.angularApp.sender.send('os-dark-mode-change', mode);
}
// =================================================================================================
// Open a vha file method
// -------------------------------------------------------------------------------------------------
/**
 * Get angular to shut down immediately - saving settings and hub if needed.
 */
function getAngularToShutDown() {
    main_globals_1.GLOBALS.angularApp.sender.send('please-shut-down-ASAP');
}
/**
 * Load the .vha2 file and send it to app
 * @param pathToVhaFile full path to the .vha2 file
 */
function openThisDamnFile(pathToVhaFile) {
    (0, main_extract_async_1.resetAllQueues)();
    macFirstRun = false; // TODO - figure out how to open file when double click first time on Mac
    if (userWantedToOpen) { // TODO - clean up messy override
        pathToVhaFile = userWantedToOpen;
        userWantedToOpen = undefined;
    }
    fs.readFile(pathToVhaFile, function (err, data) {
        if (err) {
            main_globals_1.GLOBALS.angularApp.sender.send('show-msg-dialog', systemMessages.error, systemMessages.noSuchFileFound, pathToVhaFile);
            main_globals_1.GLOBALS.angularApp.sender.send('please-open-wizard');
        }
        else {
            electron_1.app.addRecentDocument(pathToVhaFile);
            var finalObject = JSON.parse(data);
            // set globals from file
            main_globals_1.GLOBALS.currentlyOpenVhaFile = pathToVhaFile;
            main_globals_1.GLOBALS.selectedOutputFolder = path.parse(pathToVhaFile).dir;
            main_globals_1.GLOBALS.hubName = finalObject.hubName;
            main_globals_1.GLOBALS.screenshotSettings = finalObject.screenshotSettings;
            (0, main_support_1.upgradeToVersion3)(finalObject);
            console.log('setting inputDirs');
            console.log(finalObject.inputDirs);
            main_globals_1.GLOBALS.selectedSourceFolders = finalObject.inputDirs;
            (0, main_support_1.sendFinalObjectToAngular)(finalObject, main_globals_1.GLOBALS);
            (0, main_support_1.setUpDirectoryWatchers)(finalObject.inputDirs, finalObject.images);
        }
    });
}
// =================================================================================================
// Listeners for events from Angular
// -------------------------------------------------------------------------------------------------
(0, main_ipc_1.setUpIpcMessages)(electron_1.ipcMain, win, pathToAppData, systemMessages);
(0, server_1.setUpIpcForServer)(electron_1.ipcMain);
/**
 * Once Angular loads it sends over the `ready` status
 * Load up the settings.json and send settings over to Angular
 */
electron_1.ipcMain.on('just-started', function (event) {
    main_globals_1.GLOBALS.angularApp = event;
    main_globals_1.GLOBALS.winRef = win;
    if (main_globals_1.GLOBALS.macVersion) {
        tellElectronDarkModeChange(electron_1.systemPreferences.getEffectiveAppearance());
    }
    // Reference: https://github.com/electron/electron/blob/master/docs/api/locales.md
    var locale = electron_1.app.getLocale();
    fs.readFile(path.join(main_globals_1.GLOBALS.settingsPath, 'settings.json'), function (err, data) {
        if (err) {
            win.setBounds({ x: 0, y: 0, width: screenWidth, height: screenHeight });
            event.sender.send('set-language-based-off-system-locale', locale);
            event.sender.send('please-open-wizard', true); // firstRun = true!
        }
        else {
            try {
                var previouslySavedSettings = JSON.parse(data);
                if (previouslySavedSettings.appState.addtionalExtensions) {
                    main_globals_1.GLOBALS.additionalExtensions = (0, main_support_1.parseAdditionalExtensions)(previouslySavedSettings.appState.addtionalExtensions);
                }
                event.sender.send('settings-returning', previouslySavedSettings, locale);
            }
            catch (err) {
                event.sender.send('please-open-wizard', false);
            }
        }
    });
});
/**
 * Start extracting the screenshots into a chosen output folder from a chosen input folder
 */
electron_1.ipcMain.on('start-the-import', function (event, wizard) {
    (0, main_extract_async_1.preventSleep)();
    var hubName = wizard.futureHubName;
    var outDir = wizard.selectedOutputFolder;
    if (fs.existsSync(path.join(outDir, hubName + '.vha2'))) { // make sure no hub name under the same name exists
        event.sender.send('show-msg-dialog', systemMessages.error, systemMessages.hubAlreadyExists, systemMessages.pleaseChangeName);
        event.sender.send('please-fix-hub-name');
    }
    else {
        if (!fs.existsSync(path.join(outDir, 'vha-' + hubName))) { // create the folder `vha-hubName` inside the output directory
            console.log('vha-hubName folder did not exist, creating');
            fs.mkdirSync(path.join(outDir, 'vha-' + hubName));
            fs.mkdirSync(path.join(outDir, 'vha-' + hubName + '/filmstrips'));
            fs.mkdirSync(path.join(outDir, 'vha-' + hubName + '/thumbnails'));
            fs.mkdirSync(path.join(outDir, 'vha-' + hubName + '/clips'));
        }
        main_globals_1.GLOBALS.hubName = hubName;
        main_globals_1.GLOBALS.selectedOutputFolder = outDir;
        main_globals_1.GLOBALS.selectedSourceFolders = wizard.selectedSourceFolder;
        main_globals_1.GLOBALS.screenshotSettings = {
            clipHeight: wizard.clipHeight,
            clipSnippetLength: wizard.clipSnippetLength,
            clipSnippets: wizard.extractClips ? wizard.clipSnippets : 0,
            fixed: wizard.isFixedNumberOfScreenshots,
            height: wizard.screenshotSizeForImport,
            n: wizard.isFixedNumberOfScreenshots ? wizard.ssConstant : wizard.ssVariable,
        };
        writeVhaFileAndStartExtraction();
    }
});
/**
 * Creates a FinalObject with known data (no ImageElement[])
 * Writes to disk, sends to Angular, starts watching directories
 */
function writeVhaFileAndStartExtraction() {
    var finalObject = {
        addTags: [],
        hubName: main_globals_1.GLOBALS.hubName,
        images: [],
        inputDirs: main_globals_1.GLOBALS.selectedSourceFolders,
        numOfFolders: 0,
        removeTags: [],
        screenshotSettings: main_globals_1.GLOBALS.screenshotSettings,
        version: main_globals_1.GLOBALS.vhaFileVersion,
    };
    var pathToTheFile = path.join(main_globals_1.GLOBALS.selectedOutputFolder, main_globals_1.GLOBALS.hubName + '.vha2');
    (0, main_support_1.writeVhaFileToDisk)(finalObject, pathToTheFile, function () {
        main_globals_1.GLOBALS.currentlyOpenVhaFile = pathToTheFile;
        (0, main_support_1.sendFinalObjectToAngular)(finalObject, main_globals_1.GLOBALS);
        (0, main_support_1.setUpDirectoryWatchers)(finalObject.inputDirs, []);
    });
}
/**
 * Summon system modal to choose the *.vha2 file
 * open via `openThisDamnFile` method
 */
electron_1.ipcMain.on('system-open-file-through-modal', function (event, somethingElse) {
    electron_1.dialog.showOpenDialog(win, {
        title: systemMessages.selectPreviousHub,
        filters: [{
                name: 'Video Hub App 2 files',
                extensions: ['vha2']
            }],
        properties: ['openFile']
    }).then(function (result) {
        var chosenFile = result.filePaths[0];
        if (chosenFile) {
            openThisDamnFile(chosenFile);
        }
    }).catch(function (err) { });
});
/**
 * Open .vha2 file (from given path)
 * save current VHA file to disk, if provided
 */
electron_1.ipcMain.on('load-this-vha-file', function (event, pathToVhaFile, finalObjectToSave) {
    if (finalObjectToSave !== null) {
        (0, main_support_1.writeVhaFileToDisk)(finalObjectToSave, main_globals_1.GLOBALS.currentlyOpenVhaFile, function () {
            console.log('.vha2 file saved before opening another');
            openThisDamnFile(pathToVhaFile);
        });
    }
    else {
        openThisDamnFile(pathToVhaFile);
    }
});
// =================================================================================================
/**
 * Interrupt current import process
 */
electron_1.ipcMain.on('cancel-current-import', function (event) {
    main_globals_1.GLOBALS.winRef.setProgressBar(-1);
    (0, main_extract_async_1.resetAllQueues)();
});
/**
 * Update additonal extensions from settings
 */
electron_1.ipcMain.on('update-additional-extensions', function (event, newAdditionalExtensions) {
    main_globals_1.GLOBALS.additionalExtensions = (0, main_support_1.parseAdditionalExtensions)(newAdditionalExtensions);
});
/**
 * Update system messaging based on new language
 */
electron_1.ipcMain.on('system-messages-updated', function (event, newSystemMessages) {
    systemMessages = newSystemMessages; // TODO -- make sure it works with `main-ipc.ts`
});
/**
 * Opens vha file while the app is running. Only works for mac OS.
 */
electron_1.ipcMain.on('open-file', function (event, pathToVhaFile) {
    event.preventDefault();
    openThisDamnFile(pathToVhaFile);
});
/**
 * Clears recent document history from the jump list
 */
electron_1.ipcMain.on('clear-recent-documents', function (event) {
    electron_1.app.clearRecentDocuments();
});
//# sourceMappingURL=main.js.map