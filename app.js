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


commandsInAFC = ["/names", "/list", '/help', '/formatting', '/me', '/afk', '/banana', '/banana-cream-pie', '/ping'] // commands that alterForCommands handles. If this list is up-to-date then sleepychat won't incorrectly print "command not recogonized"


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
		else if(data.nick.length < 1)
		{
			socket.emit('information', "[INFO] Please choose a nickname.");
			socket.conn.close();
		}
		if(data.nick.indexOf(' ') != -1 && data.nick !== "MrMeapify " + secret)
		{
			data.nick = data.nick.replace(/ /g, '');
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
			data.AFK = false
			users.push(data);
			socket.emit('loggedIn');
			if(data.inBigChat)
			{
				user = getUserByNick(nick)
				socket.join('bigroom');
				io.to('bigroom').emit('information', "[INFO] " + nameAppend(user.nick, user.gender, user.role) + " has joined.");
				socket.emit('information', "[INFO] Users in the chatroom: [ " + getUsers(users) + "]");
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
			console.log(e)
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
			message = message.replace(/;/g, "&#59;"); 			//escape ;
			message = message.replace(/&([^#$])/, "&#38;$1");	//escape &
			message = message.replace(/</g, "&lt;");  			//escape <
			message = message.replace(/>/g, "&gt;");  			//escape >
			message = message.replace(/"/g, "&quot;");			//escape "
			message = message.replace(/'/g, "&#39;"); 			//escape '
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
					userWanted.socket.emit('whisper', nick, alterForCommands(message, ""));
					socket.emit('whisper', nick, alterForCommands(message, ""));
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
				socket.emit('chat message', alterForCommands(message, user, socket));
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
				catch(e) 
				{
					console.log(e)
				}
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
					io.to(room.token).emit('chat message', alterForCommands(message, user, socket), "eval");
					io.to(room.token).emit('information', "[COINFLIP] " + result);
				}
				else if(user.inBigChat)
				{
					io.to('bigroom').emit('chat message', alterForCommands(message, user, socket), "eval");
					io.to('bigroom').emit('information', "[COINFLIP] " + result);
				}
				else
				{
					user.partner.socket.emit('chat message',  alterForCommands(message, user, socket), "them");
					socket.emit('chat message', alterForCommands(message, user, socket), "me");
					user.partner.socket.emit('information', "[COINFLIP] " + result);
					socket.emit('information', "[COINFLIP] " + result);
				}
			}
			else if(message.lastIndexOf('/roll', 0) === 0)
			{
				var num = 1;
                               
				if (message.length > 6)
				{
					var numString = message.substring(6);
                                       
					try
					{
						num = parseInt(numString);
					}
					catch (e) 
					{
						console.log(e)
					}
				}
				
				if (num > 10)
				{
					num = 10;
				}
 
				var result = "Rolled " + num.toString();
				if (num > 1)
				{
				       result += " dice: ";
				}
				else
				{
				        result += " die: ";
				}
				                              
				for (var i = 0; i < num; i++)
				{
					var rand = Math.floor(Math.random() * (7 - 1)) + 1;

					result += "<img src='http://www.random.org/dice/dice" + rand.toString() + ".png'/>";
					//result += rand.toString(); // If you don't want images...
				}

				
				if(room)
				{
					io.to(room.token).emit('chat message', alterForCommands(message, user, socket), "eval");
					io.to(room.token).emit('information', "[DICE ROLL] " + result);
				}
				else if(user.inBigChat)
				{
					io.to('bigroom').emit('chat message', alterForCommands(message, user, socket), "eval");
					io.to('bigroom').emit('information', "[DICE ROLL] " + result);
				}
				else
				{
					user.partner.socket.emit('chat message',  alterForCommands(message, user, socket), "them");
					socket.emit('chat message', alterForCommands(message, user, socket), "me");
					user.partner.socket.emit('information', "[DICE ROLL] " + result);
					socket.emit('information', "[DICE ROLL] " + result);
				}
			}
			else if(message.lastIndexOf('/', 0) === 0)
			{
				inAFC = false; // is it matched by alterForCommands?
				for(var x = 0; x < commandsInAFC.length; x++)
				{
					if(message.lastIndexOf(commandsInAFC[x]) == 0)
					{
						inAFC = true
					}
				}

				if(room)
					socket.emit('chat message', alterForCommands(message, user, socket, room));
				else
					socket.emit('chat message', alterForCommands(message, user, socket, room));
				if(!inAFC)
				{
					socket.emit('information', "[INFO] Command not recognized. Try /help for a list of commands.");
				}
			}
			else if(room)
			{
				try
				{
					io.to(room.token).emit('chat message', alterForCommands(message, user, socket, room), "eval");
					privaterooms.remove(room);
					room.lastchat = new Date().getTime();
					privaterooms.push(room);
				}
				catch(e)
				{
					console.log(e)
				}
			}
			else if(user.inBigChat)
			{
				try
				{
					io.to('bigroom').emit('chat message', alterForCommands(message, user, socket), "eval");
				}
				catch(e)
				{
					console.log(e)
				}
			}
			else
			{
				try
				{
					//user.partner.socket.emit('chat message', '<' + nick + '> ' + message);
					//socket.emit('chat message', '<' + nick + '> ' + message);
					user.partner.socket.emit('chat message',  alterForCommands(message, user, socket), "them");
					socket.emit('chat message', alterForCommands(message, user, socket), "me");
				}
				catch(e)
				{
					console.log(e)
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
	socket.on('AFK', function(data)
	{
		user = getUserByNick(data.nick);

		if (user.inBigChat)
		{
			for(var x = 0; x < users.length; x++)
			{
				if(users[x] === user)
				{
					users[x].AFK = data.isAFK
				}
			}
			if (data.isAFK)
			{
				io.to('bigroom').emit('information', "[INFO] " + data.nick + " is AFK."); 
			}
			else
			{
				if (data.time > (40*60*1000)) // if they've been gone for 40 minutes
					io.to('bigroom').emit('information', "[INFO] " + data.nick + " has returned!"); 
			}
		}

	});
});


// ==================================
// ==================================


function nameAppend(name, gender, role){
	name += (gender=="male") ? "♂" : ((gender=="female") ? "♀" : ""); // put a gender symbol by the name
	name += (role=="tist") ? "↑" : ((role=="sub") ? "↓" : "↕"); // put an arrow for subs and tists
	return name
}


function getUsers(users){
	var usercopy = users;
	var list = "";
	for(var x = 0; x < usercopy.length; x++)
	{
		if(usercopy[x].inBigChat)
		{
			if (usercopy[x].AFK)
			{
				list += "'" + "<span  style='color: #777777;'>" + nameAppend(usercopy[x].nick, usercopy[x].gender, usercopy[x].role) + "</span>" + "' ";
			}
			else
			{
				list += "'" + nameAppend(usercopy[x].nick, usercopy[x].gender, usercopy[x].role) + "' ";
			}
		}
	}
	return list;
}


// ==================================
// ==================================

var pies = ["http://i.imgur.com/Zb2ZnBF.jpg",
			"http://i.imgur.com/LFdFyTy.jpg",
			"http://i.imgur.com/EsS9Wj1.jpg",
			"http://i.imgur.com/QjXfokR.jpg",
			"http://i.imgur.com/6SdnhYw.jpg",
			"http://i.imgur.com/oEl6agR.jpg",
			"http://i.imgur.com/Wv8w7ap.jpg",
			"http://i.imgur.com/6HB16M4.jpg",
			"http://i.imgur.com/R6w82ZK.jpg",
			"http://i.imgur.com/MOHRUxA.jpg",
			"http://i.imgur.com/R115ftN.jpg",
			"http://i.imgur.com/4yYHZ4S.jpg"];

var helpCommands = 	[['information', "[INFO] ~~~"],
					['information', "[INFO] Welcome to Sleepychat!"],
					['information', "[INFO] Sleepychat was created by MrMeapify in an attempt to solve the problems that chat sites before it posed the hypnosis community."],
					['information', "[INFO] "],
					['information', "[INFO] While in chat, you can use several commands:"],
					['information', "[INFO] -- /help -- Launches this message. Duh"],
					['information', "[INFO] -- /formatting -- Shows formatting tips."],
					['information', "[INFO] -- /coinflip -- Publicly flips a coin."],
					['information', "[INFO] -- /banana -- Sends a picture of banana cream pie."],
					['information', "[INFO] -- /roll &lt;number (optional)&gt; -- Publicly rolls up to 10 dice."],
					['information', "[INFO] -- /ignore user -- Ignores all messages for a user."],
					['information', "[INFO] -- /names OR /list -- While in the big chatroom, this will list the names of every current user in the chatroom with you."],
					['information', "[INFO] -- /me &lt;did a thing&gt; -- Styles your message differently to indicate that you're doing an action."],
					['information', "[INFO] -- /msg &lt;username&gt; &lt;message&gt; -- Sends a message to username that only they can see in chat."],
					['information', "[INFO] -- /r OR /reply &lt;message&gt; -- Replies to the last person to PM you."],
					['information', "[INFO] -- /room &lt;user&gt; -- Requests a private chat with the specified user."],
					['information', "[INFO] -- /whois &lt;user&gt; -- Display sex and role information for a user."],
					['information', "[INFO] ~~~"]];

var helpFormatting = [['information', "[INFO] ~~~"],
					['information', "[INFO] -- Text surrounded by double dash (--) is striked through."],
					['information', "[INFO] -- Text surrounded by double underscore (__) is underlined."],
					['information', "[INFO] -- Text surrounded by double asterisk (**) is bolded."],
					['information', "[INFO] -- Text surrounded by single asterisk (*) is italicized."],
					['information', "[INFO] -- There's a couple more, but you might have to ask around..."],
					['information', "[INFO] ~~~"]];


function giveHelp(str, socket){
	if (str=="/help")
	{
		for(var x = 0; x < helpCommands.length; x++)
			socket.emit(helpCommands[x][0], helpCommands[x][1]);		// for example, socket.emit(['information', "[INFO] ~~~"][0], ['information', "[INFO] ~~~"][1])
	}
	else if (str=="/formatting")
	{
		for (var x = 0; x < helpFormatting.length; x++)
			socket.emit(helpCommands[x][0], helpCommands[x][1]);
	}
}

function giveBanana()
{
	var rand = Math.floor(Math.random() * pies.length);
	var result = pies[rand];
	return "<img src='" + result + "' class='embedded_image' />"

}


function link_replacer(match, p1, p2, offset, string)
{
    if ((p2 == '.jpg') || (p2 == '.jpeg') || (p2 == '.gif') || (p2 == '.png'))
		a = "<a target='_blank' href='http://"+p1+"'><img src='http://"+p1+"' class='embedded_image'/></a>";
    else
		a = "<a target='_blank' href='http://"+p1+"'>"+p1+"</a>";
    return a;
}


function alterForCommands(str, user, socket, room)
{
	var ans = str; // Copies the variable so V8 can do it's optimizations.
	
	console.log(user.nick + ": " + ans)

	// commands
	var me = /^\/me( .*)/g; // Matches "/me " followed by anything

	// formatting
	var bold = /\*\*(.+?)\*\*/g; // Matches stuff between ** **
	var italics = /\*(.+?)\*/g; // Matches stuff between * *
	var underline = /__(.+?)__/g; // Matches stuff between __ __
	var strikethrough = /\-\-(.+?)\-\-/g; // Matches stuff between -- --
	var monospace = /\`(.+?)\`/g; // Matches stuff between ` `
	var serif = /\`\`(.+?)\`\`/g; // Matches stuff between `` ``


	var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/]*(\.[\w\-_()]+)?(?:[\-\+=&;%@\.\w?#\/]*))/gi; //matches "google.com/" and "blog.google.com/" and but not P.H.D. For details, see http://pastebin.com/8zQJmt9N
	var subreddit = /\/r\/[A-Za-z0-9][A-Za-z0-9_]{2,20}[^ ]*/g; //matches /r/Hello

	var emoticons = /((?:\:\))|(?:XD)|(?:\:\()|(?:\:D)|(?:\:P)|(?:\:c)|(?:c\:)|(?:[oO]\.[oO])|(?:\>\:\))|(?:\>\:\()|(?:\:O)|(?:&#59\;\))|(?:&#59\;\())/g;



	// implementations

	// formatting
	ans = ans.replace(bold, "<strong>$1</strong>"); 
	ans = ans.replace(italics, "<i>$1</i>"); 
	ans = ans.replace(underline, "<span style='text-decoration: underline;'>$1</span>"); 
	ans = ans.replace(strikethrough, "<span style='text-decoration: line-through;'>$1</span>"); 
	ans = ans.replace(serif, "<span style='font-family: Georgia, serif'>$1</span>"); 
	ans = ans.replace(monospace, "<span style='font-family: monospace'>$1</span>"); 
	ans = ans.replace(emoticons, "<strong>$&</strong>");
	ans = ans.replace(me, "<span style='font-weight: 300'>*" + user.nick + " $1*</span>"); // "/me" is really formatting-y, so this is where I'm putting it
	
	var prevans = ans;
	ans = ans.replace(link, link_replacer);
	if(ans === prevans) // Only if the link replacer hasn't done anything yet.
		ans = ans.replace(subreddit, "<a target='_blank' href='http://www.reddit.com$&'>$&</a>");

	// commands
	if (ans == "/ping")	// It's a joke
	{
		socket.emit('chat message', ans, "me");
		socket.emit('information', '[INFO] Pong!');
	}
	else if (ans == "/banana" || ans == "/banana-cream-pie")
	{
		return giveBanana()
	}
	else if (ans == "/names" || ans == "/list")
	{
		socket.emit('chat message', ans, "me");
		socket.emit('information', "[INFO] Users in the chatroom: [ " + getUsers(users) + "]");
		return null;
	}
	else if (ans == "/help" || ans == "/formatting")
	{
		socket.emit('chat message', ans, "me");
		giveHelp(ans, socket)
		return null;
	}
	else if (ans == "/afk")
	{
		socket.emit('chat message', ans, "me");
		if (room)
			socket.emit('information', "[INFO] You can only do /afk in the public chat");
		else if (user.inBigChat)
			socket.emit('afk');
		else
			socket.emit('information', "[INFO] You can only do /afk in the public chat");
		return null;
	}
	else  // For some reason MrMeapify doesn't want /me in /msg
	{
		if(user.nick) // Empty string is falsey, so pass empty string to post a message without a user.nick.
		{
			return '&lt;' + user.nick + '&gt; ' + ans;
		}
		else
		{
			return ans; // Used for /msg command.
		}
	}
	return null;
		
}


// ==================================
// ==================================


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
