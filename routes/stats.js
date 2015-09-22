var express = require('express');
var router = express.Router();

router.get('/', function(req, res)
{
    var isNight = req.cookies.theme == "night";
	res.render('stats', {
        logoType: (isNight ? "night" : "day"),
        nightStyle: (isNight ? "/stylesheets/night/common.css" : ""),
        statsID: process.env.KEEN_PROJECT_ID,
        statsKey: process.env.KEEN_READ_KEY,
        statsInterval: "daily",
        statsTimeframeNumber: 7,
        statsTimeframeScale: "days"
    });
});

module.exports = router;
