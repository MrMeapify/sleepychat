var express = require('express');
var router = express.Router();

router.get('/', function(req, res)
{
    var isNight = req.cookies.theme == "night";
	res.render('stats', {
        logoType: (isNight ? "night" : "day"),
        nightStyle: (isNight ? "/stylesheets/night/common.css" : ""),
        statsID: "5600b616672e6c033b0f2581",
        statsKey: "b9def3f0ccbe2efbf14253ac1a4bd63ea939c830f6e747181e9390cb7b78b79b403628fb3807f22ce66d3dfb94ab60e749510cf95698daf44fe3232006d0632b4d3be3bcaa5972fcce15b99b201640107488ae5fbb6ef5707de7a9ffb4f5ad55dfcab971f98629e1e59de52b39e09f2d",
        statsInterval: "daily",
        statsTimeframeNumber: 7,
        statsTimeframeScale: "days"
    });
});

module.exports = router;
