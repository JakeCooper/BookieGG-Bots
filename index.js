#!/usr/bin/env node
var fs = require('fs');

var HttpInterface = require('./http_interface');
var http = new HttpInterface();

var Steam = require('steam');
var utils = require('./utils');

var Bot = require('./bot/bot');

var InventoryProvider = require('./provider/inventory_provider');
var inventory_provider = new InventoryProvider();
var inventory_interface = require('./interface/inventory_interface');
var root_interface = require('./interface/root_interface');

// if we've saved a server list, use it
if (fs.existsSync('servers')) {
    Steam.servers = JSON.parse(fs.readFileSync('servers'));
}

//Bots sign in on logon
var logins = fs.readFileSync('bots.botfile', 'utf8').split("\n");

function bootBots(bot_array) {
    if(bot_array.length <= 0) {
        console.log("All bots are initialized.");
        return;
    }
    var credentials = bot_array[0].split("\t");
    var username = credentials[0];
    var password = credentials[1];

    console.log(utils.formatBotMessage(username, 'Booting...'));

    var bot = new Bot(username, password);

    bot.login(function() {
        console.log(utils.formatBotMessage(username, 'Logged in successfully'));
        bootBots(bot_array.slice(1));
    });
}

bootBots(logins);

http.get('/', root_interface);
http.get('/get_inventory', inventory_interface(inventory_provider));

// temporarily disable
//http.listen(3000);