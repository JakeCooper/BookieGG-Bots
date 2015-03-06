var fs = require('fs');
var Steam = require('steam');
var SteamTrade = require('steam-trade');
var SteamTradeOffers = require('steam-tradeoffers');
var async = require('async');
var events = require('events');
var eventEmitter = new events.EventEmitter();

var steamIDtoTrade = '76561198009923867'
var inTrade = false;
var inventory;

var botDict = {};

var steamTrade = new SteamTrade();
//var steamOffers = new SteamTradeOffers();

var itemID = ['1767404607', '1775623782'];
var itemFromThem = ['1776151529', '1776151533']

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
    //steamTrade.sessionID = sessionID;
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
        /*console.log(cookies);
        steamOffers.loadPartnerInventory({
          partnerSteamId: '76561198009923867',
          appId: 730,
          contextId: 2
        }, function(errr, items){
          
          for(var index in itemID){
            objectArray.push({
              "appid": 730,
              "contextid" : 2,
              "amount" : 1,
              "assetid" : itemID[index]
            });
          }
          console.log(objectArray);


          steamOffers.makeOffer({
            partnerSteamId : '76561198009923867',
            itemsFromMe: '{}',
            itemsFromThem: objectArray
          }, function(err, tradeOfferID) {
            console.log(err);
            console.log(tradeOfferID);
          })
          return steamOffers;
          
        })*/
        /*steamTrade.loadInventory(730,2, function(data){
            require('fs').writeFile('JSONOUTPUT.json',JSON.stringify(data),function(err) {
                if(err){
                    console.log(err);
                } else {
                    console.log('Saved to JSONOUTPUT.json');
                }
            });
          var this.inventory = data;
        });*/
        //bot.trade(steamIDtoTrade);
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

/*var requestItems = function(steamOfferObj, steamID, itemIDs){
  var objectArray = [];
  steamOfferObj.loadPartnerInventory({
          partnerSteamId: steamID,
          appId: 730,
          contextId: 2
        }, function(errr, items){

          for(var index in itemIDs){
            objectArray.push({
              "appid": 730,
              "contextid" : 2,
              "amount" : 1,
              "assetid" : itemID[index]
            });
          }
          console.log(objectArray);

          steamOffers.makeOffer({
            partnerSteamId : steamID,
            itemsFromMe: '{}',
            itemsFromThem: objectArray
          }, function(err, tradeOfferID) {
            console.log(err);
            console.log(tradeOfferID);
          })
          
        })
}*/

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
                eventEmitter.emit('offerTimeout');
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
          })
        })
   
}


var botObj = new buildABot('sirrofl360', 'lightningrox');
eventEmitter.on('logonFinished', function(){
  //returnItems(botObj.offerInstance, steamIDtoTrade, itemFromThem);
  requestItems(botObj.offerInstance, steamIDtoTrade, itemID)
});
eventEmitter.on('offerTimeout', function(){
  console.log("NO");
})

//requestItems(offerObj, '76561198009923867', itemID);
//console.log("Testing");
//requestItems(offerObj, '76561198009923867', itemID);

/*bot.on('sentry',function(sentryHash) {
    require('fs').writeFile('sentryfile',sentryHash,function(err) {
      if(err){
        console.log(err);
      } else {
        console.log('Saved sentry file hash as "sentryfile"');
      }
    });
});*/


/*bot.on('sessionStart', function(steamID){
	inTrade = true;
	steamTrade.open(steamID, function(){
		console.log("trade successfully started");
		steamTrade.addItem(inventory[0], function(){
			console.log(inventory[1]["id"]);
		});
	});
});

steamTrade.on('ready', function(){
	console.log(steamTrade.tradePartnerSteamID + ' readying');
	steamTrade.ready(function(){
    console.log(steamTrade.themAssets);
		console.log("Bot Ready");
		steamTrade.confirm();
		console.log("Bot Confirming");
	});

});

steamTrade.on('end', function(status, temp){
  inTrade = false;
	if (status =='complete'){
      //If completed, sends getItems function.
      getItems = temp;
  		getItems(function(items){
  		console.log(items);
		});
	} else {
      //If pending, tradei
      tradeID = temp;
      console.log(tradeID);
    }
});*/

