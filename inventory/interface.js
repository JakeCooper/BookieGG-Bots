module.exports = function(provider) {
    return function(req, res) {
        var steamID = req.query.steamID;
        provider.getInventory(steamID, function(response) {
            if (response['status'] == "fail") {
                res.statusCode = 503;
                res.send("503 - Steam service unavailable");
            } else {
                res.send(response['inventory']);
            }
        });
    }
};