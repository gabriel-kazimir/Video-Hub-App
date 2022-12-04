"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShortcutsService = void 0;
var core_1 = require("@angular/core");
var ShortcutsService = /** @class */ (function () {
    function ShortcutsService() {
        this.regularShortcuts = [
            'compactView',
            'darkMode',
            'hideSidebar',
            'makeLarger',
            'makeSmaller',
            'showClips',
            'showDetails',
            'showDetails2',
            'showFiles',
            'showFilmstrip',
            'showFullView',
            'showMoreInfo',
            'showThumbnails',
            'shuffleGalleryNow',
        ];
        // the mapping used in `home.component` in `handleKeyboardEvent`
        this.keyToActionMap = new Map([
            ['1', 'showThumbnails'],
            ['2', 'showFilmstrip'],
            ['3', 'showFullView'],
            ['4', 'showDetails'],
            ['5', 'showDetails2'],
            ['6', 'showFiles'],
            ['7', 'showClips'],
            ['b', 'hideSidebar'],
            ['d', 'darkMode'],
            ['f', 'focusOnFile'],
            ['g', 'focusOnMagic'],
            ['i', 'showMoreInfo'],
            ['k', 'toggleMinimalMode'],
            ['l', 'compactView'],
            ['n', 'startWizard'],
            ['o', 'toggleSettings'],
            ['q', 'quit'],
            ['r', 'fuzzySearch'],
            ['s', 'shuffleGalleryNow'],
            ['t', 'showAutoTags'],
            ['w', 'quit'],
            ['x', 'makeLarger'],
            ['y', 'showTagTray'],
            ['z', 'makeSmaller'],
        ]);
        // used in template to show key-shortcut connection (excludes quit: `q` and `w`)
        this.actionToKeyMap = new Map([
            ['compactView', 'l'],
            ['darkMode', 'd'],
            ['focusOnFile', 'f'],
            ['focusOnMagic', 'g'],
            ['fuzzySearch', 'r'],
            ['hideSidebar', 'b'],
            ['makeLarger', 'x'],
            ['makeSmaller', 'z'],
            ['showAutoTags', 't'],
            ['showClips', '7'],
            ['showDetails', '4'],
            ['showDetails2', '5'],
            ['showFiles', '6'],
            ['showFilmstrip', '2'],
            ['showFullView', '3'],
            ['showMoreInfo', 'i'],
            ['showTagTray', 'y'],
            ['showThumbnails', '1'],
            ['shuffleGalleryNow', 's'],
            ['startWizard', 'n'],
            ['toggleMinimalMode', 'k'],
            ['toggleSettings', 'o'],
            // quit -> q
            // quit -> w
        ]);
    }
    /**
     * Restore user's preferred keys
     * @param keyToAction
     */
    ShortcutsService.prototype.initializeFromSaved = function (keyToAction) {
        this.actionToKeyMap.clear();
        this.keyToActionMap.clear();
        for (var _i = 0, _a = Object.entries(keyToAction); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            this.actionToKeyMap.set(value, key);
            this.keyToActionMap.set(key, value);
        }
    };
    /**
     * Create new key binding
     * removes old key binding too
     */
    ShortcutsService.prototype.setNewKeyBinding = function (key, action) {
        if (!key.match(/^[0-9a-z]/)) { // only allow alphanumeric
            return;
        }
        if (key === 'w' || key === 'q') { // prevent system changing default close shortcut
            return;
        }
        var oldKey = this.actionToKeyMap.get(action);
        var oldAction = this.keyToActionMap.get(key);
        this.keyToActionMap.set(key, action);
        this.actionToKeyMap.set(action, key);
        this.keyToActionMap.delete(oldKey);
        this.actionToKeyMap.delete(oldAction);
    };
    ShortcutsService = __decorate([
        (0, core_1.Injectable)({
            providedIn: 'root'
        })
    ], ShortcutsService);
    return ShortcutsService;
}());
exports.ShortcutsService = ShortcutsService;
//# sourceMappingURL=shortcuts.service.js.map