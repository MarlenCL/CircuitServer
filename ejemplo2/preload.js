"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const rxjs_1 = require("rxjs");
window._logIn = window._logIn || {};
window._$accessToken = window._$accessToken || new rxjs_1.Subject();
process.once('loaded', () => {
    window._$accessToken = new rxjs_1.Subject();
    electron_1.ipcRenderer.on('tokenReceived', (event, token) => {
        window._$accessToken.next(token);
    });
    window._logIn = () => {
        electron_1.ipcRenderer.send('logIn');
    };
});
