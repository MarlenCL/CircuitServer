'use strict';
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
//https://circuit.github.io/oauth.html#authorization_code
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


var app = express();
app.use(Session({
    secret: 'secret-6525474832',
    resave: true,
    saveUninitialized: true
}));

function auth(req, res, next) {
    req.session.isAuthenticated ? next() : res.redirect('/');
}

app.get('/profile', auth, (req, res) => {
    request.get(`${CircuitDomain}/rest/v2/users/profile`, {
        'auth': { 'bearer': req.session.access_token }
    }, (err, httpResponse, body) => {
        res.send(body)
    }
    );
});

app.get('/test', auth, (req, res) => {

    client.logon({ accessToken: req.session.access_token })
        .then(user => {
            console.log('Logged on as ' + user.displayName)
        });
    request.get(`${CircuitDomain}/rest/v2/users/profile`, {
        'auth': { 'bearer': req.session.access_token }
    }, (err, httpResponse, body) => {
        var userId = body.substring(body.indexOf("userId\":") + 9, body.indexOf("\",\"userType\":"));
        client.addEventListener('itemAdded', evt => {
            console.log('evt:', evt)

            console.log('CreatorId:', evt.item.creatorId)
            console.log('UserId:', userId)
            if (evt.item.creatorId !== userId) {
                if (evt.item.type === "TEXT") {
                    console.log('Item added:', evt.item.text.content)
                }
            } else {
                if (evt.item.text.content == "#Temperatura") {
                    console.log("#Temperatura");
                    return new Promise(function (resolve, reject) {
                        client.updateTextItem(evt.item.itemId, evt.item.text.content + ' 24.5');
                    });

                }
                console.log("YO");
            }

        });
        client.addEventListener('itemUpdated', evt => {
            if (evt.item.type === "TEXT") {
                console.log('Item Updated:', evt.item.text.content)
            }
        });
    });
});

app.get('/conversations', auth, (req, res) => {
    request.get(`${CircuitDomain}/rest/v2/conversations`, {
        'auth': { 'bearer': req.session.access_token }
    }, (err, httpResponse, body) => {
    });
});


app.use('/oauthCallback', (req, res) => {
    if (req.query.code && req.session.oauthState === req.query.state) {
        request.post({
            url: `${CircuitDomain}/oauth/token`,
            form: {
                client_id: ClientId,
                client_secret: ClientSecret,
                redirect_uri: RedirectUri,
                grant_type: 'authorization_code',
                code: req.query.code
            }
        }, (err, httpResponse, body) => {
            if (!err && body) {
                req.session.access_token = JSON.parse(body).access_token;
                req.session.isAuthenticated = true;
                res.redirect('/');
            } else {
                res.send(401);
            }
        });
    } else {
        // Access denied
        res.redirect('/');
    }
});

app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.send(`
            <a href='/profile'>Get my profile</a>
            <br><a href='/conversations'>Get my conversations</a>
            <br><a href='/test'>Get test</a>
            <br><a href='/logout'>Logout</a>
        `);
    } else {
        let redirectUri = encodeURIComponent(RedirectUri);
        let state = randomstring.generate(12);
        let url = `${CircuitDomain}/oauth/authorize?scope=${Scopes}&state=${state}&redirect_uri=${redirectUri}&response_type=code&client_id=${ClientId}`;
        // Save state in session and check later to prevent CSRF attacks
        req.session.oauthState = state;
        res.send(`<a href=${url}>Login to Circuit</a>`);
    }
});

var server = http.createServer(app);
server.listen(AppPort);
server.on('listening', () => console.log(`listening on http://localhost:${AppPort}`));
