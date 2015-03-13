var express = require('express');
var HttpInterface = function(port) {
    this.app = express();

    this.listen = function(port) {
        if(port == undefined) {
            port = 3000;
        }

        this.app.listen(port, function() {
            console.log("Webserver started")
        });
    };

    this.get = function(path, fn) {
        this.app.get(path, fn);
    }
};

module.exports = HttpInterface;