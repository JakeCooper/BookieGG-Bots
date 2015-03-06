var fs = require('fs');

var Steam = require('steam');
var SteamTradeOffers = require('steam-tradeoffers');

var express = require('express')
var app = express()

var events = require('events');
var eventEmitter = new events.EventEmitter();

var steamIDtoTrade = '76561198009923867'
var inTrade = false;
var inventory;

var botArray = [];

var itemID = ['1767404607', '1775623782'];
var itemFromThem = ['1776151529', '1776151533']

var server = app.listen(3000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('BookieBot Webserver launched at http://%s:%s', host, port)

})

app.get('/', function (req, res) {
  res.send('Hi I am a steambot server written in express!')
})

app.get('/buildBots', function(req, res){
  var botObj = new buildABot('sirrofl360', 'lightningrox');
  botArray.push(botObj);
  eventEmitter.on('logonFinished', function(){
    console.log("Bots have been signed in");
    res.send("Bots signed in")
  });
});

app.get('/requestItems', function(req, res){
    requestItems(botArray[0].offerInstance, steamIDtoTrade, itemID)
    eventEmitter.on('requestOfferTimeout', function(){
      console.log("Request offer has timed out")
      res.send("Request offer has timed out")
    })
});

app.get('/returnItems', function(req, res){
    returnItems(botArray[0].offerInstance, steamIDtoTrade, itemFromThem);
    //NEED EMAIL SCRAPAGE HERE TO CONFIRM OFFER!
    eventEmitter.on('returnOfferTimeout', function(){
      console.log("return Offer has timed out")
      res.send("Return offer has timed out")
    })
});


// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}


var buildABot = function(steamName, password){

  var bot = new Steam.SteamClient();
  this.botInstance = bot;
  var steamOffers = new SteamTradeOffers();
  this.inTrade = false;
  this.offerInstance = steamOffers;
  if(fs.existsSync("sentryfile" + steamName)){
    //If there is a sentry file, use it.
    bot.logOn({
      accountName: steamName,
      password: password,
      shaSentryfile: fs.readFileSync("sentryfile" + 'sirrofl360')
    })
  } else {
    //Probably gonna need another couple ifs here, gonna need to scrape steamguard.
    bot.logOn({
      accountName: steamName,
      password: password
    })
  }

  bot.on('loggedOn', function() {
    console.log('Logged in!');
    bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
  });

  bot.on('webSessionID', function(sessionID){
    bot.webLogOn(function(cookies){
        for(var cookie in cookies) console.log(cookies[cookie]);
        steamOffers.setup({
          sessionID: sessionID,
          webCookie: cookies
        }, function(){
          console.log(steamOffers);
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
            console.log('Saved sentry file hash as "sentryfile"');
          }
          });
        } else {
          console.log("Sentry file already exists.")
        }
      })
      
    });
  
  });
}

var requestItems = function(steamOfferObj, steamID, itemIDs){
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
            itemsFromMe: '{}',
            itemsFromThem: objectArray
          }, function(err, tradeOfferID) {
            console.log(err);
            console.log(tradeOfferID);

            var start = Date.now();

            function getData() {
              if (Date.now() - start > 300000){
                eventEmitter.emit('requestOfferTimeout');
                return;
              }
              steamOfferObj.getOffer({
                  "tradeOfferId": tradeOfferID["tradeofferid"] // The tradeoffer id
              }, function(error, body) {
                  setTimeout(getData, 10000);
                  if (error == null) {
                    console.log(body);
                      if (body.response.offer.trade_offer_state == 3) {
                          return "Offer Accepted" //on accept
                      } else {
                          //on not accepted
                      }
                  }
              });
            }

            getData();

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
            itemsToMe: '{}'
          }, function(err, tradeOfferID){
            console.log(err);
            console.log(tradeOfferID);
            var start = Date.now();

            function getData() {
              if (Date.now() - start > 300000){
                eventEmitter.emit('requestOfferTimeout');
                return;
              }
              steamOfferObj.getOffer({
                  "tradeOfferId": tradeOfferID["tradeofferid"] // The tradeoffer id
              }, function(error, body) {
                  setTimeout(getData, 10000);
                  if (error == null) {
                    console.log(body);
                      if (body.response.offer.trade_offer_state == 3) {
                          return "Offer Accepted" //on accept
                      } else {
                          //on not accepted
                      }
                  }
              });
            }
          })
        })
   
}


/*var botObj = new buildABot('sirrofl360', 'lightningrox');
eventEmitter.on('logonFinished', function(){
  //returnItems(botObj.offerInstance, steamIDtoTrade, itemFromThem);
  requestItems(botObj.offerInstance, steamIDtoTrade, itemID)
});

eventEmitter.on('offerTimeout', function(){
  console.log("Offer has timed out")
})*/