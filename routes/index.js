var express = require('express');
var router = express.Router();

router.get('/', function(req, res)
{
	res.render('index', { title: 'Sleepychat', version: 'Development Build 5' });
});

module.exports = router;
