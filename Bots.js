var fs = require('fs');
var Steam = require('steam');
var SteamTrade = require('steam-trade');
var SteamTradeOffers = require('steam-tradeoffers');
var async = require('async');

var steamIDtoTrade = '76561198009923867'
var inTrade = false;
var inventory;

var botDict = {};

var steamTrade = new SteamTrade();
var steamOffers = new SteamTradeOffers();

var objectArray = [];
var itemID = ['1723463492', '1704536788'];

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
  Steam.servers = JSON.parse(fs.readFileSync('servers'));
}


var buildABot = function(steamName, password){
  var bot = new Steam.SteamClient();
  if(fs.existsSync("sentryfile" + 'sirrofl360')){
    //If there is a sentry file, use it.
    bot.logOn({
      accountName: 'sirrofl360',
      password: 'lightningrox',
      shaSentryfile: fs.readFileSync("sentryfile" + 'sirrofl360')
    })
  } else {
    //Probably gonna need another couple ifs here, gonna need to scrape steamguard.
    bot.logOn({
      accountName: 'sirrofl360',
      password: 'lightningrox'
    })
  }

  bot.on('loggedOn', function() {
    console.log('Logged in!');
    bot.setPersonaState(Steam.EPersonaState.Online); // to display your bot's status as "Online"
  });

  bot.on('webSessionID', function(sessionID){
    //steamTrade.sessionID = sessionID;
    bot.webLogOn(function(cookies){
        steamOffers.setup({
          sessionID: sessionID,
          webCookie: cookies
        }, function(){
          console.log("SteamOffers cookies set");
          return steamOffers;
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
}
/*async.waterfall([function(callback){
  var offerObj = new buildABot('sirrofl360', 'lightningrox');
  callback(null);
  }, 
  function(callback, offerObj){
    //requestItems(offerObj, '76561198009923867', itemID);
    callback(null);
  }
  ], function (err, result){
  console.log("FINAL");

})*/
var offerObj = new buildABot('sirrofl360', 'lightningrox');
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

