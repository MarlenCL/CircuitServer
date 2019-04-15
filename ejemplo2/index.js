"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const electron = require("electron");
const authenticator_1 = require("./authenticator");
const { app, BrowserWindow} = require('electron')
const ipc = require('electron').ipcMain ;

function init() {

    const authenticator = new authenticator_1.Authenticator();
        let mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: false
            }
        });
        
        // mainWindow.webContents.send.send('logIn');
        mainWindow.loadURL(`file://${__dirname}/index.html`)
        electron.ipcMain.send('logIn');

        authenticator.initIPCWatchers(mainWindow);
        authenticator.logi();

    
}
electron.app.on('ready', () => init());
