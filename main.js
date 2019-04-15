'use strict';

const { app, BrowserWindow } = require('electron')

var http = require('http');
var express = require('express');
var Session = require('express-session');
var request = require('request');
var config = require('./config.json');
var randomstring = require('randomstring');
const Circuit = require('circuit-sdk');

// Circuit REST API is in beta and only available on the sandbox at this time
const CircuitDomain = 'https://' + config.circuit.domain;

// Domain and port this app is running at
const AppDomain = config.app.host;
const AppPort = config.app.port;

// OAuth2 configuration
const ClientId = config.circuit.client_id;
const ClientSecret = config.circuit.client_secret;
const RedirectUri = `${AppDomain}:${AppPort}/oauthCallback`;

//const Scopes = 'READ_USER_PROFILE,READ_CONVERSATIONS';
const Scopes = 'ALL';   // Funciona

// const Scopes = 'READ_USER_PROFILE'; // No funcionan
// const Scopes = 'WRITE_USER_PROFILE';
// const Scopes = 'READ_CONVERSATIONS';
// const Scopes = 'WRITE_CONVERSATIONS';
// const Scopes = 'READ_USER';
// const Scopes = 'CALLS';

const client = new Circuit.Client({
    client_id: config.circuit.client_id,
    domain: 'circuitsandbox.net'
});

function auth(req, res, next) {
  req.session.isAuthenticated ? next() : res.redirect('/');
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  // Create the browser window.

  // and load the index.html of the app.

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  mainWindow = new BrowserWindow({});
  mainWindow.loadURL(`file://${__dirname}/index.html`)
  const ses = mainWindow.webContents.session
  console.log(ses.getUserAgent())

});


// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})