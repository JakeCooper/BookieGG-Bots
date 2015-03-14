module.exports = function(req, res) {
    res.statusCode = 403;
    res.send('403 - Access denied');
};