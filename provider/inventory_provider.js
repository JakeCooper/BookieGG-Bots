var request = require('request');

var Provider = function() {
    this.getInventory = function(steamId, callback) {
        request({
            uri: 'http://www.steamcommunity.com/profiles/' + steamId + '/inventory/json/730/2/'
        }, function (error, response, body) {
            var contentType = response.headers['content-type'];
            contentType = contentType.split(';');
            contentType = contentType[0];
            if (contentType != "application/json") {
                callback({status: 'fail', message: 'Response is not JSON!'})
            } else {
                callback({status: 'success', inventory: body})
            }
        });
    }
};

module.exports = Provider;