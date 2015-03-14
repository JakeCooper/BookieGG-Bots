#!/usr/bin/env node
var fs = require('fs');
var S = require('string');

var HttpInterface = require('./http_interface');
var http = new HttpInterface();

var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');

var events = require('events');
var eventEmitter = new events.EventEmitter();

var loginTracker = 0;
var botDict = {};
var botQueue = [];

var InventoryProvider = require('./provider/inventory_provider');
var inventory_provider = new InventoryProvider();
var inventory_interface = require('./interface/inventory_interface');

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
    Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

var botMessage = function(name, message) {
    return '[' + S(name).padLeft(20) + '] ' + message;
};

var pollTrade = function (botDict, steamOfferObj, tradeID, callback) {
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
    var buildABotContext = this;
    var bot = new Steam.SteamClient();
    this.name = steamName;
    this.offerInstance = new SteamTradeOffers();
    if (fs.existsSync("./sentries/" + steamName + ".sentry")) {
        console.log(botMessage(steamName, 'Logging in'));
        bot.logOn({
            accountName: steamName,
            password: password,
            shaSentryfile: fs.readFileSync("./sentries/" + steamName + ".sentry")
        });
    } else {
        console.error(botMessage(steamName, 'Unable to log in!'));
    }

    bot.on('loggedOn', function () {
        bot.setPersonaState(Steam.EPersonaState.Online);
    });

    bot.on('webSessionID', function (sessionID) {
        bot.webLogOn(function (cookies) {
            buildABotContext.offerInstance.setup({
                sessionID: sessionID,
                webCookie: cookies
            }, function () {
                console.log(botMessage(buildABotContext.name, 'Has successfully logged in.'));
                eventEmitter.emit('logonFinished');
            })
        });
    });
};

var extractItemIds = function(items) {
    var out = [];
    for(var index in items) {
        if(items.hasOwnProperty(index))
            out.push(items[index]['id']);
    }

    return out;
};

var requestItems = function (steamOfferObj, steamID, itemIDs, userAccessToken, callback) {
    var objectArray = [];
    steamOfferObj.loadPartnerInventory({
        partnerSteamId: steamID,
        appId: 730,
        contextId: 2
    }, function (err, items) {
        var partnersItemIds = extractItemIds(items);

        if (!Array.isArray(itemIDs)) {
            itemIDs = [itemIDs];
        }
        for (var index in itemIDs) {
            if(itemIDs.hasOwnProperty(index)) {
                var itemID = itemIDs[index];

                if(partnersItemIds.indexOf(itemID) > -1) {

                    objectArray.push({
                        "appid": 730,
                        "contextid": 2,
                        "amount": 1,
                        "assetid": itemID
                    });
                } else {
                    callback({status: 'error', 'message': "Item not found in user's inventory", itemid: itemID});
                    return;
                }
            }
        }

        steamOfferObj.makeOffer({
            partnerSteamId: steamID,
            accessToken: userAccessToken,
            itemsFromMe: {},
            itemsFromThem: objectArray
        }, function (err, data) {
            if(err) console.log(err);

            if(data.hasOwnProperty('tradeofferid')) {
                callback({status: 'success', 'id': data["tradeofferid"]});
            } else {
                callback({status: 'fail', message: 'TradeOfferID not provided from trade'});
            }
        })

    });
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

    pollTrade(botDict, currentBot.offerInstance, tradeID, function (response) {
        res.send(response)
    });
});

http.get('/get_inventory', inventory_interface(inventory_provider));

// temporarily disable
http.listen(3000);