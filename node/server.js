"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpIpcForServer = void 0;
var main_globals_1 = require("./main-globals");
var path = require("path");
var express = require('express');
// const bodyParser = require('body-parser'); ----------------------------- disabled
var WebSocket = require('ws');
var args = process.argv.slice(1);
var serve = args.some(function (val) { return val === '--serve'; });
// =================================================================================================
var remoteAppPath = serve
    ? path.join(__dirname, 'remote/')
    : path.join(process.resourcesPath, 'remote/');
// Electron ^^^^^^^ extends `process` with `resourcesPath`
// https://www.electronjs.org/docs/api/process#processresourcespath-readonly
var serverRef; // reference to express server
var wss; // reference to Web Socket Server
var currentHubImageElements;
var EXPRESS_PORT = 3000;
var WSS_PORT = 8080;
// =================================================================================================
function setUpIpcForServer(ipc) {
    ipc.on('latest-gallery-view', function (event, data) {
        console.log('last message');
        if (wss) {
            console.log('WSS EXISTS !!');
            wss.clients.forEach(function each(client) {
                console.log(client.readyState);
                if (client.readyState === WebSocket.OPEN) {
                    console.log('sending');
                    client.send(JSON.stringify({
                        type: 'gallery',
                        data: data
                    }));
                }
            });
        }
    });
    ipc.on('start-server', function (event, data, pathToServe, port, remoteSettings) {
        currentHubImageElements = data;
        startTheServer(pathToServe, port || EXPRESS_PORT);
        logIp(port || EXPRESS_PORT);
        startSockets(WSS_PORT, remoteSettings);
    });
    ipc.on('stop-server', function (event) {
        stopTheServers();
    });
}
exports.setUpIpcForServer = setUpIpcForServer;
/**
 * Start the Express server
 * @param pathToServe - full path to folder with all images
 * @param port - port to use
 */
function startTheServer(pathToServe, port) {
    var app = express();
    // app.use(bodyParser.json()); // to handle JSON POST requests ------ disabled
    //  GET endpoint to respond with the full `ImageElement[]`
    // ------------------------------------------------------------------ disabled
    // app.get('/hub', (req, res) => {
    //   res.send(currentHubImageElements);
    // });
    //  POST endpoint to ask VHA to play a video from some starting point
    // ------------------------------------------------------------------ disabled
    // app.post('/open', (req, res) => {
    //   GLOBALS.angularApp.sender.send('remote-open-video', req.body);
    //   res.end();
    // });
    // Serve the Angular VHA remote control app
    app.use(express.static(remoteAppPath));
    // Serve all the images from the hub
    app.use('/images', express.static(pathToServe));
    console.log('Serving:', remoteAppPath);
    serverRef = app.listen(port, function () { return console.log('VHA server listening on port', port); });
}
/**
 * Start the socket server
 * @param port - the port to use
 */
function startSockets(port, remoteSettings) {
    wss = new WebSocket.Server({ port: port });
    wss.on('connection', function connection(ws) {
        ws.on('message', socketMessageHandler);
        ws.send(JSON.stringify({
            type: 'settings',
            data: remoteSettings
        }));
    });
}
/**
 * Handler for all the incoming socket messages
 */
var socketMessageHandler = function (message) {
    // all messages are strings from JSON.stringify(data as SocketMessage)
    console.log('received message');
    try {
        var parsed = JSON.parse(message);
        if (parsed.type === 'refresh-request') {
            main_globals_1.GLOBALS.angularApp.sender.send('remote-send-new-data');
        }
        else if (parsed.type === 'open-file') {
            main_globals_1.GLOBALS.angularApp.sender.send('remote-open-video', parsed.data);
        }
        else if (parsed.type === 'save-settings') {
            main_globals_1.GLOBALS.angularApp.sender.send('remote-save-settings', parsed.data);
        }
    }
    catch (_a) {
        console.log('ERROR: message was not JSON encoded');
    }
};
/**
 * Shut down the Express and WebSocket servers
 */
function stopTheServers() {
    if (serverRef && typeof serverRef.close === 'function') {
        serverRef.close();
        console.log('closed Express server');
    }
    if (wss && typeof wss.close === 'function') {
        wss.close();
        console.log('closed Socket server');
    }
}
var _a = require('os'), networkInterfaces = _a.networkInterfaces, hostname = _a.hostname;
var ip = require('ip');
/**
 * Log the user's IP
 */
function logIp(port) {
    var nets = networkInterfaces();
    var results = {};
    // Thank you for the solution: https://stackoverflow.com/a/8440736/5017391
    for (var _i = 0, _a = Object.keys(nets); _i < _a.length; _i++) {
        var name_1 = _a[_i];
        for (var _b = 0, _c = nets[name_1]; _b < _c.length; _b++) {
            var net = _c[_b];
            // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name_1]) {
                    results[name_1] = [];
                }
                results[name_1].push(net.address);
            }
        }
    }
    console.log(results);
    var wifi = '';
    if (results['Wi-Fi']) { // PC shows up this way
        wifi = results['Wi-Fi'][0];
    }
    else if (results['en0']) { // Mac shows up this way
        wifi = results['en0'][0]; // will likely be incorrect if Mac is also connected via ethernet
    }
    else {
        wifi = ip.address(); // this grabs the first IP which may be ethernet
    }
    console.log('host name:', hostname());
    console.log('ip:', wifi);
    main_globals_1.GLOBALS.angularApp.sender.send('remote-ip-address', wifi, hostname(), port);
}
//# sourceMappingURL=server.js.map