var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var crypto = require('crypto');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
require('array.prototype.find');

// This here is the admin password. For obvious reasons, set the ADMINPASS variable in production.
var secret = String(process.env.ADMINPASS || "testpassword");

server.listen(Number(process.env.PORT || 5000));

var index = require('./routes/index');
var stats = require('./routes/stats');
var privateroom = require('./routes/privateroom');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var users = [];
var privaterooms = [];

io.on('connection', function(socket)
{
	var nick = "";
	var room = null;
	
	socket.on('login', function(data)
	{
		if(data.nick.length > 64)
		{
			data.nick = data.nick.substring(0,63);
			socket.emit('nickupdate', data.nick);
		}
		if(data.nick.toUpperCase() === "MRMEAPIFY")
		{
			socket.emit('information', "[INFO] You DARE try to impersonate MrMeapify? Shame. Shame on you.");
			socket.conn.close();
		}
		else if(getUserByNick(data.nick))
		{
			socket.emit('information', "[INFO] The nickname you chose was in use. Please reload the page and choose another.");
			socket.conn.close();
		}
		else
		{
			data.socket = socket;
			if(data.nick === "MrMeapify " + secret)
			{
				nick = "MrMeapify";
				socket.emit('nickupdate', nick);
			}
			else
			{
				nick = data.nick;
			}
			nick = nick.replace(/&/g, "&#38;"); 	//escape &
			nick = nick.replace(/</g, "&lt;");  	//escape <
			nick = nick.replace(/>/g, "&gt;");  	//escape >
			nick = nick.replace(/"/g, "&quot;");	//escape "
			nick = nick.replace(/'/g, "&#39;"); 	//escape '
			data.nick = nick;
			var hasher = crypto.createHash('sha1');
			hasher.update(nick + new Date().getTime() + "IAmA Salt AMA" + secret);
			data.token = hasher.digest('hex');
			console.log(nick + ' ' + data.token);
			users.push(data);
			socket.emit('loggedIn');
			if(data.inBigChat)
			{
				socket.join('bigroom');
				io.to('bigroom').emit('information', "[INFO] " + nick + " has joined.");
				var usercopy = users;
				var list = "";
				for(var x = 0; x < usercopy.length; x++)
				{
					if(usercopy[x].inBigChat)
						list += "'" + usercopy[x].nick + "' ";
				}
				socket.emit('information', "[INFO] Users in the chatroom: [ " + list + "]");
			}
			else
			{
				socket.emit('information', "[INFO] Hi there, " + nick + "! You're now connected to the server.");
			}
		}

	});
	
	socket.on('joinroom', function(roomtoken, usertoken)
	{
		for(var x = 0; x < privaterooms.length; x++)
		{
			if(privaterooms[x].token === roomtoken)
			{
				room = privaterooms[x];
			}
		}
		try
		{
			console.log('Lookup user by ' + usertoken + "...");
			var finduser = getUserByToken(usertoken);
			console.log(finduser.nick);
			nick = finduser.nick;
			if(room)
			{
				socket.join(room.token);
				io.to(room.token).emit('information', "[INFO] " + nick + " has joined.");
			}
			else
			{
				console.log('bad room');
			}
		}
		catch(e)
		{
			console.log('Problems joining a private room. ' + e);
		}
	});

	socket.on('getNewChat', function(data)
	{
		var user = getUserByNick(nick);
		try
		{
			users.remove(user);
			if(user.partner)
			{
				users.remove(user.partner);
				delete user.partner.partner;
				users.push(user.partner);
				user.partner.socket.emit('partnerDC', user.nick);
				delete user.partner;
			}
			var userscopy = users;
			for(var x = 0; x < userscopy.length; x++)
			{
				var potentialPartner = userscopy[x];
				var good = true;
				if(potentialPartner.partner || potentialPartner.nick === data.last || potentialPartner.inBigChat)
					good = false;
				else
				{
					if(user.chatwith === "males" && potentialPartner.gender != "male")
						good = false;
					else if(user.chatwith === "females" && potentialPartner.gender != "female")
						good = false;
					else
					{
						if(user.type === "roleplaying" && potentialPartner.type === "hypnosis")
							good = false;
						else if(user.type === "hypnosis" && potentialPartner.type === "roleplaying")
							good = false;
						else if(user.type === "general" && potentialPartner.type != "general")
							good = false;
						else
						{
							if(potentialPartner.chatwith === "males" && user.gender != "male")
								good = false;
							else if(potentialPartner.chatwith === "females" && user.gender != "female")
								good = false;
							else
							{
								if(potentialPartner.type === "roleplaying" && user.type === "hypnosis")
									good = false;
								else if(potentialPartner.type === "hypnosis" && user.type === "roleplaying")
									good = false;
								else if(potentialPartner.type === "general" && user.type != "general")
									good = false;
								else
								{
									if(user.role === "tist" && potentialPartner.role === "tist")
										good = false;
									else if(user.role === "sub" && potentialPartner.role === "sub")
										good = false;
									else
										good = true;
								}
							}
						}
					}
				}
				if(good)
				{
					user.partner = potentialPartner;
					break;
				}
			}
			if(user.partner)
			{
				var found1 = "[INFO] Found a chat partner! Say hello to " + user.partner.nick + ", a ";
				var found2 = "[INFO] Found a chat partner! Say hello to " + user.nick + ", a ";

				if(user.partner.gender != "undisclosed")
					found1 += user.partner.gender;
				var nicerole1 = " switch.";
				if(user.partner.role === "tist")
					nicerole1 = " hypnotist.";
				else if(user.partner.role === "sub")
					nicerole1 = " subject.";
				found1 += " " + nicerole1;

				if(user.gender != "undisclosed")
					found2 += user.gender;
				var nicerole2 = " switch.";
				if(user.role === "tist")
					nicerole2 = " hypnotist.";
				else if(user.role === "sub")
					nicerole2 = " subject.";
				found2 += " " + nicerole2;

				socket.emit('information', found1);
				user.partner.socket.emit('information', found2);
				if(user.type === 'hypnosis' && user.partner.type === 'either')
				{
					user.partner.socket.emit('information', "[INFO] Please be aware that " + user.nick + " does not want to roleplay.");
				}
				if(user.type === 'roleplaying' && user.partner.type === 'either')
				{
					user.partner.socket.emit('information', "[INFO] Please be aware that " + user.nick + " is a roleplayer.");
				}
				if(user.partner.type === 'hypnosis' && user.type === 'either')
				{
					user.socket.emit('information', "[INFO] Please be aware that " + user.partner.nick + " does not want to roleplay.");
				}
				if(user.partner.type === 'roleplaying' && user.type === 'either')
				{
					user.socket.emit('information', "[INFO] Please be aware that " + user.partner.nick + " is a roleplayer.");
				}
				users.remove(user.partner);
				var usercopy = user;
				user.partner.partner = usercopy;
				users.push(user.partner);
				socket.emit('newChat', user.partner.nick);
				user.partner.socket.emit('newChat', user.nick);
			}
			else if(data.first == false)
			{
				socket.emit('information', "[INFO] Waiting for a new chat partner...");
			}
			else
			{
				socket.emit('information', "[INFO] Waiting for a suitable chat partner...");
			}
			users.push(user);
		}
		catch(e)
		{
			// This prevents us from crashing. 
			// Everybody, I just want you to know, this was MrMeapify's idea
		}
	});

	socket.on('chat message', function(data)
	{
		var user = getUserByNick(nick);
		if(data.message != "" && user)
		{
			// escape html
			message=data.message;
			message = message.replace(/&/g, "&#38;"); 	//escape &
			message = message.replace(/</g, "&lt;");  	//escape <
			message = message.replace(/>/g, "&gt;");  	//escape >
			message = message.replace(/"/g, "&quot;");	//escape "
			message = message.replace(/'/g, "&#39;"); 	//escape '
			message = message.replace(/^\s+|\s+$/g, '');
			if(message.lastIndexOf('/server ' + secret, 0) === 0)
			{
				var command = '/server ' + secret + ' ';
				io.sockets.emit('information', "[ADMIN] " + message.substring(command.length));
			}
			else if(message.lastIndexOf('/msg ', 0) === 0)
			{
				var userWanted = getUserByNick(message.substring(5, 5+message.substring(5).indexOf(' ')));
				if(!userWanted)
				{
					socket.emit('information', "[INFO] User " + message.substring(5, 5+message.substring(5).indexOf(' ')) + " was not found.");
				}
				else if(userWanted === user)
				{
					socket.emit('information', "[INFO] You can't message yourself!");
				}
				else
				{
					userWanted.socket.emit('whisper', nick, alterForWhisper(message));
					socket.emit('information', "[INFO] Message sent to " + userWanted.nick + ".");
				}
			}
			else if(message.lastIndexOf('/ignore ', 0) === 0)
			{
				var userWanted = getUserByNick(message.substring(8));
				if(!userWanted)
				{
					socket.emit('information', "[INFO] User " + message.substring(8) + " was not found.");
				}
				else if(userWanted === user)
				{
					socket.emit('information', "[INFO] You can't ignore yourself!");
				}
				else
				{
					socket.emit('information', "[INFO] User " + userWanted.nick + "added to ignore list.");
					socket.emit('ignore', userWanted.nick);
				}
			}
			else if(message.lastIndexOf('/whois ', 0) === 0)
			{
				var userWanted = getUserByNick(message.substring(7));
				if(!userWanted)
				{
					socket.emit('information', "[INFO] User " + message.substring(7) + " was not found.");
				}
				else
				{
					socket.emit('information', "[INFO] User " + userWanted.nick + " is a " + userWanted.gender + " " + userWanted.role);
				}
			}
			else if(message.lastIndexOf('/room ', 0) === 0)
			{
				socket.emit('chat message', alterForCommands(message, nick));
				var userWanted = getUserByNick(message.substring(6));
				if(!userWanted)
				{
					socket.emit('information', "[INFO] That user was not found.");
				}
				else if(userWanted === user)
				{
					socket.emit('information', "[INFO] You can't start a chat with yourself!");
				}
				else
				{
					var roomfound = null;
					for(var x = 0; x < privaterooms.length; x++)
					{
						var person1 = false;
						var person2 = false;
						for(var y = 0; y < privaterooms[x].users.length; y++)
						{
							if(privaterooms[x].users[y].nick === nick)
							{
								person1 = true;
							}
							if(privaterooms[x].users[y].token === userWanted.token)
							{
								person2 = true;
							}
						}
						if(person1 && person2)
						{
							roomfound = privaterooms[x];
						}
					}
					if(roomfound)
					{
						socket.emit('information', "[INFO] Joining " + userWanted.nick + "'s room...");
						socket.emit('openroom', { roomtoken: roomfound.token, usertoken: user.token });
					}
					else
					{
						var hasher = crypto.createHash('sha1');
						hasher.update(user.nick + userWanted.nick + new Date().getTime() + "IAmA Pepper AMA" + secret);
						var newroom =
						{
							users: [user, userWanted],
							token: hasher.digest('hex'),
							lastchat: new Date().getTime()
						};
						privaterooms.push(newroom);
						userWanted.socket.emit('information', "[INFO] " + nick + " would like to chat with you privately!");
						userWanted.socket.emit('openroom', { roomtoken: newroom.token, usertoken: userWanted.token });
						socket.emit('information', "[INFO] Request sent to " + userWanted.nick + ".");
						socket.emit('openroom', { roomtoken: newroom.token, usertoken: user.token });
					}
				}
			}
			else if(message.lastIndexOf('/close', 0) === 0 && room)
			{
				try
				{
					privaterooms.remove(room);
					io.to(room.token).emit('information', "[INFO] " + nick + " has closed the room.");
				}
				catch(e) {}
			}
			else if(message.lastIndexOf('/kick ' + secret, 0) === 0)
			{
				var command = '/kick ' + secret + ' ';
				var tokick = getUserByNick(message.substring(command.length));
				io.to('bigroom').emit('information', "[INFO] " + tokick.nick + " has been kicked by the admin.");
				tokick.socket.leave('bigroom');
				tokick.socket.conn.close();
			}
			else if(message.lastIndexOf('/coinflip', 0) === 0)
			{
				var result = "Heads";
				if(Math.random()>0.5)
				{
					result = "Tails";
				}
				if(room)
				{
					io.to(room.token).emit('chat message', alterForCommands(message, nick), "eval");
					io.to(room.token).emit('information', "[COINFLIP] " + result);
				}
				else if(user.inBigChat)
				{
					io.to('bigroom').emit('chat message', alterForCommands(message, nick), "eval");
					io.to('bigroom').emit('information', "[COINFLIP] " + result);
				}
				else
				{
					user.partner.socket.emit('chat message',  alterForCommands(message, nick), "them");
					socket.emit('chat message', alterForCommands(message, nick), "me");
					user.partner.socket.emit('information', "[COINFLIP] " + result);
					socket.emit('information', "[COINFLIP] " + result);
				}
			}
			else if((message.lastIndexOf('/list', 0) === 0 || message.lastIndexOf('/names', 0) === 0) && user.inBigChat)
			{
				var usercopy = users;
				var list = "";
				for(var x = 0; x < usercopy.length; x++)
				{
					if(usercopy[x].inBigChat)
						list += "'" + usercopy[x].nick + "' ";
				}
				socket.emit('information', "[INFO] Users in the chatroom: [ " + list + "]");
			}
			else if(message.lastIndexOf('/help', 0) === 0)
			{
				socket.emit('information', "[INFO] ~~~");
				socket.emit('information', "[INFO] Welcome to Sleepychat!");
				socket.emit('information', "[INFO] Sleepychat was created by MrMeapify in an attempt to solve the problems that chat sites before it posed the hypnosis community.");
				socket.emit('information', "[INFO] ");
				socket.emit('information', "[INFO] While in chat, you can use several commands:");
				socket.emit('information', "[INFO] -- /help -- Launches this message.");
				socket.emit('information', "[INFO] -- /coinflip -- Publicly flips a coin.");
				socket.emit('information', "[INFO] -- /ignore user -- Ignores all messages for a user.");
				socket.emit('information', "[INFO] -- /names -- While in the big chatroom, this will list the names of every current user in the chatroom with you.");
				socket.emit('information', "[INFO] -- /me did a thing -- Styles your message differently to indicate that you're doing an action.");
				socket.emit('information', "[INFO] -- /msg username message -- Sends a message to username that only they can see in chat.");
				socket.emit('information', "[INFO] -- /room user -- Requests a private chat with the specified user.");
				socket.emit('information', "[INFO] -- /whois user -- Display sex and role information for a user.");
				socket.emit('information', "[INFO] ~~~");
			}
			else if(message.lastIndexOf('/', 0) === 0 && !(message.lastIndexOf('/me', 0) === 0))
			{
				socket.emit('chat message', alterForCommands(message, nick));
				socket.emit('information', "[INFO] Command not recognized. Try /help for a list of commands.");
			}
			else if(room)
			{
				console.log('outputting message');
				try
				{
					io.to(room.token).emit('chat message', alterForCommands(message, nick), "eval");
					privaterooms.remove(room);
					room.lastchat = new Date().getTime();
					privaterooms.push(room);
				}
				catch(e)
				{
					console.log('Bad message. ' + nick + ' ... ' + message + e);
				}
			}
			else if(user.inBigChat)
			{
				try
				{
					io.to('bigroom').emit('chat message', alterForCommands(message, nick), "eval");
				}
				catch(e)
				{
					console.log('Bad message. ' + nick + ' ... ' + message + e);
				}
			}
			else
			{
				try
				{
					//user.partner.socket.emit('chat message', '<' + nick + '> ' + message);
					//socket.emit('chat message', '<' + nick + '> ' + message);
					user.partner.socket.emit('chat message',  alterForCommands(message, nick), "them");
					socket.emit('chat message', alterForCommands(message, nick), "me");
				}
				catch(e)
				{
					console.log('Bad message. ' + nick + ' ... ' + message);
				}
			}
		}
	});

	socket.on('disconnect', function()
	{
		if(room)
		{
			io.to(room.token).emit('information', "[INFO] " + nick + " has left.");
		}
		else
		{
			var user = getUserByNick(nick);
			if(user)
			{
				if(user.partner)
				{
					users.remove(user.partner);
					delete user.partner.partner;
					users.push(user.partner);
					user.partner.socket.emit('partnerDC', user.nick);
				}
				if(user.inBigChat)
				{
					io.to('bigroom').emit('information', "[INFO] " + nick + " has left.");
				}
				users.remove(user);
			}
		}
	});
});



function link_replacer(match, p1, p2, offset, string)
{
    if ((p2 == '.jpg') || (p2 == '.jpeg') || (p2 == '.gif') || (p2 == '.png'))
		a = "<a target='_blank' href='http://"+p1+"'><img src='http://"+p1+"' height='250'/></a>";
    else
		a = "<a target='_blank' href='http://"+p1+"'>"+p1+"</a>";
    return a;
}
		
function alterForWhisper(str)
{
	var ans = str; // Copies the variable so V8 can do it's optimizations.
	var italics = /\*([^*]+)\*/g; // Matches stuff between * *
	var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/]*(\.[\w\-_()]+)?(?:[\-\+=&;%@\.\w?#\/]*))/gi; //matches "google.com/" and "blog.google.com/" and but not P.H.D. For details, see http://pastebin.com/8zQJmt9N
	var subreddit = /\/r\/[A-Za-z0-9][A-Za-z0-9_]{2,20}/g; //matches /r/Hello
	var emoticons = /((?:\:\))|(?:XD)|(?:\:\()|(?:\:D)|(?:\:P)|(?:\:c)|(?:c\:)|(?:\:O)|(?:\;\))|(?:\;\())/g;
	
	ans = ans.replace(italics, "<i>$1</i>");
	var prevans = ans;
	ans = ans.replace(link, link_replacer);
	if(ans === prevans) // Only if the link replacer hasn't done anything yet.
		ans = ans.replace(subreddit, "<a target='_blank' href='http://www.reddit.com$&'>$&</a>");
	ans = ans.replace(emoticons, "<strong>$&</strong>");
}

function alterForCommands(str, nick)
{
	var ans = str; // Copies the variable so V8 can do it's optimizations.
	var me = /\/me( .*)/g; // Matches "/me " followed by anything
	var italics = /\*([^*]+)\*/g; // Matches stuff between * *
	var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/]*(\.[\w\-_()]+)?(?:[\-\+=&;%@\.\w?#\/]*))/gi; //matches "google.com/" and "blog.google.com/" and but not P.H.D. For details, see http://pastebin.com/8zQJmt9N
	var subreddit = /\/r\/[A-Za-z0-9][A-Za-z0-9_]{2,20}[^ ]*/g; //matches /r/Hello
	var emoticons = /((?:\:\))|(?:XD)|(?:\:\()|(?:\:D)|(?:\:P)|(?:\:c)|(?:c\:)|(?:\:O)|(?:\;\))|(?:\;\())/g;
	
	ans = ans.replace(italics, "<i>$1</i>");
	var prevans = ans;
	ans = ans.replace(link, link_replacer);
	if(ans === prevans) // Only if the link replacer hasn't done anything yet.
		ans = ans.replace(subreddit, "<a target='_blank' href='http://www.reddit.com$&'>$&</a>");
	ans = ans.replace(emoticons, "<strong>$&</strong>");
	if (ans.lastIndexOf('/me ', 0) === 0)
		return "<span style='font-weight: 300'>*" + nick + (ans.replace(me, '$1')) + "*</span>";
	else
		return '&lt;' + nick + '&gt; ' + ans;
}

function getUserByNick(nick)
{
	var userscopy = users;
	for(var x = 0; x < userscopy.length; x++)
	{
		if(userscopy[x].nick.toUpperCase() === nick.toUpperCase())
		{
			return userscopy[x];
		}
	}
	return null;
}

function getUserByToken(token)
{
	var userscopy = users;
	for(var x = 0; x < userscopy.length; x++)
	{
		if(userscopy[x].token === token)
		{
			return userscopy[x];
		}
	}
	return null;
}

setInterval(function()
{
	var usercopy = users;
	var males = 0;
	var females = 0;
	var undisclosed = 0;
	var tist = 0;
	var sub = 0;
	var switchrole = 0;
	var bigroom = 0;

	for(var x = 0; x < usercopy.length; x++)
	{
		var workinguser = usercopy[x];

		if(workinguser.inBigChat)
			bigroom++;

		if(workinguser.gender == 'male')
			males++;
		else if(workinguser.gender == 'female')
			females++;
		else
			undisclosed++;

		if(workinguser.role == 'tist')
			tist++;
		else if(workinguser.role == 'sub')
			sub++;
		else
			switchrole++;
	}
    io.sockets.emit('stats', { gender: { males: males, females: females, undisclosed: undisclosed }, role: { tist: tist, sub: sub, switchrole: switchrole }, bigroom: bigroom });
}, 1000);

setInterval(function()
{
	var roomscopy = privaterooms;
	for(var x = 0; x < roomscopy.length; x++)
	{
		var room = roomscopy[x];
		if(room.lastchat < new Date().getTime() - 43200000) // If the last chat message was over 12 hours ago.
		{
			privaterooms.remove(room); // Clean up
		}
	}
}, 300000); // Every 5 minues

app.use(function(req,res,next)
{
	req.rooms = privaterooms;
	next();
});

app.use('/', index);
app.use('/' + secret, stats);
app.use('/room', privateroom);
app.use('/legal', function(req, res)
{
	res.render('legal');
});

/// catch 404 and forward to error handler
app.use(function(req, res, next)
{
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development')
{
	app.use(function(err, req, res, next)
	{
		res.status(err.status || 500);
		res.render('error',
		{
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next)
{
	res.status(err.status || 500);
	res.render('error',
	{
		message: err.message,
		error: {}
	});
});

Array.prototype.remove = function()
{
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

module.exports = app;
