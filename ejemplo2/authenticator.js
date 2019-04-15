"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const request = require("request");
const crypto = require("crypto");
const rxjs = require("rxjs");
const express = require("./express");
const config = require("./config.json");
const authStateIdentifier = Math.random().toString(36).substring(7);
const CircuitDomain = 'https://' + config.auth.domain;

function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

const authPKCEVerifier = base64URLEncode(crypto.randomBytes(32));
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}
const authPKCEChallenge = base64URLEncode(sha256(authPKCEVerifier));
class Authenticator {
    constructor() {
        this.checkAuth();
    }
    checkAuth() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initializeAuthWindow();
            const refreshToken = null;
            if (refreshToken) {
                this.authWindow.close();
                this.expressApp.stop();
                this.refreshAccessToken(refreshToken);
            }
            else {
                this.authWindow.show();
                this.authenticate();
            }
        });
    }
    logi(){
        this.authenticate();
    }
    initIPCWatchers(mainWindow) {
        electron.ipcMain.on('login', () => {
            console.log("Sss")
            this.authenticate();
        });

        electron.ipcMain.on('refreshAccessToken', (event, refreshToken) => {
            const tokenRequestUrl = `${CircuitDomain}/oauth/token`;
            const tokenRequestBody = {
                grant_type: 'refresh_token',
                client_secret: config.auth.client_secret,
                client_id: config.auth.client_id,
                refresh_token: refreshToken,
                scope: config.auth.scope
            };
            request.post({ url: tokenRequestUrl, form: tokenRequestBody }, (err, httpResponse, body) => {
                mainWindow.webContents.send('tokenReceived', body);
            });
        });
        electron.ipcMain.on('routeToHome', () => {
            mainWindow.loadURL(`file://${__dirname}/index.html`);
        });
        electron.ipcMain.on('logout', () => {
            mainWindow.close();
        });
    }
    initializeAuthWindow() {
        return __awaiter(this, void 0, void 0, function* () {
            this.expressApp = new express.ExpressApp();
            yield this.expressApp.start();
            this.authWindow = new electron.BrowserWindow({
                show: false,
                alwaysOnTop: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            this.authWindow.loadURL(`http://${config.express.protocol}:${config.express.port}`);
            this.authWindow.on('closed', () => {
                this.authWindow = null;
            });
        });
    }
    authenticate() {
        return __awaiter(this, void 0, void 0, function* () {
            this.authWindow.loadURL(`
            ${CircuitDomain}/oauth/authorize?scope=${Scopes}&
            state=${state}&redirect_uri=${redirectUri}&
            response_type=code&client_id=${client_id}
		    `);
            this.authWindow.webContents.on('did-finish-load', () => {
                electron.session.defaultSession.webRequest.onCompleted({ urls: [`http://${config.express.protocol}:${config.express.port}/?code=` + '*'] }, details => {
                    const _url = details.url.split('?')[1];
                    const _params = new URLSearchParams(_url);
                    const _accessCode = _params.get('code');
                    const _state = _params.get('state');
                    if (_accessCode && _state === authStateIdentifier) {
                        const tokenRequestUrl =  `${CircuitDomain}/oauth/token`;
                        const tokenRequestBody = {
                            grant_type: 'authorization_code',
                            client_secret: config.auth.client_secret,
                            client_id: config.auth.client_id,
                            code: _accessCode,
                            redirect_uri: `http://${config.express.protocol}:${config.express.port}`,
                            scope: config.auth.scope,
                        };
                        request.post({ url: tokenRequestUrl, form: tokenRequestBody }, (err, httpResponse, body) => {
                            console.log(body);
                            this.authWindow.loadURL(`http://${config.express.protocol}:${config.express.port}`);
                            this.handleAccessTokenResponse(err, httpResponse, body);
                            this.authWindow.close();
                            this.expressApp.stop();
                        });
                    }
                });
            });
        });
    }
    handleAccessTokenResponse(err, httpResponse, body) {
        if (!err) {
            try {
                const response = JSON.parse(body);
                if (response.error) {
                    rxjs.throwError('Error: ' + response.error + '\nFailure during the request of the access_token\n' + response.error_description);
                }
                else {
                    this.storeRefreshToken(response.refresh_token);
                    return response;
                }
            }
            catch (_a) {
                rxjs.throwError('Could not parse and store Refresh Token.');
            }
        }
        else {
            rxjs.throwError('Error: ' + httpResponse + '\nFailure during the request of the access_token\n' + body);
        }
    }
    storeRefreshToken(token) {
        const cookie = {
            url: 'http://${config.express.protocol}:${config.express.port}',
            name: 'refresh_token',
            value: JSON.stringify(token),
            httpOnly: true,
            expirationDate: Math.floor(new Date().getTime() / 1000) + (60 * 60 * 24 * 90)
        };
        electron.session.defaultSession.cookies.set(cookie, error => error ? console.error(error) : null);
    }
    getRefreshTokenFromStorage() {
        const cookie = {
            url: 'http://${config.express.protocol}:${config.express.port}',
            name: 'refresh_token'
        };
        return new Promise(resolve => {
            electron.session.defaultSession.cookies.get(cookie, (error, refreshTokenCookie) => {
                if (error) {
                    return resolve();
                }
                else if (!refreshTokenCookie.length) {
                    return resolve();
                }
                else {
                    return resolve(JSON.parse(refreshTokenCookie[0].value));
                }
            });
        });
    }

    refreshAccessToken(refreshToken) {
        const tokenRequestUrl = `${CircuitDomain}/oauth/token`;
        const tokenRequestBody = {
            client_id: config.auth.client_id,
            client_secret: config.auth.client_secret,
            redirect_uri: RedirectUri,
            refresh_token: refreshToken,
            grant_type: 'authorization_code'
        };
        request.post({ url: tokenRequestUrl, formData: tokenRequestBody }, (err, httpResponse, body) => this.handleAccessTokenResponse(err, httpResponse, body));
    }

}

exports.Authenticator = Authenticator;
