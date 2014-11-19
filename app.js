var express = require('express');
var app = express();
var server = require('http').Server(app);
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var crypto = require('crypto');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var fs = require('fs');
require('array.prototype.find');

// This here is the admin password. For obvious reasons, set the ADMINPASS variable in production.admi
var adminP = String(process.env.ADMINPASS || "testpassword");
var moderatorP = String(process.env.MODPASS || "testpassword");

var maxAllowedSimilarIps = parseInt(String(process.env.MAXSIMIPS || "2"));

// Admin/Mod stuff
var administrator = "ElysianTail-Senpai";
var moderators = ['MrMeapify', 'ScottB', 'Amburo', 'Phobos_D_Lawgiver', 'Anonymoususer2', 'Hypnonymoose', 'BurntPenny', 'Gaige', "ToHypnoFu"];

//Acquire the ban list.
var banList = [];
fs.readFile("Ban List.blt", function (err, logData) {

	if (err) throw err;
	
	var listString = logData.toString();
	
	if (listString != "")
	{
		var fileData = listString.split("\n");
		
		for (var  i = 0; i < fileData.length; i++)
		{
			var entry = fileData[i].split(' ');
			var bannedUser;
			try
			{
				bannedUser = {
					name: entry[0],
					ip: entry[1],
					days: parseInt(entry[2]),
					date: parseInt(entry[3])
				}
			} catch (e)
			{
				console.log("Error reading entry: Name = " + entry[0] + ", IP = " + entry[1] + ", Days = " + entry[2] + ", Date (In mil) = " + entry[3]);
			}
			
			banList.push(bannedUser);
		}
	}
});

//Acquire the news
var currentNews = [];
fs.readFile("Current News.ndf", function(err, logData) {

	if (err) throw err;
	
	var listString = logData.toString();
	
	if (listString != "")
	{
		var fileData = listString.split("\n");
		
		for (var  i = 0; i < fileData.length; i++)
		{
			currentNews.push(fileData[i]);
		}
	}
});

server.listen(Number(process.env.PORT || 5000));

var index = require('./routes/index');
var stats = require('./routes/stats');
var privateroom = require('./routes/privateroom');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(process.cwd() + "/public/favicon.ico"));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var connections = [];
var recentConns = [];
var users = [];
var privaterooms = [];

//Mod Room
var modroom =
{
    users: [],
    here: [],
    token: 'modroom',
    lastchat: new Date().getTime(),
    optouts: [false, false],
    isprivate: false,
    forcelogs: true
};

privaterooms.push(modroom);

var uniqueHiddenId = 0;

var MILSEC_PER_DAY = 86400000;

commandsInAM = ["/names", "/list", '/help', '/formatting', '/me', '/afk', '/banana', '/banana-cream-pie', '/ping', '/roll', '/mod', '/mmsg', '/fmsg'] // commands that alterMessage handles. If this list is up-to-date then sleepychat won't incorrectly print "command not recogonized"

io.on('connection', function(socket)
{
	try
	{
        var nick = "";
        var room = null;

        var loggedIn = false;

        var numberOfSimilarIps = 0;

        var forwardedFor = null;

        if (process.env.ISHEROKU == "1")
        {
            forwardedFor = socket.request.headers['x-forwarded-for'].split(' ');
        }
        else
        {
            forwardedFor = [ socket.request.connection.remoteAddress ];
        }

        //Connection Capping
        var ip = forwardedFor[forwardedFor.length - 1];
        for (var i = 0; i < connections.length; i++)
        {
            if (ip == connections[i].realIp)
            {
                numberOfSimilarIps++;
            }
        }
        if (numberOfSimilarIps > maxAllowedSimilarIps)
        {
            socket.emit('denial', "There are too many users with your IP address at this time.");
            socket.conn.close();
        }
        
        //Connection Throttling
        var recentConn = -1;
        for (var i = 0; i < recentConns.length; i++)
        {
            if (recentConns[i].ip == ip)
            {
                recentConn = i; 
            }
        }
        if (recentConn != -1)
        {
            var connToTest = recentConns[recentConn];
            
            var timeToReset = 15000;
            
            if (connToTest.tries > 2)
            {
                socket.emit('denial', "This IP is creating too many connections too quickly.");
                socket.conn.close();
                timeToReset = 1000*60*10; //10 minutes.
            }
            
            connToTest.tries++;
            clearTimeout(connToTest.timeout);
            var newTimeout = setTimeout(function() {

                recentConns.remove(connToTest);
            }, timeToReset);
            connToTest.timeout = newTimeout;
        }
        else
        {
            
            var newConn = {ip: ip, tries: 1, timeout: -1};
            var newTimeout = setTimeout(function() {
                
                recentConns.remove(newConn);
            }, 15000);
            newConn.timeout = newTimeout;
            recentConns.push(newConn);
        }

        socket.emit('allow', {keyString: (process.env.YTAPIKEY || "NOKEY") });
        socket.emit('newsupdate', { array: currentNews });
        var connection = { realIp: ip };
        connections.push(connection);

        var spamPoints = 0;
        setInterval(function() {
            
            spamPoints--;
            if (spamPoints < 0) { spamPoints = 0; }
            else if (spamPoints > 10 && !room) { socket.emit('information', "[INFO] You've been kicked for spamming the chat."); socket.conn.close(); }
        }, 2000);
        
        socket.on('login', function(data)
        {
            if (data == null || typeof data == 'undefined')
            {
                console.log("@ " + ip + ": Attempted crash using invalid data.");
                socket.conn.close();
                return;
            }

            if (data.nick == null || typeof data.nick == 'undefined')
            {
                console.log("@ " + ip + ": Attempted crash using invalid data.");
                socket.conn.close();
                return;
            }
            if (loggedIn)
            {
                socket.conn.close();
                return;
            }

            loggedIn = true;

            if(data.nick.length > 64)
            {
                data.nick = data.nick.substring(0,63);
                socket.emit('nickupdate', data.nick);
            }
            else if(data.nick.length < 1)
            {
                socket.emit('information', "[INFO] Please choose a nickname.");
                socket.conn.close();
                return;
            }
            else if (data.nick == administrator && data.pass != adminP)
            {
                socket.emit('information', "You dare impersonate Senpai? Don't think he didn't notice. Despite common belief, Senpai <i>always</i> notices...");
                console.log ("Person at " + ip + " tried to impersonate Senpai.");
                socket.conn.close();
                return;
            }
            else if (moderators.indexOf(data.nick) >= 0 && data.pass != moderatorP)
            {
                socket.emit('information', "[INFO] You dare attempt to impersonate "+data.nick+"? Shame. Shame on you.");
                console.log ("Person at " + ip + " tried to impersonate "+data.nick+".");
                socket.conn.close();
                return;
            }
            if(getUserByNick(data.nick))
            {
                socket.emit('information', "[INFO] The nickname you chose was in use. Please reload the page and choose another.");
                socket.conn.close();
                return;
            }
            else if (checkForBans(data, socket, ip) != null)
            {
                var banned = checkForBans(data, socket, ip);
                var rightNow = new Date();
                socket.emit('information', "[INFO] You've been banned from using this site for "+banned.days.toString()+" day"+(banned.days > 1 ? "s" : "")+" total. (Banned on "+rightNow.getMonth().toString()+"/"+rightNow.getDate().toString()+"/"+rightNow.getFullYear().toString()+")");
                socket.conn.close();
                return;
            }
            else if (data.nabbed != "nope")
            {
                socket.emit('information', "[INFO] You've been banned from using this site.");
                socket.conn.close();
                return;
            }
            else
            {
                data.socket = socket;
                nick = data.nick;

                var testResult = testNick(nick);
                if (testResult == "")
                {
                    data.nick = nick;
                    var hasher = crypto.createHash('sha1');
                    hasher.update(nick + new Date().getTime() + "IAmA Salt AMA" + adminP);
                    data.token = hasher.digest('hex');
                    console.log(nick + ' ' + data.token);
                    data.AFK = false
                    data.realIp = ip;
                    users.push(data);
                    socket.emit('loggedIn');

                    user = getUserByNick(nick)
                    if (data.nick === administrator) // Let's set the admin and mod variables
                    {
                        user.admin = true;
                        user.mod = true;
                    }
                    else if (moderators.indexOf(data.nick) >= 0)
                    {
                        socket.emit('information', "You're a moderator! Type \"/modcmd\" for commands at your disposal.");
                        user.admin = false;
                        user.mod = true;
                    }
                    else
                    {
                        user.admin = false;
                        user.mod = false;
                    }

                    if(data.inBigChat)
                    {
                        socket.join('bigroom');
                        io.to('bigroom').emit('information', "[INFO] " + getAuthority(user) + nameAppend(user.nick, user.gender, user.role) + " has joined.");
                        io.to('bigroom').emit('rosterupdate', generateRoster(users));
                        socket.emit('information', "[INFO] <span style='color: red;'>IMPORTANT NEWS: </span>Users have been attempting to advertise a dangerous and predatory IRC channel called #coverthypnotism, even going so far as to spam this site. Immediately report <strong>everyone</strong> that mentions this IRC channel to a mod or admin.");
                        if (!user.mod && !user.admin) { socket.emit('information', "[INFO] If you're new, type \"/help\" and hit enter to see a list of commands."); }
                        if (data.isMobile)
                        {
                            socket.emit('information', "[INFO] Users in the chatroom: [ " + getUsers(users, room) + " ]");
                        }
                    }
                    else
                    {
                        socket.emit('information', "[INFO] Hi there, " + nick + "! You're now connected to the server.");
                    }
                    console.log(nick +" has joined. IP: " + ip);
                }
                else
                {
                    socket.emit('information', "[INFO] Your username was not accepted.");
                    socket.conn.close();
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
                console.log(finduser.nick + " has joined a private room.");
                nick = finduser.nick;
                if(room)
                {
                    if (room.token == "modroom")
                    {
                        if (finduser.mod || finduser.admin)
                        {
                            socket.join(room.token);
                            room.here.push(finduser);
                            io.to(room.token).emit('rosterupdate', generateRoster(room.here));
                            io.to(room.token).emit('information', "[INFO] " + nick + " has joined.");
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You are not an admin or mod. Access is denied.");
                        }
                    }
                    else
                    {
                        socket.join(room.token);
                        room.here.push(finduser);
                        io.to(room.token).emit('rosterupdate', generateRoster(room.here));
                        socket.emit('information', "[INFO] For your safety, private rooms are logged and viewable only by the Admin. The room can opt out of logging if <strong>all</strong> users opt out.<br />You can opt out by typing \"/private\" into chat. You can also force logging for complete safety by typing \"/private never\" into chat.<br />Please only opt out if you trust your hypnotist.");
                        io.to(room.token).emit('information', "[INFO] " + nick + " has joined.");
                    }
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
            try
            {
                var user = getUserByNick(nick);
                if(data.message != "" && !(/^ +$/.test(data.message)) && user)
                {
                    spamPoints++;
                    spamPoints += (data.message.length > 1000 ? 1 : 0);
                    if (data.message.length > 2500)
                    {
                        socket.emit('information', "[INFO] Your message was too long.")
                        console.log(user.nick+" has sent a really long message: "+data.message.length.toString()+" characters.")
                        socket.conn.close();
                        return;
                    }
                    message=data.message;
                    
                    // Escape html
                    message = message.replace(/;/g, "&#59;"); 			//escape ;
                    message = message.replace(/&([^#$])/, "&#38;$1");	//escape &
                    message = message.replace(/</g, "&lt;");  			//escape <
                    message = message.replace(/>/g, "&gt;");  			//escape >
                    message = message.replace(/"/g, "&quot;");			//escape "
                    message = message.replace(/'/g, "&#39;"); 			//escape '
                    message = message.replace(/^\s+|\s+$/g, '');
                    
                    // Check for any disallowed words or phrases.
                    if (!room)
                    {
                        for (var i = 0; i < disallowedPhrases.length; i++)
                        {
                            disallowedPhrases[i].lastIndex = 0;
                            if (disallowedPhrases[i].test(message))
                            {
                                //Disallowed word/phrase detected.
                                for (var j = 0; j < users.length; j++)
                                {
                                    if (users[j].admin || users[j].mod)
                                    {
                                        users[j].socket.emit('information', "[INFO] User \""+user.nick+"\" @ IP \""+user.realIp+"\" used a banned word/phrase:<br>"+message);
                                    }
                                }
                                socket.emit('information', "[INFO] You've said a banned word or phrase.")
                                console.log(user.nick+" has sent a message with a banned word/phrase.")
                                socket.conn.close();
                                return;
                            }
                        }
                    }
                    
                    if (message.lastIndexOf('/svrmsg ', 0) === 0 && (user.admin || user.mod))
                    {
                        var command = '/svrmsg ';
                        var msg = message.substring(command.length);
                        var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi;
                        msg = msg.replace(link, "<a tabindex='-1' target='_blank' href='http://$1'>$1</a>");
                        io.sockets.emit('information', "[SERVER MESSAGE] " + msg);
                    }
                    else if (message.lastIndexOf('/rmmsg ', 0) === 0 && (user.admin || user.mod))
                    {
                        var command = '/rmmsg ';
                        var msg = message.substring(command.length);
                        var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi;
                        msg = msg.replace(link, "<a tabindex='-1' target='_blank' href='http://$1'>$1</a>");
                        io.to('bigroom').emit('information', "[ROOM MESSAGE] " + msg);
                    }
                    else if (message.lastIndexOf('/'+user.nick, 0) === 0)
                    {
                        socket.emit('information', "[INFO] No, "+user.nick+"!");
                    }
                    else if (message.lastIndexOf('/msg ', 0) === 0)
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
                            userWanted.socket.emit('whisper', nick, userWanted.nick, alterForFormatting(message, userWanted));
                            socket.emit('whisper', nick, userWanted.nick, alterForFormatting(message, userWanted));
                        }
                    }
                    else if (message.lastIndexOf('/ignore ', 0) === 0)
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
                            socket.emit('information', "[INFO] User " + userWanted.nick + " added to ignore list.");
                            socket.emit('ignore', userWanted.nick);
                        }
                    }
                    else if (message.lastIndexOf('/whois ', 0) === 0)
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
                    else if (message.lastIndexOf('/room ', 0) === 0)
                    {
                        socket.emit('chat message', alterMessage(message, user, socket, null, users));
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
                                socket.emit('information', "[INFO] Click to join " + userWanted.nick + "'s room...");
                                socket.emit('openroom', { roomtoken: roomfound.token, usertoken: user.token });
                            }
                            else
                            {
                                var hasher = crypto.createHash('sha1');
                                hasher.update(user.nick + userWanted.nick + new Date().getTime() + "IAmA Pepper AMA" + adminP);
                                var newroom =
                                {
                                    users: [user, userWanted],
                                    here: [],
                                    token: hasher.digest('hex'),
                                    lastchat: new Date().getTime(),
                                    optouts: [false, false],
                                    isprivate: false,
                                    forcelogs: false
                                };
                                privaterooms.push(newroom);
                                userWanted.socket.emit('information', "[INFO] " + nick + " would like to chat with you privately!");
                                userWanted.socket.emit('openroom', { roomtoken: newroom.token, usertoken: userWanted.token });
                                socket.emit('information', "[INFO] Request sent to " + userWanted.nick + ".");
                                socket.emit('openroom', { roomtoken: newroom.token, usertoken: user.token });
                            }
                        }
                    }
                    else if (message.lastIndexOf('/createroom ', 0) === 0)
                    {
                        socket.emit('chat message', alterMessage(message, user, socket, null, users));
                        var roomName = message.substring(12);
                        if(roomName.length < 3)
                        {
                            socket.emit('information', "[INFO] Public room names must be 3 characters or longer.");
                        }
                        else
                        {
                            var roomfound = null;
                            for(var x = 0; x < privaterooms.length; x++)
                            {
                                if (privaterooms[x].token == roomName)
                                {
                                    roomfound = privaterooms[x];
                                }
                            }
                            if(roomfound)
                            {
                                socket.emit('information', "[INFO] Click to join public room \""+roomName+"\"...");
                                socket.emit('openroom', { roomtoken: roomfound.token, usertoken: user.token });
                            }
                            else
                            {
                                var newroom =
                                {
                                    users: [user],
                                    here: [],
                                    roomAdmin: user,
                                    token: roomName,
                                    lastchat: new Date().getTime(),
                                    optouts: [false, false],
                                    isprivate: false,
                                    forcelogs: false
                                };
                                privaterooms.push(newroom);
                                socket.emit('information', "[INFO] Room named \""+roomName +"\" created.");
                                socket.emit('openroom', { roomtoken: newroom.token, usertoken: user.token });
                                console.log("New room created by "+user.nick+": "+roomName);
                            }
                        }
                    }
                    else if (message.lastIndexOf('/invite ', 0) === 0)
                    {
                        socket.emit('chat message', alterMessage(message, user, socket, null, users));
                        var roomArgs = message.substring(8).split(' ');
                        var roomName = roomArgs[0];
                        
                        var usersWanted = [];
                        
                        if (roomArgs[1] != "all")
                        {
                            for (var i = 1; i < roomArgs.length; i++)
                            {
                                var userWanted = getUserByNick(roomArgs[i].replace(',', ''));
                                if (userWanted)
                                {
                                   usersWanted.push(userWanted); 
                                }
                            }
                        }
                        else
                        {
                            for (var i = 0; i < users.length; i++)
                            {
                                if (users[i].inBigChat && users[i] != user)
                                {
                                    usersWanted.push(users[i]);
                                }
                            }
                        }
                        if(roomName.length < 3)
                        {
                            socket.emit('information', "[INFO] Public room names must be 3 characters or longer.");
                        }
                        else if(usersWanted.length < 1)
                        {
                            socket.emit('information', "[INFO] There are no other users to invite.");
                        }
                        else if(!usersWanted[0])
                        {
                            socket.emit('information', "[INFO] That user was not found.");
                        }
                        else if(usersWanted[0] === user)
                        {
                            socket.emit('information', "[INFO] You can't invite yourself!");
                        }
                        else
                        {
                            var roomfound = null;
                            for(var x = 0; x < privaterooms.length; x++)
                            {
                                if (privaterooms[x].token == roomName)
                                {
                                    roomfound = privaterooms[x];
                                }
                            }
                            if(roomfound)
                            {
                                if (roomfound.users.indexOf(user) != -1)
                                {
                                    socket.emit('information', "[INFO] Inviting "+(usersWanted.length > 1 ? "users" : usersWanted[0].nick)+" to \""+roomName+"\"...");
                                    
                                    var usersInvited = "";
                                    for (var j = 0; j < usersWanted.length; j++)
                                    {
                                        usersWanted[j].socket.emit('information', "[INFO] You've been invited by "+user.nick+" to the "+roomName+" public room!");
                                        usersWanted[j].socket.emit('openroom', { roomtoken: roomfound.token, usertoken: usersWanted[j].token });
                                        if (roomfound.users.indexOf(usersWanted[j]) == -1)
                                        {
                                            usersInvited += usersWanted[j].nick + ", ";
                                            roomfound.users.push(usersWanted[j]);
                                        }
                                    }
                                    usersInvited = usersInvited.substring(0, usersInvited.length - 2);
                                    console.log("Users invited to room \""+roomName+"\" by "+user.nick+": "+(roomArgs[1] == "all" ? "all users" : usersInvited));
                                }
                                else
                                {
                                    socket.emit('information', "[INFO] You can't invite people to a room you're not invited to!");
                                }
                            }
                            else
                            {
                                socket.emit('information', "[INFO] That room was not found.");
                            }
                        }
                    }
                    else if (message.lastIndexOf('/kick ', 0) === 0 && room)
                    {
                        if (room.roomAdmin != 'undefined')
                        {
                            if (room.roomAdmin == user)
                            {
                                var toKick = getUserByNick(message.substring(5));
                                if (!toKick)
                                {
                                    socket.emit('information', "[INFO] User not found.");
                                }
                                else
                                {
                                    toKick.socket.leave(room.token);
                                    room.user.remove(toKick);
                                }
                            }
                            else
                            {
                                socket.emit('information', "[INFO] You're not the room admin!");
                            }
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You can't kick people from a private room!");
                        }
                    }
                    else if (message.lastIndexOf('/private', 0) === 0 && room)
                    {
                        for (var i = 0; i < room.users.length; i++)
                        {
                            if (room.users[i].token == user.token)
                            {
                                if (message == "/private never")
                                {
                                    room.forcelogs = true;
                                    room.isprivate = false;
                                    console.log(user+" has forced logging for his/her room.");
                                    io.to(room.token).emit('information', "[INFO] Logging has been forced on for this room.");
                                }
                                else
                                {
                                    room.optouts[i] = !room.optouts[i];

                                    roomPrivate = true;

                                    var leftToOptOut = 0;

                                    for (var j = 0; j < room.users.length; j++)
                                    {
                                        roomPrivate = roomPrivate && room.optouts[j];
                                        if (!room.optouts[j])
                                        {
                                            leftToOptOut++;
                                        }
                                    }

                                    var wasPrivate = room.isprivate;
                                    room.isprivate = roomPrivate;
                                    
                                    if (room.forcelogs)
                                    {
                                        room.isprivate = false;
                                        socket.emit('information', "[INFO] Logging for this room has been forced on by one of the users. Sorry about that.");
                                    }
                                    else
                                    {
                                        console.log(user.nick+" has opted "+(room.optouts[i] ? "out of" : "in to")+" private logging.")

                                        socket.emit('information', "[INFO] You have opted "+(room.optouts[i] ? "out of" : "in to")+" private logging. "+(leftToOptOut > 0 ? leftToOptOut.toString()+" more user"+(leftToOptOut > 1 ? "s" : "")+" must opt out to make the room private." : ""));
                                        if (wasPrivate != roomPrivate)
                                        {
                                            io.to(room.token).emit('information', "[INFO] The room is no"+(roomPrivate ? "w private. No l" : "t private. L")+"ogging will occur.");
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else if (message.lastIndexOf('/close', 0) === 0 && room)
                    {
                        if (room.token != "modroom")
                        {
                            try
                            {
                                privaterooms.remove(room);
                                io.to(room.token).emit('information', "[INFO] " + nick + " has closed the room.");
                                for (var i = 0; i < room.users.length; i++)
                                {
                                    room.users[i].socket.leave(room.token);
                                }
                            }
                            catch(e) 
                            {
                                console.log(e)
                            }
                        }
                    }
                    else if (message.lastIndexOf('/coinflip', 0) === 0)
                    {
                        var result = Math.random()>0.5 ? "Heads" : "Tails";
                        if (room) // We need to know if we're in a room to actually transmit the message
                        {
                            sendMessage(false, alterMessage(message, user, socket, room, users), user, room, socket)
                            sendMessage(true, "[COINFLIP] " + result, user, room, socket);
                        }
                        else
                        {
                            sendMessage(false, alterMessage(message, user, socket, null, users), user, null, socket)
                            sendMessage(true, "[COINFLIP] " + result, user, null, socket);
                        }
                    }
                    // ----- Mod/Admin Commands
                    else if (message.lastIndexOf('/modcmd', 0) === 0)
                    {
                        for(var x = 0; x < modCommands.length; x++)
                            socket.emit(modCommands[x][0], modCommands[x][1]);
                    }
                    else if (message.lastIndexOf('/modroom', 0) === 0)
                    {
                        if (user.admin || user.mod)
                        {
                            socket.emit('information', "[INFO] Welcome back to the <a href='/room/modroom/"+user.token+"' target='_blank'>mod room</a>, "+user.nick+".");
                        }
                        else
                        {
                            socket.emit('information', "[INFO] That command is reserved for administrators and moderators, sorry.");
                        }
                    }
                    else if (message.lastIndexOf('/objection', 0) === 0)
                    {
                        if (user.admin || user.mod)
                        {
                            io.to('bigroom').emit('chat message', user.nick+" objects! <a tabindex='-1' target='_blank' href='http://i.imgur.com/OjgtW2P.gif'><img src='http://i.imgur.com/OjgtW2P.gif' class='embedded_image'/></a>", "eval", user.nick);
                        }
                        else
                        {
                            socket.emit('information', "[INFO] That command is reserved for administrators and moderators, sorry.");
                        }
                    }
                    else if (message.lastIndexOf('/holdit', 0) === 0)
                    {
                        if (user.admin || user.mod)
                        {
                            io.to('bigroom').emit('chat message', user.nick+" says stop! <a tabindex='-1' target='_blank' href='http://i.imgur.com/Yra5xbb.gif'><img src='http://i.imgur.com/Yra5xbb.gif' class='embedded_image'/></a>", "eval", user.nick);
                        }
                        else
                        {
                            socket.emit('information', "[INFO] That command is reserved for administrators and moderators, sorry.");
                        }
                    }
                    else if (message.lastIndexOf('/kick ', 0) === 0 && (user.admin || user.mod))
                    {
                        var tokick = getUserByNick(message.substring(6));
                        if (!tokick.admin || user.admin)
                        {
                            io.to('bigroom').emit('information', "[INFO] " + tokick.nick + " has been kicked by "+user.nick+".");
                            tokick.socket.leave('bigroom');
                            tokick.socket.conn.close();
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You can't kick Senpai!");
                        }
                    }
                    else if (message.lastIndexOf('/ban ', 0) === 0 && (user.admin || user.mod))
                    {
                        var postpass = message.substring(5).split(' ');
                        var tokick = getUserByNick(postpass[0]);

                        if (!tokick.admin)
                        {
                            var days = 1;
                            try
                            {
                                days = parseInt(postpass[1]);
                                if (isNaN(days))
                                {
                                    days = 1;
                                }
                            }
                            catch (e)
                            {
                                days = 1;
                            }
                            var rightNow = new Date();
                            var nameIpPair = {
                                name: "?",
                                ip: tokick.realIp,
                                days: days,
                                date: rightNow.getTime()
                            };

                            io.to('bigroom').emit('information', "[INFO] " + tokick.nick + " has been struck by the Ban Hammer, swung by "+user.nick+". ("+days.toString()+" day ban)");
                            var dateTill = new Date();
                            dateTill.setDate(dateTill.getDate()+days);
                            tokick.socket.emit('nab', dateTill);
                            setTimeout(function() { tokick.socket.conn.close(); }, 500);
                            
                            var replaced = false;
                            for (var i = 0; i < banList.length; i++)
                            {
                                if (banList[i].ip == nameIpPair.ip)
                                {
                                    banList[i] = nameIpPair;
                                    replaced = true;
                                    break;
                                }
                            }
                            
                            if (!replaced)
                                banList.push(nameIpPair);
                            
                            updateBanList();
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You can't ban Senpai!");
                        }
                    }
                    else if (message.lastIndexOf('/banname ', 0) === 0 && (user.admin || user.mod))
                    {
                        var postpass = message.substring(9).split(' ');
                        var tokick = getUserByNick(postpass[0]);

                        if (!tokick.admin)
                        {
                            var days = 1;
                            try
                            {
                                days = parseInt(postpass[1]);
                                if (isNaN(days))
                                {
                                    days = 1;
                                }
                            }
                            catch (e)
                            {
                                days = 1;
                            }
                            var rightNow = new Date();
                            var nameIpPair = {
                                name: tokick.nick,
                                ip: tokick.realIp,
                                days: days,
                                date: rightNow.getTime()
                            };

                            io.to('bigroom').emit('information', "[INFO] " + tokick.nick + " has been struck by the Ban Hammer, swung by "+user.nick+". ("+days.toString()+" day ban)");
                            var dateTill = new Date();
                            dateTill.setDate(dateTill.getDate()+days);
                            tokick.socket.emit('nab', dateTill);
                            setTimeout(function() { tokick.socket.conn.close(); }, 500);

                            var replaced = false;
                            for (var i = 0; i < banList.length; i++)
                            {
                                if (banList[i].ip == nameIpPair.ip)
                                {
                                    banList[i] = nameIpPair;
                                    replaced = true;
                                    break;
                                }
                            }
                            
                            if (!replaced)
                                banList.push(nameIpPair);
                            
                            updateBanList();
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You can't ban Senpai!");
                        }
                    }
                    else if (message.lastIndexOf('/banip ', 0) === 0 && (user.admin || user.mod))
                    {
                        var postpass = message.substring(7).split(' ');
                        var tokick = getUserByIP(postpass[0]);

                        if (tokick == null)
                        {
                            var days = 1;
                            try
                            {
                                days = parseInt(postpass[1]);
                                if (isNaN(days))
                                {
                                    days = 1;
                                }
                            }
                            catch (e)
                            {
                                days = 1;
                            }
                            var rightNow = new Date();
                            var nameIpPair = {
                                name: "?",
                                ip: postpass[0],
                                days: days,
                                date: rightNow.getTime()
                            };
                            
                            socket.emit('information', "[INFO] IP " + postpass[0] + " has been struck by the Ban Hammer, swung by "+user.nick+". ("+days.toString()+" day ban)");

                            var replaced = false;
                            for (var i = 0; i < banList.length; i++)
                            {
                                if (banList[i].ip == nameIpPair.ip)
                                {
                                    banList[i] = nameIpPair;
                                    replaced = true;
                                    break;
                                }
                            }
                            
                            if (!replaced)
                                banList.push(nameIpPair);
                            
                            updateBanList();
                        }
                        else if (!tokick.admin)
                        {
                            var days = 1;
                            try
                            {
                                days = parseInt(postpass[1]);
                                if (isNaN(days))
                                {
                                    days = 1;
                                }
                            }
                            catch (e)
                            {
                                days = 1;
                            }
                            var rightNow = new Date();
                            var nameIpPair = {
                                name: "?",
                                ip: tokick.realIp,
                                days: days,
                                date: rightNow.getTime()
                            };

                            io.to('bigroom').emit('information', "[INFO] " + tokick.nick + " has been struck by the Ban Hammer, swung by "+user.nick+". ("+days.toString()+" day ban)");
                            var dateTill = new Date();
                            dateTill.setDate(dateTill.getDate()+days);
                            tokick.socket.emit('nab', dateTill);
                            setTimeout(function() { tokick.socket.conn.close(); }, 500);

                            var replaced = false;
                            for (var i = 0; i < banList.length; i++)
                            {
                                if (banList[i].ip == nameIpPair.ip)
                                {
                                    banList[i] = nameIpPair;
                                    replaced = true;
                                    break;
                                }
                            }
                            
                            if (!replaced)
                                banList.push(nameIpPair);
                            
                            updateBanList();
                        }
                        else
                        {
                            socket.emit('information', "[INFO] You can't ban Senpai!");
                        }
                    }
                    else if (message.lastIndexOf('/banlist', 0) === 0 && (user.admin || user.mod))
                    {
                        var listString = "[INFO] Banned users: [";

                        for (var i = 0; i < banList.length; i++)
                        {
                            listString += banList[i].name + ":" + banList[i].ip;

                            if (i < banList.length - 1)
                            {
                                listString += ", ";
                            }
                        }

                        socket.emit('information', listString + "]");
                    }
                    //Admin Only Commands
                    else if (message.lastIndexOf('/newsmod', 0) === 0)
                    {
                        if (user.admin)
                        {
                            uniqueHiddenId++;

                            var newsVal = "";

                            for (var i = 0; i < currentNews.length; i++)
                            {
                                newsVal += currentNews[i];
                                if (i < currentNews.length - 1)
                                {
                                    newsVal += "\n";
                                }
                            }

                            socket.emit('newsmod', { id: uniqueHiddenId, currentVal: newsVal })
                        }
                        else
                        {
                            socket.emit('information', "[INFO] Only the Admin may modify the news feed at this time.");
                        }
                    }
                    else if (message.lastIndexOf('/', 0) === 0)
                    {
                        inAFC = false; // is it matched by alterMessage?
                        for(var x = 0; x < commandsInAM.length; x++)
                        {
                            if(message.lastIndexOf(commandsInAM[x]) == 0)
                            {
                                inAFC = true
                            }
                        }

                        if(room)
                            socket.emit('chat message', alterMessage(message, user, socket, room, users));
                        else
                            socket.emit('chat message', alterMessage(message, user, socket, null, users));
                        if(!inAFC)
                        {
                            socket.emit('information', "[INFO] Command not recognized. Try /help for a list of commands.");
                        }
                    }
                    else if (room)
                    {
                        try
                        {
                            io.to(room.token).emit('chat message', alterMessage(message, user, socket, room, users), "eval");
                            privaterooms.remove(room);
                            room.lastchat = new Date().getTime();
                            privaterooms.push(room);
                        }
                        catch(e)
                        {
                            console.log(e)
                        }
                    }
                    else if (user.inBigChat)
                    {
                        try
                        {
                            if (user.AFK)
                            {
                                user.AFK = false;
                                io.to('bigroom').emit('afk', { nick: user.nick, AFK: false });
                            }
                            io.to('bigroom').emit('chat message', alterMessage(message, user, socket, null, users), "eval", user.nick);
                        }
                        catch(e)
                        {
                            console.log(e);
                        }
                    }
                    else
                    {
                        try
                        {
                            //user.partner.socket.emit('chat message', '<' + nick + '> ' + message);
                            //socket.emit('chat message', '<' + nick + '> ' + message);
                            user.partner.socket.emit('chat message',  alterMessage(message, user, socket, null, users), "them");
                            socket.emit('chat message', alterMessage(message, user, socket, null, users, false), "me");
                        }
                        catch(e)
                        {
                            console.log(e);
                        }
                    }
                }
            }
            catch (e)
            {
                console.log("@ " + ip + ": " + e.message);
            }
        });

        socket.on('disconnect', function()
        {
            if(room)
            {
                io.to(room.token).emit('information', "[INFO] " + nick + " has left.");
                for (var i = 0; i < room.here.length; i++)
                {
                    if (room.here[i].nick == nick)
                    {
                        room.here.remove(room.here[i]);
                        break;
                    }
                }
                io.to(room.token).emit('rosterupdate', generateRoster(room.here));
            }
            else
            {
                var user = getUserByNick(nick);
                if(user)
                {
                    users.remove(user);
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
                        io.to('bigroom').emit('rosterupdate', generateRoster(users));
                    }
                }
            }

            connections.remove(connection);
        });
        
        socket.on('reqnewroster', function() {
            
            socket.emit('rosterupdate', generateRoster(room ? room.here : users));
        });

        socket.on('AFK', function(data)
        {
            user = getUserByNick(data.nick);

            if (user && user.inBigChat)
            {
                for(var x = 0; x < users.length; x++)
                {
                    if(users[x] === user)
                    {
                        users[x].AFK = data.AFK
                    }
                }
                io.to('bigroom').emit('afk', { nick: data.nick, AFK: data.AFK });
            }
        });
        
        socket.on('newsmodsubmit', function(newsData)
        {
            try
            {
                var sender = getUserByNick(newsData.nick);
                if (newsData.password == adminP)
                {
                    var newNews = newsData.newNews.split('\n');
                    currentNews = newNews;
                    updateNewsFile();
                    for (var i = 0; i < users.length; i++)
                    {
                        users[i].socket.emit('newsupdate', { array: currentNews });
                    }
                }
                else
                {
                    console.log("WARNING @ "+sender+":"+ip+": Tried to change the news.");
                }
            }
            catch (e)
            {
                console.log("ERROR @ "+sender+":"+ip+": Invalid news data. "+e.message);
            }
            
        });
	}
	catch (e)
	{
		console.log(e);
		socket.conn.close();
	}
	
});


// ==================================
// ==================================

function sendMessage(information, message, user, room, socket)
{
	if (!information)
	{
		if(room)
		{
			io.to(room.token).emit('chat message', message, "eval");
		}
		else if(user.inBigChat)
		{
			if (user)
				io.to('bigroom').emit('chat message', message, "eval", user.nick);
			else
				io.to('bigroom').emit('chat message', message, "eval");
		}
		else
		{
			user.partner.socket.emit('chat message',  message, "them");
			socket.emit('chat message', message, "me");
		}	
	}
	else
	{
		if(room)
		{
			io.to(room.token).emit('information', message);
		}
		else if(user.inBigChat)
		{
			if (user)
				io.to('bigroom').emit('information', message, user.nick);
			else
				io.to('bigroom').emit('information', message);
		}
		else
		{
			user.partner.socket.emit('information', message);
			socket.emit('information', message);
		}
	}

}

// ==================================
// ==================================

function getAuthority(user){
    
    var toRet = "";
    
	if (user.nick == "MrMeapify")
    {
        toRet = "<img src='/images/creator.png' class='embedded_image' />";
    }
	else if (user.admin)
	{
		toRet = "<img src='/images/admin.png' class='embedded_image' />";
	}
	else if (user.mod)
	{
		toRet = "<img src='/images/mod.png' class='embedded_image' />";
	}
    
    return toRet;
}

function nameAppend(name, gender, role)
{
    name += " ";
	name += getGenderSymbol(gender); // put a gender symbol by the name
	name += getRoleSymbol(role); // put an arrow for subs and tists
	return name
}

function getGenderSymbol(gender)
{
    return (gender=="male") ? "♂" : ((gender=="female") ? "♀" : "?");
}

function getRoleSymbol(role)
{
    return (role=="tist") ? "↑" : ((role=="sub") ? "↓" : "↕");
}

function getUsers(users, room)
{
	var usercopy = users;
    if (room)
    {
        usercopy = room.users;
    }
	var list = "";
	for(var x = 0; x < usercopy.length; x++)
	{
		if(usercopy[x].inBigChat)
		{
			if (usercopy[x].AFK)
			{
				list += "'" + "<span  style='color: #777777;'>" + getAuthority(usercopy[x]) + nameAppend(usercopy[x].nick, usercopy[x].gender, usercopy[x].role) + "</span>" + "' ";
			}
			else
			{
				list += "'" + getAuthority(usercopy[x]) + nameAppend(usercopy[x].nick, usercopy[x].gender, usercopy[x].role) + "' ";
			}
		}
	}
	return list;
}

function generateRoster (from)
{
    var roster = [];
    for (var i = 0; i < from.length; i++)
    {
        if (from[i].inBigChat)
        {
            roster.push({ nick: from[i].nick, gender: getGenderSymbol(from[i].gender), role: getRoleSymbol(from[i].role), authority: getAuthority(from[i]), afk: from[i].AFK });
        }
    }
    
    return roster;
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

var helpPage1 = 	[['information', "[INFO] ~~~"],
					['information', "[INFO] Welcome to Sleepychat!"],
					['information', "[INFO] Sleepychat was created by MrMeapify, and is now operated by ElysianTail-Senpai."],
					['information', "[INFO] Help Page 1:"],
					['information', "[INFO] While in chat, you can use several commands:"],
					['information', "[INFO] -- /help -- Launches this message. Duh"],
					['information', "[INFO] -- /formatting -- Shows formatting tips."],
					['information', "[INFO] -- /news -- Re-opens the news ticker if it was closed."],
					['information', "[INFO] -- /ignore user -- Ignores all messages for a user."],
					['information', "[INFO] -- /names OR /list -- Toggles the username sidebar on PC, or prints a list of users in the room on mobile."],
					['information', "[INFO] -- /help 2 -- Shows page 2 of help."],
					['information', "[INFO] ~~~"]];

var helpPage2 = [['information', "[INFO] ~~~"],
                ['information', "[INFO] Help Page 2:"],
                ['information', "[INFO] -- /whois &lt;user&gt; -- Display sex and role information for a user."],
                ['information', "[INFO] -- /msg &lt;username&gt; &lt;message&gt; -- Sends a private message to the specified user."],
                ['information', "[INFO] -- /r OR /reply &lt;message&gt; -- Replies to the last user to privately message you."],
                ['information', "[INFO] -- /room &lt;user&gt; -- Requests a private chat with the specified user."],
                ['information', "[INFO] -- /createroom &lt;room name&gt; -- Creates a public room which multiple users can be invited to using\"/invite\"."],
                ['information', "[INFO] -- /invite &lt;room name&gt; &lt;username1 username2 usernameN&gt; -- Invites the specified user(s) to the specified public room."],
                ['information', "[INFO] -- /me &lt;did a thing&gt; -- Styles your message differently to indicate that you're doing an action."],
                ['information', "[INFO] -- /banana -- Sends a picture of banana cream pie."],
                ['information', "[INFO] -- /help 3 -- Shows page 3 of help."],
                ['information', "[INFO] ~~~"]];

var helpPage3 = [['information', "[INFO] ~~~"],
                ['information', "[INFO] Help Page 3:"],
                ['information', "[INFO] -- /coinflip -- Publicly flips a coin."],
                ['information', "[INFO] -- /roll &lt;number (optional)&gt; -- Publicly rolls up to 10 dice."],
                ['information', "[INFO] -- /mmsg &lt;message&gt; -- Sends a message to males only."],
                ['information', "[INFO] -- /fmsg &lt;message&gt; -- Sends a message to females only."],
                ['information', "[INFO] ~~~"]];

var modCommands = 	[['information', "[INFO] ~~~"],
					['information', "[INFO] Welcome, moderator!"],
					['information', "[INFO] "],
					['information', "[INFO] As a moderator, you can use several commands:"],
					['information', "[INFO] -- /modcmd -- Launches this message. Duh"],
					['information', "[INFO] -- /modroom -- Opens the private mod/admin-only room."],
					['information', "[INFO] -- /svrmsg &lt;message&gt; -- Displays the specified message to the entire server, including Match Maker and private rooms. This should be rarely used."],
					['information', "[INFO] -- /rmmsg &lt;message&gt; -- Displays the specified message to the big chat only."],
					['information', "[INFO] -- /mod &lt;message&gt; -- Sends a message to all moderators online, and the admin."],
					['information', "[INFO] -- /kick &lt;name&gt; -- Kicks the specified user from the chat, but does not ban them."],
					['information', "[INFO] -- /ban &lt;name&gt; &lt;days&gt; -- Bans the specified user for the specified number of days, based only on IP."],
					['information', "[INFO] -- /banname &lt;name&gt; &lt;days&gt; -- Bans the specified user for the specified number of days, based on both name and IP."],
					['information', "[INFO] -- /banip &lt;IP address&gt; &lt;days&gt; -- Bans the specified IP for the specified number of days, based only on IP."],
					['information', "[INFO] -- /banlist -- Lists the banned users and their IP addresses."],
					['information', "[INFO] -- /objection -- Displays the Ace Attourney \"Objection!\" gif."],
					['information', "[INFO] -- /holdit -- Displays the Ace Attourney \"Hold it!\" gif."],
					['information', "[INFO] ~~~"]];

var helpFormatting = [['information', "[INFO] ~~~"],
					['information', "[INFO] -- Text surrounded by double dash (--) is <strike>stricken through</strike>."],
					['information', "[INFO] -- Text surrounded by double underscore (__) is <u>underlined</u>."],
					['information', "[INFO] -- Text surrounded by double asterisk (**) is <strong>bolded</strong>."],
					['information', "[INFO] -- Text surrounded by single asterisk (*) is <i>italicized</i>."],
					['information', "[INFO] -- Text surrounded by single grave accents (`) is <span style='font-family: monospace'>monospaced</span>."],
					['information', "[INFO] -- Text surrounded by double grave accents (``) is <span style='font-family: Georgia, serif'>serif font</span>."],
					['information', "[INFO] ~~~"]];

var disallowedNames = [/(?:a|4)dm(?:i|!|1)n/gi,                             //Admin(istrator)
                       /(?:s|5)(?:l|i)(?:e|3)(?:e|3)pych(?:a|4)(?:t|7)/gi,  //Sleepychat
                       /(?:s|5)(?:e|3)rv(?:e|3)r/gi,                        //server
                       /g(?:o|0)d/gi,                                       //God
                       /J(?:e|3)(?:s|5)u(?:s|5)/gi,                         //Jesus
                       /(?:a|4)(?:l|i)(?:l|i)(?:a|4)(?:h)?/gi,              //Alla(h)
                       /buddh(?:a|4)/gi,                                    //Buddha
                       /(?:s|5)(?:a|4)(?:t|7)(?:a|4)n/gi,                   //Satan
                       /(?:l|i)uc(?:i|!|1)f(?:e|3)r/gi,                     //Lucifer
                       /n(?:i|!|1)gg(?:a|(?:e|3)r)/gi,                      //Nigg(a OR er)
                       /r(?:a|4)p(?:e|(?:i|!|1)(?:s|5)(?:t|7))/gi,          //Rap(e OR ist)
                       /r(?:a|4)c(?:i|!|1)(?:s|5)(?:t|7)/gi,                //Racist
                       /cun(?:t|7)/gi,                                      //Cunt
                       /c(?:_{1,9})?(?:o|0)(?:_{1,9})?v(?:_{1,9})?(?:e|3)(?:_{1,9})?r(?:_{1,9})?(?:t|7)/gi, //Covert
                       /all/gi                                              //all
                      ];

var disallowedPhrases = [/c(?:(?: |_){1,9})?(?:o|0)(?:(?: |_){1,9})?v(?:(?: |_){1,9})?(?:e|3)(?:(?: |_){1,9})?r(?:(?: |_){1,9})?(?:t|7)(?:(?: |_){1,9})?h(?:(?: |_){1,9})?y(?:(?: |_){1,9})?p(?:(?: |_){1,9})?n(?:(?: |_){1,9})?(?:o|0)(?:(?: |_){1,9})?(?:t|7)(?:(?: |_){1,9})?(?:i|!|1)(?:(?: |_){1,9})?(?:s|5)(?:(?: |_){1,9})?m/gi, //coverthypnotism
                         /n(?:i|!|1)gg(?:a|(?:e|3)r)/gi,        //Nigg(a OR er)
                         /cun(?:t|7)/gi,                        //Cunt
                        ];


function giveHelp(str, socket){
	if (str=="/help" || str=="/help 1")
	{
		for(var x = 0; x < helpPage1.length; x++)
			socket.emit(helpPage1[x][0], helpPage1[x][1]);
	}
    else if (str=="/help 2")
	{
		for(var x = 0; x < helpPage2.length; x++)
			socket.emit(helpPage2[x][0], helpPage2[x][1]);
	}
    else if (str=="/help 3")
	{
		for(var x = 0; x < helpPage3.length; x++)
			socket.emit(helpPage3[x][0], helpPage3[x][1]);
	}
	else if (str=="/formatting")
	{
		for (var x = 0; x < helpFormatting.length; x++)
			socket.emit(helpFormatting[x][0], helpFormatting[x][1]);
	}
}

function giveBanana()
{
	var rand = Math.floor(Math.random() * pies.length);
	var result = pies[rand];
	return "<img src='" + result + "' class='embedded_image' />"

}

// for dice rolling

function roll(){
	num = (Math.floor(Math.random() * (7 - 1)) + 1).toString()
    return "<img class='embedded_image' src='http://www.random.org/dice/dice" + num + ".png'/>";;
}

function rollx(times){
    ans = roll();
    for(var i = 1; i < times;) {
        ans = ans + " " + roll();
        i = i + 1
    }
    return ans;
}

function dice_replacer(match, p1, p2, offset, string){
    if (p1) {
    	if (p1 > 10)
    		return "ROLLS: " + rollx(10);
    	else
    		return "ROLLS: " + rollx(p1)}
    else {return "ROLL: " + roll();}
}


function link_replacer(match, p1, p2, offset, string)
{
    if ((p2 == '.jpg') || (p2 == '.jpeg') || (p2 == '.png')) {
		a = "<a tabindex='-1' target='_blank' href='http://"+p1+"'><img src='http://"+p1+"' class='embedded_image'/></a>";
	}
	else if ((p2 == '.gif')) {
		uniqueHiddenId++;
		a = "<img id='hiddenInd"+uniqueHiddenId.toString()+"' class='image_loader_link' src='/images/gif.png' onclick=\"loadGif("+uniqueHiddenId.toString()+", 'http://"+p1+"')\" />\n<a tabindex='-1' id=\"hiddenLnk"+uniqueHiddenId.toString()+"\" target='_blank' href=\"\" style=\"display:none\"><img class=\"embedded_image\" id=\"hiddenImg"+uniqueHiddenId.toString()+"\" src=\"\" onload=\"onGifLoaded("+uniqueHiddenId.toString()+")\" /></a>";
	}
	else if ((p2 == '.gifv')) {
		a = "<a tabindex='-1' href='http://"+p1+"' target='_blank'>\n<video poster='http://"+p1.substring(0, p1.length-5)+"h.jpg' preload='auto' autoplay='autoplay' muted='muted' loop='loop' class='embedded_image' style='vertical-align: middle;'>\n<source src='http://"+p1.substring(0, p1.length-4)+"mp4' type='video/mp4'>\n</video>\n</a>";
	}
    else {
		a = "<a tabindex='-1' target='_blank' href='http://"+p1+"'>"+(p1.length > 250 ? (p1.substring(0, 247)+"...") : p1)+"</a>";
	}
    return a;
}


function alterForFormatting(str, user)
{
	var ans = str; // Copies the variable so V8 can do it's optimizations.

	// regex's
	var banana = /^\/(?:(?:banana)|(?:banana-cream-pie))$/g; // Matches "/me " followed by anything
	var bold = /\*\*(.+?)\*\*/g; // Matches stuff between ** **
	var italics = /\*(.+?)\*/g; // Matches stuff between * *
	var underline = /__(.+?)__/g; // Matches stuff between __ __
	var strikethrough = /\-\-(.+?)\-\-/g; // Matches stuff between -- --
	var monospace = /\`(.+?)\`/g; // Matches stuff between ` `
	var serif = /\`\`(.+?)\`\`/g; // Matches stuff between `` ``


	var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi; //matches "google.com/" and "blog.google.com/" and but not P.H.D. For details, see http://pastebin.com/8zQJmt9N
	var subreddit = /\/r\/[A-Za-z0-9][A-Za-z0-9_]{2,20}[^ ]*/g; //matches /r/Hello
    var strawpoll = /http:\/\/strawpoll\.me\/([0-9]{6,10})(?:\/r)?/g; //matches http://strawpoll.me/*/r
    var youtube = /(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+(?:&|&#38;);v=))((?:\w|-|_){11})(?:(?:\?|&|&#38;)index=((?:\d){1,3}))?(?:(?:\?|&|&#38;)list=((?:\w|-|_){24}))?(?:\S+)?/g;

	var emoticons = /((?:\:\))|(?:XD)|(?:\:\()|(?:\:D)|(?:\:P)|(?:\:c)|(?:c\:)|(?:[oO]\.[oO])|(?:\>\:\))|(?:\>\:\()|(?:\:O)|(?:&#59\;\))|(?:&#59\;\())/;
    
    var ansCopy = ans;
    var changed = false;
    
    ansCopy = ansCopy.replace(strawpoll, "<span style=\"font-size: 24px; font-family: 'Sigmar One', sans-serif; color: #c83232; cursor: pointer;\" onclick=\"modalPoll('$1');\">Straw Poll <span style='font-size: 18px;'>(Click to vote!)</span></span>");
    
    ansCopy = ansCopy.replace(youtube, "^~$1~^~$3~^");
    
	var prevans = ansCopy;
	ansCopy = ansCopy.replace(link, link_replacer);
	if(ansCopy === prevans) // Only if the link replacer hasn't done anything yet.
		ansCopy = ansCopy.replace(subreddit, "<a tabindex='-1' target='_blank' href='http://www.reddit.com$&'>$&</a>");

	ansCopy = ansCopy.replace(banana, giveBanana()); // We have to do this *after* the link replacer
    
    changed = (ansCopy != ans);
    
    if (ansCopy == ans)
    {
        //implementations
        ans = ans.replace(bold, "<strong>$1</strong>"); 
        ans = ans.replace(italics, "<i>$1</i>"); 
        ans = ans.replace(underline, "<span style='text-decoration: underline;'>$1</span>"); 
        ans = ans.replace(strikethrough, "<span style='text-decoration: line-through;'>$1</span>"); 
        ans = ans.replace(serif, "<span style='font-family: Georgia, serif'>$1</span>"); 
        ans = ans.replace(monospace, "<span style='font-family: monospace'>$1</span>"); 
        ans = ans.replace(emoticons, "<strong>$&</strong>");
    }
    else
    {
        ans = ansCopy;
    }

	return ans
}



function alterForCommands(str, user, socket, room, users)
{
	var ans = str; // Copies the variable so V8 can do it's optimizations.
	

	// regex's
	var m_msg = /^\/mmsg (.+)/g; // Matches "/mmsg " followed by anything
	var f_msg = /^\/fmsg (.+)/g; // Matches "/fmsg " followed by anything
	var mod_msg = /^\/mod (.+)/g; // Matches "/fmsg " followed by anything
	var roll = /^\/roll ?([0-9]*)$/; // Matches "roll' or "roll " followed by a number 
	var binaural = /^\/binaural ?(\d*)?$/;
	var me = /^\/me( .*)/g; // Matches "/me " followed by anything

	// implementations

	//console.log(m_msg.test(ans) || f_msg.test(ans));

	mod_message = mod_msg.test(ans);
	
	female_message = f_msg.test(ans);
	male_message = m_msg.test(ans);
	//if (binaural.test(ans))
	//{
	//	function trigger(match, p1, p2, offset, string)
	//	{
	//		socket.emit('binaural', p1); // All "me" does is highlight the message, so we just use that
	//		return match
	//	}
	//	ans.replace(binaural, trigger);
	//}
	if (mod_message)
	{
		if (user.inBigChat && user.mod)
		{
			var userscopy = users;
			for(var x = 0; x < userscopy.length; x++)
			{
				if(userscopy[x].mod && userscopy[x].inBigChat)
				{
					var message = ans.replace(mod_msg, user.nick + alterForFormatting(" sent a mod-only message: $1", user.nick));
					userscopy[x].socket.emit('chat message', message, 'me'); // All "me" does is highlight the message, so we just use that
				}
			}
		}
		else
			if (!user.inBigChat)
			{
				socket.emit('chat message', ans, 'me');
				socket.emit('information', '[INFO] You need to be in the big chat to do mod messaging');
			}
		return null;
	}
	else if(male_message || female_message)
	{
		if (user.inBigChat)
		{
			var gender = male_message ? "male" : "female";
			var userscopy = users;
			for(var x = 0; x < userscopy.length; x++)
			{
				if(userscopy[x].gender === gender && userscopy[x].inBigChat)
				{
					if (gender == "male")
						var message = ans.replace(m_msg, user.nick + alterForFormatting(" sent a male-only message: $1", user.nick));
					else if (gender == "female")	// I know I don't need "if (gender == "female")" but it makes it easier to read
						var message = ans.replace(f_msg, user.nick + alterForFormatting(" sent a female-only message: $1", user.nick));
					userscopy[x].socket.emit('chat message', message, 'me'); // All "me" does is highlight the message, so we just use that
				}
			}
		}
		else
			if (!user.inBigChat)
			{
				socket.emit('chat message', ans, 'me');
				socket.emit('information', '[INFO] You need to be in the big chat to do gender messaging');
			}
		return null;
	}
	else if(roll.test(ans))
	{
		sendMessage(false, "&lt;"+user.nick+"&gt; "+ans, user, room, socket)
		sendMessage(true, ans.replace(roll, dice_replacer), user, room, socket)
		return null
	}
	else if (ans == "/names" || ans == "/list")
	{
		socket.emit('chat message', "&lt;"+user.nick+"&gt; "+ans, "me");
		socket.emit('information', "[INFO] Users in the chatroom: [ " + getUsers(users, room) + "]");
		return null;
	}
	else if (ans.substring(0, 5) == "/help" || ans == "/formatting")
	{
		socket.emit('chat message', "&lt;"+user.nick+"&gt; "+ans, "me");
		giveHelp(ans, socket);
		return null;
	}
	else if (ans == "/modcmd" && (user.mod || mod.admin))
	{
		socket.emit('chat message', "&lt;"+user.nick+"&gt; "+ans, "me");
		for(var x = 0; x < modCommands.length; x++)
			socket.emit(modCommands[x][0], modCommands[x][1]);
		return null;
	}
	else if (ans == "/afk")
	{
		socket.emit('chat message', "&lt;"+user.nick+"&gt; "+ans, "me");
		if (room)
			socket.emit('information', "[INFO] You can only do /afk in the public chat");
		else if (user.inBigChat)
		{
			if (!user.AFK)
			{
                user.AFK = true;
                io.to('bigroom').emit('afk', { nick: user.nick, AFK: user.AFK });
				io.to('bigroom').emit('information', "[INFO] " + user.nick + " is AFK.", user.nick);
			}
		}
		else
		{
			socket.emit('information', "[INFO] You can only do /afk in the public chat");
		}
		return null;
	}
	else if (me.test(ans))
	{
		sendMessage(false, ans.replace(me, "<span style='font-weight: 300'>*" + user.nick + " $1*</span>"), user, room, socket)
		return null
	}
	else  // For some reason MrMeapify doesn't want /me in /msg
	{
		if(user.nick && !me.test(ans)) // Empty string is falsey, so pass empty string to post a message without a user.nick.
		{
			return '&lt;' + user.nick + '&gt; ' + ans;
		}
		else
		{
			return ans; // Used for /msg command.
		}
	}
	return ans;
}


function alterMessage(str, user, socket, room, users, dontLog)
{
    if (dontLog != true)
    {
        if (room == null)
        {
            console.log("BC: " + user.nick + ": " + str);
        }
        else if (!room.isprivate)
        {
            console.log((room.token == "modroom" ? "MR: " : "PR: ") + user.nick + ": " + str);
        }
    }
	var formatted = alterForFormatting(str, user);
	var commanded = alterForCommands(formatted, user, socket, room, users);
	return commanded;
}


// ==================================
// ==================================

function testNick(nickToTest)
{
	var regex = /^[a-z0-9-_~]+$/i;
	
	if (typeof nickToTest == 'undefined' || nickToTest == null)
	{
		return "Undefined nickname!";
	}
	else if (nickToTest.length < 1)
	{
		return "Please type a nickname!";
	}
	else if (nickToTest.length > 64)
	{
		return "Nickname too long!";
	}
	else if (!regex.test(nickToTest))
	{
		return "Only letters, numbers, dash, underscore, and \"~\"!";
	}
	else
	{
        for (var i = 0; i < disallowedNames.length; i++)
        {
            disallowedNames[i].lastIndex = 0;
            if (disallowedNames[i].test(nickToTest))
            {
                return "This name is not allowed by the site.";
            }
        }
		return "";
	}
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

function getUserByIP(ip)
{
	var userscopy = users;
	for(var x = 0; x < userscopy.length; x++)
	{
		if(userscopy[x].realIp === ip)
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

function checkForBans(user, socket, ip)
{
	var splice = -1;
	
	for (var i = 0; i < banList.length; i++)
	{
        if (user.nick === "?" && ip === banList[i].ip)
        {
            var rightNow = new Date();
			var dayUnbanned = new Date(banList[i].date + (MILSEC_PER_DAY * banList[i].days));
			
			if (dayUnbanned > rightNow)
			{
				return banList[i];
			}
			else
			{
				splice = i;
				break;
			}
        }
        else if (user.nick === banList[i].name || ip === banList[i].ip)
		{
			var rightNow = new Date();
			var dayUnbanned = new Date(banList[i].date + (MILSEC_PER_DAY * banList[i].days));
			
			if (dayUnbanned > rightNow)
			{
				return banList[i];
			}
			else
			{
				splice = i;
				break;
			}
		}
	}
	
	if (splice > -1)
	{
		banList.remove(banList[splice]);
        updateBanList();
	}
	
	return null;
}

function updateBanList()
{
	var dataToWrite = "";
	
	for (var i = 0; i < banList.length; i++)
	{
		dataToWrite += banList[i].name + " " + banList[i].ip + " " + banList[i].days.toString() + " " + banList[i].date.toString();
		
		if (i < banList.length - 1)
		{
			dataToWrite += "\n";
		}
	}
    
    updateFile("Ban List.blt", dataToWrite);
}

function updateNewsFile()
{
	var dataToWrite = "";
	
	for (var i = 0; i < currentNews.length; i++)
	{
		dataToWrite += currentNews[i];
		
		if (i < currentNews.length - 1)
		{
			dataToWrite += "\n";
		}
	}
	
	updateFile("Current News.ndf", dataToWrite);
}

function updateFile(file, data)
{
    fs.writeFile(file, data, function(err) {
		if (err) console.log(err);
	});
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
		if((room.lastchat < new Date().getTime() - (MILSEC_PER_DAY / 4)) && room.token != 'modroom') // If the last chat message was over 6 hours ago.
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
app.use('/' + adminP, stats);
app.use('/room', privateroom);
app.use('/about', function(req, res)
{
	res.render('about');
});

/// catch 404 and render the 404 page
app.use(function(req, res, next){
  res.status(404);

  // respond with html page
  if (req.accepts('html')) {
    res.render('404', { url: req.url });
    return;
  }

  // respond with json
  if (req.accepts('json')) {
    res.send({ error: 'Not found' });
    return;
  }

  // default to plain-text. send()
  res.type('txt').send('Not found');
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