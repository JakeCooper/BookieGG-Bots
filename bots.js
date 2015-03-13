#!/usr/bin/env node
var fs = require('fs');

var HttpInterface = require('./http_interface');
var http = new HttpInterface();
var request = require('request');

var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');

var events = require('events');
var eventEmitter = new events.EventEmitter();

var loginTracker = 0;
var botDict = {};

var botQueue = [];

var itemToThem = ['469431148'];

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
    Steam.servers = JSON.parse(fs.readFileSync('servers'));
}


var pollTrade = function (steamOfferObj, tradeID, callback) {
    steamOfferObj.getOffer({
        tradeOfferId: tradeID // The tradeoffer id
    }, function (error, body) {
        console.log(body);
        console.log(error);
        if (error == null) {
            //console.log(body);
            console.log(body.response.offer.trade_offer_state);
            if (body.response.offer.trade_offer_state == 3) {
                delete botDict[tradeID]; //removes bot if trade is successful.
                callback('requestOfferAccepted');
            } else if (body.response.offer.trade_offer_state == 7) {
                delete botDict[tradeID]; //removes bot if trade is unsuccessful.
                callback('requestOfferExpired');
            } else {
                callback('requestOfferPending');

            }
        }
    });
};

var buildABot = function (steamName, password) {
    var bot = new Steam.SteamClient();
    this.botInstance = bot;
    this.name = steamName;
    var steamOffers = new SteamTradeOffers();
    this.inTrade = false;
    this.offerInstance = steamOffers;
    if (fs.existsSync("./sentries/" + steamName + ".sentry")) {
        //If there is a sentry file, use it.
        bot.logOn({
            accountName: steamName,
            password: password,
            shaSentryfile: fs.readFileSync("./sentries/" + steamName + ".sentry")
        })
    } else {
        //Probably gonna need another couple ifs here, gonna need to scrape steamguard.
        bot.logOn({
            accountName: steamName,
            password: password
        })
    }

    bot.on('loggedOn', function () {
        console.log(steamName + ' Logged in!');
        bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
    });

    bot.on('webSessionID', function (sessionID) {
        bot.webLogOn(function (cookies) {
            for (var cookie in cookies) console.log(cookies[cookie]);
            steamOffers.setup({
                sessionID: sessionID,
                webCookie: cookies
            }, function () {
                console.log("SteamOffers cookies set");
                eventEmitter.emit('logonFinished');
            })
        });
        bot.on('sentry', function (sentryHash) {
            fs.exists('sentryfile' + steamName, function (exists) {
                if (!exists) {
                    console.error("New sentryfile generated for some bot");
                } else {
                    console.log("Sentry file already exists.")
                }
            })

        });

    });
};

var requestItems = function (steamOfferObj, steamID, itemIDs, userAccessToken, callback) {
    var objectArray = [];
    steamOfferObj.loadPartnerInventory({
        partnerSteamId: steamID,
        appId: 730,
        contextId: 2
    }, function (errr, items) {
        if (!Array.isArray(itemIDs)) {
            itemIDs = [itemIDs];
        }
        for (var index in itemIDs) {
            objectArray.push({
                "appid": 730,
                "contextid": 2,
                "amount": 1,
                "assetid": itemIDs[index]
            });
        }

        steamOfferObj.makeOffer({
            partnerSteamId: steamID,
            accessToken: userAccessToken,
            itemsFromMe: {},
            itemsFromThem: objectArray
        }, function (err, data) {
            console.log(err);
            console.log(data);
            try {
                callback(data["tradeofferid"]);
            } catch (e) {
                callback("Error occured: " + e);
            }
        })

    })
};

var returnItems = function (steamOfferObj, steamID, itemIDs) {
    var objectArray = [];
    steamOfferObj.loadMyInventory({
        appId: 730,
        contextId: 2
    }, function (errr, items) {
        console.log(items);
        for (var index in itemIDs) {
            objectArray.push({
                "appid": 730,
                "contextid": 2,
                "amount": 1,
                "assetid": itemIDs[index]
            });
        }
        console.log(objectArray);
        steamOfferObj.makeOffer({
            partnerSteamId: steamID,
            itemsFromMe: objectArray,
            itemsToMe: {}
        }, function (err, data) {
            console.log(err);
            console.log(data);
            var start = Date.now();

            function getData() {
                setTimeout(getData, 10000);
                if (Date.now() - start > 300000) {
                    steamOfferObj.cancelOffer({
                        tradeOfferId: data["tradeofferid"]
                    }, function () {
                        clearTimeout(setTimer);
                        eventEmitter.emit('returnOfferExpired');
                    })

                }
                steamOfferObj.getOffer({
                    tradeOfferId: data["tradeofferid"] // The tradeoffer id
                }, function (error, body) {
                    if (error == null) {
                        console.log(body);
                        if (body.response.offer.trade_offer_state == 3) {
                            eventEmitter.emit('returnOfferAccepted');
                            clearTimeout(setTimer);
                            return "Offer Accepted"; //on accept
                        } else if (body.response.offer.trade_offer_state == 7) {
                            eventEmitter.emit('returnOfferExpired');
                            clearTimeout(setTimer);
                            return "Offer cancelled";
                        } else {

                        }
                    }
                });
            }

            getData();
        })
    })

};

//Bots sign in on logon
var logins = fs.readFileSync('bots.botfile', 'utf8').split("\n");
for (var login in logins) {
    if (!logins.hasOwnProperty(login)) {
        console.log("Could not parse login '" + login + "'");
        continue;
    }

    var userPass = logins[login].split("\t");
    console.log("Logging in " + userPass[0]);
    var botObj = new buildABot(userPass[0], userPass[1]);
    botQueue.push(botObj);
}

eventEmitter.on('logonFinished', function () {
    if (loginTracker >= logins.length - 1) {
        console.log("ALL BOTS LOGGED IN");
    } else {
        console.log("Bots still need to be logged in");
        loginTracker++;
    }
});



http.get('/', function (req, res) {
    res.statusCode = 403;
    res.send('403 - Access denied');
});

http.get('/request_items', function (req, res) {
    var steamIDtoTrade = req.query.steamID;
    var itemID = req.query.itemID;
    var userAccessToken = req.query.userAccessToken;
    //Check if Bots are online
    if (botQueue.length == 0) {
        //If there are no bots.botfile in the queue to take the order, then we can't process it.
        console.log("Sorry no bots available");
        res.send("No Bots available ATM");
        return;
    } else {
        var currentBot = botQueue.shift();
    }

    requestItems(currentBot.offerInstance, steamIDtoTrade, itemID, userAccessToken, function (response) {
        botDict[response] = currentBot;
        res.send(response); //trade request sent successfully
    });
});

http.get('/poll_trade', function (req, res) {
    var tradeID = req.query.tradeID;
    try {
        var currentBot = botDict[tradeID]; //Gotta get the related bot;
    } catch (e) {
        res.send(e);
    }

    pollTrade(currentBot.offerInstance, tradeID, function (response) {
        res.send(response)
    });
});

http.get('/return_items', function (req, res) {
    var steamIDtoTrade = req.query.steamID;
    var itemsToThem = req.query.itemIDs;
    var userAccessToken = req.query.userAccessToken;
    //Check if Bots are online
    if (botQueue.length == 0) {
        //If there are no bots in the queue to take the order, then we can't process it.
        console.log("Sorry no bots available");
        res.send("No Bots available ATM");
        return;
    } else {
        var currentBot = botQueue.shift();
    }
    returnItems(currentBot.offerInstance, steamIDtoTrade, itemToThem);
    //NEED EMAIL SCRAPAGE HERE TO CONFIRM OFFER!
    eventEmitter.on('returnOfferExpired', function () {
        console.log("return Offer has timed out");
        res.send("Return offer has timed out");
        botQueue.push(currentBot);
    });
    eventEmitter.on('returnOfferAccepted', function () {
        console.log("Return offer has completed");
        res.send("Return offer has completed");
        botQueue.push(currentBot);
    });
});

http.get('/get_inventory', function (req, res) {
    var steamID = req.query.steamID;
    //send a web request to http://www.steamcommunity.com/profiles/<NUM>/inventory
    request({
        uri: 'http://www.steamcommunity.com/profiles/' + steamID + '/inventory/json/730/2/'
    }, function (error, response, body) {
        var contentType = response.headers['content-type'];
        contentType = contentType.split(';');
        contentType = contentType[0];
        if (contentType != "application/json") {
            res.statusCode = 404;
            res.send("404 - Inventory not found");
        } else {
            res.send(body);
        }
    })
});




var server = http.listen(3000);