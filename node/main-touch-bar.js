"use strict";
// Huge thank you to @ErikDvorcak for creating the entirety of the Touch Bar functionality
// see Video-Hub-App/pull/299
// This code was once in `main.ts` but was moved to keep the `main.ts` file smaller
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTouchBar = void 0;
var electron_1 = require("electron");
var ipc = require('electron').ipcMain;
var path = require("path");
var main_globals_1 = require("./main-globals");
var shared_interfaces_1 = require("../interfaces/shared-interfaces");
// TODO -- deduplicate the imports code
var codeRunningOnMac = process.platform === 'darwin';
var args = process.argv.slice(1);
var serve = args.some(function (val) { return val === '--serve'; });
// =================================================================================================
var nativeImage = require('electron').nativeImage;
var TouchBarPopover = electron_1.TouchBar.TouchBarPopover, TouchBarSegmentedControl = electron_1.TouchBar.TouchBarSegmentedControl;
var resourcePath = serve
    ? path.join(__dirname, 'src/assets/icons/mac/touch-bar/')
    : path.join(process.resourcesPath, 'assets/');
var touchBar, segmentedAnotherViewsControl, segmentedFolderControl, segmentedPopover, segmentedViewControl, zoomSegmented;
ipc.on('app-to-touchBar', function (event, changesFromApp) {
    if (codeRunningOnMac) {
        if (shared_interfaces_1.AllSupportedViews.includes(changesFromApp)) {
            segmentedViewControl.selectedIndex = shared_interfaces_1.AllSupportedViews.indexOf(changesFromApp);
        }
        else if (changesFromApp === 'showFreq') {
            segmentedFolderControl.selectedIndex = 0;
        }
        else if (changesFromApp === 'showRecent') {
            segmentedFolderControl.selectedIndex = 1;
        }
        else if (changesFromApp === 'compactView') {
            segmentedAnotherViewsControl.selectedIndex = 0;
        }
        else if (changesFromApp === 'showMoreInfo') {
            segmentedAnotherViewsControl.selectedIndex = 1;
        }
    }
});
/**
 * Void function for creating touchBar for MAC OS X
 */
function createTouchBar() {
    // recent and freq views
    segmentedFolderControl = new TouchBarSegmentedControl({
        mode: 'multiple',
        selectedIndex: -1,
        segments: [
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-cloud.png'))
                    .resize({ width: 22, height: 16 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-recent-history.png'))
                    .resize({ width: 18, height: 18 }) }
        ],
        change: function (selectedIndex) {
            if (selectedIndex === 0) {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'showFreq');
            }
            else {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'showRecent');
            }
        }
    });
    // segmentedControl for views
    segmentedViewControl = new TouchBarSegmentedControl({
        segments: [
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-thumbnails.png'))
                    .resize({ width: 15, height: 15 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-filmstrip.png'))
                    .resize({ width: 20, height: 15 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-full-view.png'))
                    .resize({ width: 15, height: 15 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-details.png'))
                    .resize({ width: 15, height: 15 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-filenames.png'))
                    .resize({ width: 15, height: 15 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-video-blank.png'))
                    .resize({ width: 15, height: 15 }) },
        ],
        change: function (selectedIndex) {
            main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', shared_interfaces_1.AllSupportedViews[selectedIndex]);
        }
    });
    // Popover button for segmentedControl
    segmentedPopover = new TouchBarPopover({
        label: 'Views',
        items: new electron_1.TouchBar({
            items: [segmentedViewControl]
        })
    });
    // Segment with compat view and show more info
    segmentedAnotherViewsControl = new TouchBarSegmentedControl({
        mode: 'multiple',
        selectedIndex: -1,
        segments: [
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-compat-view.png'))
                    .resize({ width: 16, height: 16 }) },
            { icon: nativeImage.createFromPath(path.join(resourcePath, 'icon-show-more-info.png'))
                    .resize({ width: 18, height: 20 }) },
        ],
        change: function (selectedIndex) {
            if (selectedIndex === 0) {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'compactView');
            }
            else {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'showMoreInfo');
            }
        }
    });
    // touchBar segment with zoom options
    zoomSegmented = new TouchBarSegmentedControl({
        mode: 'buttons',
        segments: [
            { label: '-' },
            { label: '+' }
        ],
        change: function (selectedIndex) {
            if (selectedIndex === 0) {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'makeSmaller');
            }
            else {
                main_globals_1.GLOBALS.angularApp.sender.send('touchBar-to-app', 'makeLarger');
            }
        }
    });
    // creating touchBar from existing items
    touchBar = new electron_1.TouchBar({
        items: [
            segmentedFolderControl,
            segmentedPopover,
            segmentedAnotherViewsControl,
            zoomSegmented
        ]
    });
    return touchBar;
}
exports.createTouchBar = createTouchBar;
//# sourceMappingURL=main-touch-bar.js.map