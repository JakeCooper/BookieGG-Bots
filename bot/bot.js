var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');
var fs = require('fs');
var utils = require('../utils');

function Bot(username, password) {
    this.steamName = username;
    this.password = password;

    this.login = function(callback) {
        this.steamClient = new Steam.SteamClient();
        this.offerInstance = new SteamTradeOffers();
        if (fs.existsSync("./sentries/" + this.steamName + ".sentry")) {
            this.steamClient.logOn({
                accountName: this.steamName,
                password: this.password,
                shaSentryfile: fs.readFileSync("./sentries/" + this.steamName + ".sentry")
            });
        } else {
            console.error(utils.formatBotMessage(this.steamName, 'Unable to log in! No sentry file present!'));
        }

        this.steamClient.on('loggedOn', function(steamClient) {
            return function () {
                steamClient.setPersonaState(Steam.EPersonaState.Online);
            }
        }(this.steamClient));

        this.steamClient.on('webSessionID', function(steamClient, offerInstance) {
            return function (sessionID) {
                steamClient.webLogOn(function (cookies) {
                    offerInstance.setup({
                        sessionID: sessionID,
                        webCookie: cookies
                    }, function () {
                        callback();
                    })
                });
            }
        }(this.steamClient, this.offerInstance));
    }
}

module.exports = Bot;