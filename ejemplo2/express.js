"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const config = require("./config.json");
class ExpressApp {
    constructor() {
        this.app = express();
    }
    start() {
        return new Promise(resolve => {
            this.app.get('*', (req, res) => res.send('Logging In!'));
            this.appServer = this.app.listen(config.express.port, () => {
                console.log(`\nExpress app listening on port ${config.express.port}!\n`);
                return resolve();
            });
        });
    }
    stop() {
        this.appServer.close();
    }
}
exports.ExpressApp = ExpressApp;
