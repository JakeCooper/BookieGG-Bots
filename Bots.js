var fs = require('fs');

var request = require('request');

var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');

var express = require('express')
var http = require('http')
var app = express()

var events = require('events');
var eventEmitter = new events.EventEmitter();

var steamIDtoTrade = '76561198009923867'
var inTrade = false;
var inventory;
var loginTracker = 0;
var userAccessToken = 'u4BAUYGe';
var tradeOfferReturnable;
var botDict = {};

var botQueue = [];

var itemID = ['1775623782'];
var itemFromThem = ['1776151529', '1776151533']

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BookieBot Webserver launched at http://%s:%s', host, port)


  //Bots sign in on logon
  logins = fs.readFileSync('bots', 'utf8').split("\n");
  for(var login in logins){
    var userPass = logins[login].split("\t");
    console.log("Logging in " + userPass[0]);
    var botObj = new buildABot(userPass[0], userPass[1])
    botQueue.push(botObj);
  }
  eventEmitter.on('logonFinished', function(){
    if(loginTracker >= logins.length - 1){
      console.log("ALL BOTS LOGGED IN");
    } else {
      console.log("Bots still need to be logged in");
      loginTracker++;
    }
  });

})


// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

/*app.get('/buildBots', function(req, res){
  logins = fs.readFileSync('bots', 'utf8').split("\n");
  for(var login in logins){
    var userPass = logins[login].split("\t");
    console.log("Logging in " + userPass[0]);
    var botObj = new buildABot(userPass[0], userPass[1])
    botQueue.push(botObj);
  }
  eventEmitter.on('logonFinished', function(){
    if(loginTracker >= logins.length - 1){
      console.log("ALL BOTS LOGGED IN");
      res.send(200); //ALL BOTS LOGGED IN
    } else {
      console.log("Bots still need to be logged in");
      loginTracker++;
    }
  });
});*/

app.get('/requestItems', function(req, res){
    var steamIDtoTrade = req.query.steamID;
    //Check if Bots are online
    if(botQueue.length == 0){
      //If there are no bots in the queue to take the order, then we can't process it.
      console.log("Sorry no bots available");
      res.send("No Bots available ATM");
      return;
    } else {
      var currentBot = botQueue.shift();
    }

    requestItems(currentBot.offerInstance, steamIDtoTrade, itemID, userAccessToken, function(response){
      botDict[response] = currentBot;
      res.send(response); //trade request sent successfully
    });

    /*eventEmitter.on('requestOfferExpired', function(){
      console.log("Request offer has timed out/been cancelled");
      res.send("Request offer has timed out/been cancelled");
      botQueue.push(currentBot);
    });
    eventEmitter.on('requestOfferAccepted', function(){
      console.log("Request offer has completed");
      res.send("Request offer has completed");
      botQueue.push(currentBot);
    });*/

});

app.get('/pollTrade', function(req, res){
    var tradeID = req.query.tradeID;
    try {
      var currentBot = botDict[tradeID]; //Gotta get the related bot;
    } catch (e) {
      res.send(e);
    }
    
    pollTrade(currentBot.offerInstance, tradeID, function(response){
      res.send(response)
    });
})

var pollTrade = function(steamOfferObj, tradeID, callback){
  steamOfferObj.getOffer({
        tradeOfferId : tradeID // The tradeoffer id
    }, function(error, body) {
        console.log(body);
        console.log(error);
        if (error == null) {
          //console.log(body);
          console.log(body.response.offer.trade_offer_state);
            if (body.response.offer.trade_offer_state == 3) {
                delete botDict[tradeID]; //removes bot if trade is successful.
                callback('requestOfferAccepted');
                return;
            } else if(body.response.offer.trade_offer_state == 7){
                delete botDict[tradeID]; //removes bot if trade is unsuccessful.
                callback('requestOfferExpired');
                return;
            } else {
                callback('requestOfferPending');
                return;
            }
        }
    });
}

app.get('/returnItems', function(req, res){
    //Check if Bots are online
    if(botQueue.length == 0){
      //If there are no bots in the queue to take the order, then we can't process it.
      console.log("Sorry no bots available");
      res.send("No Bots available ATM");
      return;
    } else {
      var currentBot = botQueue.shift();
    }
    returnItems(currentBot.offerInstance, steamIDtoTrade, itemFromThem);
    //NEED EMAIL SCRAPAGE HERE TO CONFIRM OFFER!
    eventEmitter.on('returnOfferExpired', function(){
      console.log("return Offer has timed out")
      res.send("Return offer has timed out")
      botQueue.push(currentBot);
    })
    eventEmitter.on('returnOfferAccepted', function(){
      console.log("Return offer has completed");
      res.send("Return offer has completed");
      botQueue.push(currentBot);
    });
});

app.get('/getInventory', function(req, res){
  var steamID = req.query.steamID;
  //send a web request to http://www.steamcommunity.com/profiles/<NUM>/inventory
  request({
    uri: 'http://www.steamcommunity.com/profiles/' + steamID + '/inventory/json/730/2/'
  }, function(error, response, body){
    res.send(body);
  })
});


var buildABot = function(steamName, password){
  var bot = new Steam.SteamClient();
  this.botInstance = bot;
  this.name = steamName;
  var steamOffers = new SteamTradeOffers();
  this.inTrade = false;
  this.offerInstance = steamOffers;
  if(fs.existsSync(steamName + ".sentry")){
    //If there is a sentry file, use it.
    bot.logOn({
      accountName: steamName,
      password: password,
      shaSentryfile: fs.readFileSync(steamName + ".sentry")
    })
  } else {
    //Probably gonna need another couple ifs here, gonna need to scrape steamguard.
    bot.logOn({
      accountName: steamName,
      password: password
    })
  }

  bot.on('loggedOn', function() {
    console.log(steamName + ' Logged in!');
    bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
  });

  bot.on('webSessionID', function(sessionID){
    bot.webLogOn(function(cookies){
        for(var cookie in cookies) console.log(cookies[cookie]);
        steamOffers.setup({
          sessionID: sessionID,
          webCookie: cookies
        }, function(){
          console.log("SteamOffers cookies set");
          eventEmitter.emit('logonFinished');
        })
    });
    bot.on('sentry',function(sentryHash) {
      fs.exists('sentryfile' + steamName, function(exists){
        if(!exists){
          fs.writeFile('sentryfile',sentryHash,function(err) {
          if(err){
            console.log(err);
          } else {
            console.log('Saved sentry file hash as ' + steamName + '.sentry');
          }
          });
        } else {
          console.log("Sentry file already exists.")
        }
      })
      
    });
  
  });
}

var requestItems = function(steamOfferObj, steamID, itemIDs, userAccessToken, callback){
  var objectArray = [];
  steamOfferObj.loadPartnerInventory({
          partnerSteamId: steamID,
          appId: 730,
          contextId: 2
        }, function(errr, items){
          for(var index in itemIDs){
            console.log(items);
            objectArray.push({
              "appid": 730,
              "contextid" : 2,
              "amount" : 1,
              "assetid" : itemIDs[index]
            });
          }
          console.log(objectArray);

          steamOfferObj.makeOffer({
            partnerSteamId : steamID,
            accessToken : userAccessToken,
            itemsFromMe: {},
            itemsFromThem: objectArray
          }, function(err, data) {
            console.log(err);
            console.log(data);
            try{
              callback(data["tradeofferid"]);
            }catch (e){
              callback("Error occured: " + e);
            }
            /*var start = Date.now();
            function getData() {
              var setTimer = setTimeout(getData, 10000);
              if (Date.now() - start > 300000){
                steamOfferObj.cancelOffer({
                  tradeOfferId: data["tradeofferid"]
                }, function(){
                  clearTimeout(setTimer);
                  eventEmitter.emit('requestOfferExpired');
                  return;
                })
                
              }
              steamOfferObj.getOffer({
                  tradeOfferId : data["tradeofferid"] // The tradeoffer id
              }, function(error, body) {
                  console.log(body);
                  console.log(error);
                  if (error == null) {
                    //console.log(body);
                    console.log(body.response.offer.trade_offer_state);
                      if (body.response.offer.trade_offer_state == 3) {
                          eventEmitter.emit('requestOfferAccepted');
                          clearTimeout(setTimer);
                          return "Offer Accepted" //on accept
                      } else if(body.response.offer.trade_offer_state == 7){
                          eventEmitter.emit('requestOfferExpired');
                          clearTimeout(setTimer);
                          return "Offer cancelled";
                      } else {

                      }
                  }
              });
            }

            getData();*/

          })
          
        })
}

var returnItems = function(steamOfferObj, steamID, itemIDs){
    var objectArray = [];
    steamOfferObj.loadMyInventory({
      appId : 730,
      contextId : 2
    }, function(errr, items){
        console.log(items);
        for(var index in itemIDs){
          objectArray.push({
            "appid": 730,
            "contextid" : 2,
            "amount" : 1,
            "assetid" : itemIDs[index]
          });
        }
        console.log(objectArray);
        steamOfferObj.makeOffer({
          partnerSteamId : steamID,
          itemsFromMe: objectArray,
          itemsToMe: {}
        }, function(err, data){
          console.log(err);
          console.log(data);
          var start = Date.now();

          function getData() {
            setTimeout(getData, 10000);
            if (Date.now() - start > 300000){
              steamOfferObj.cancelOffer({
                tradeOfferId: data["tradeofferid"]
              }, function(){
                clearTimeout(setTimer);
                eventEmitter.emit('returnOfferExpired');
                return;
              })
              
            }
            steamOfferObj.getOffer({
                tradeOfferId : data["tradeofferid"] // The tradeoffer id
            }, function(error, body) {
                if (error == null) {
                  console.log(body);
                    if (body.response.offer.trade_offer_state == 3) {
                        eventEmitter.emit('returnOfferAccepted');
                        clearTimeout(setTimer);
                        return "Offer Accepted" //on accept
                    } else if(body.response.offer.trade_offer_state == 7){
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
   
}