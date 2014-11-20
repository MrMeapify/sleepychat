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
			res.send('Error: The room could not be found.');
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
                if (room.token == "modroom")
                {
                    res.render('privateroom', { title: 'Sleepychat - Mod Room', nick: nick });
                }
                else
                {
                    res.send('You were not invited to this room.');
                }
			}
			else
			{
                var alreadyHere = false;
                for (var y = 0; y < room.here.length; y++)
                {
                    if (room.here[y].token == chatterToken)
                    {
                        alreadyHere = true;
                    }
                }
                
                if (alreadyHere)
                {
                    res.send('You\'re already in this room.');
                }
                else
                {
				    res.render('privateroom', { title: 'Sleepychat - Private Room ' + room.token.substring(6), nick: nick });
                }
			}
		}
	}
});

module.exports = router;
