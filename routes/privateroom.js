var express = require('express');
var router = express.Router();

router.get('/*', function(req, res)
{
	var args = req.path.substring(1).split('/');
	if(args.length !== 2)
	{
		res.send('An unknown error has occured. Code: 1');
	}
	else
	{
		var room = null;
		var roomToken = args[0];
		var chatterToken = args[1];
		var rooms = req.rooms;
		for(var x = 0; x < rooms.length; x++)
		{
			if(rooms[x].token === roomToken)
			{
				room = rooms[x];
			}
		}
		if(!room)
		{
			res.send('An unknown error has occured. Code: 2');
		}
		else
		{
			var included = false;
			var nick = "";
			for(var x = 0; x < room.users.length; x++)
			{
				if(room.users[x].token === chatterToken)
				{
					included = true;
					nick = room.users[x].nick;
				}
			}
			if(!included)
			{
				res.send('An unknown error has occured. Code: 3');
			}
			else
			{
				res.render('privateroom', { title: 'Sleepychat - Private Room ' + room.token.substring(6), nick: nick });
			}
		}
	}
});

module.exports = router;
