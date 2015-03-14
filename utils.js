var S = require('string');

var formatBotMessage = function(name, message) {
    return '[' + S(name).padLeft(20) + '] ' + message;
};

module.exports = {
    formatBotMessage: formatBotMessage
};