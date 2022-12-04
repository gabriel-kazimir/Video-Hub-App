"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppState = exports.DefaultImagesPerRow = void 0;
exports.DefaultImagesPerRow = {
    thumbnailSheet: 5,
    showThumbnails: 5,
    showFilmstrip: 5,
    showFullView: 5,
    showDetails: 4,
    showDetails2: 4,
    showClips: 4,
};
exports.AppState = {
    addtionalExtensions: '',
    currentSort: 'default',
    currentVhaFile: '',
    currentView: 'showThumbnails',
    currentZoomLevel: 1,
    hubName: '',
    imgsPerRow: exports.DefaultImagesPerRow,
    language: 'en',
    menuHidden: false,
    numOfFolders: 0,
    port: 3000,
    preferredVideoPlayer: '',
    selectedOutputFolder: '',
    sortTagsByFrequency: false,
    videoPlayerArgs: '',
};
//# sourceMappingURL=app-state.js.map