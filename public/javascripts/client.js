var socket = null;
var loggedIn = true;
var lastChat = "";
var chatting = false;
var nick = '';
var isOldTitle = true;
var oldTitle = "Sleepychat";
var newTitle = "*** New message! ***";
var interval = null;
var notify = false;
var snd = new Audio("/sounds/notify.ogg");
var newchatclickedonce = false;
var bigchat = false;
var soundMesg = true;
var soundMent = true;
var soundWhsp = true;
var soundJnLv = true;
var soundSite = true;
var denied = false;
var isDCd = false;

var disallowedNames = [/(?:a|4)dm(?:i|!|1)n/gi,                                                     //Admin(istrator)
                      /m(?:o|0)d(?:e|3)r(?:a|4)(?:t|7)(?:o|0)r/gi,                                  //Moderator
                      /(?:s|5)(?:l|i)(?:e|3)(?:e|3)pych(?:a|4)(?:t|7)/gi,                           //Sleepychat
                      /(?:s|5)(?:e|3)rv(?:e|3)r/gi,                                                 //server
                      /g(?:o|0)d/gi,                                                                //God
                      /J(?:e|3)(?:s|5)u(?:s|5)/gi,                                                  //Jesus
                      /(?:a|4)(?:l|i)(?:l|i)(?:a|4)(?:h)?/gi,                                       //Alla(h)
                      /buddh(?:a|4)/gi,                                                             //Buddha
                      /(?:s|5)(?:a|4)(?:t|7)(?:a|4)n/gi,                                            //Satan
                      /(?:l|i)uc(?:i|!|1)f(?:e|3)r/gi,                                              //Lucifer
                      /n(?:i|!|1)gg(?:e|3)r/gi,                                                     //Nigger
                      /r(?:a|4)p(?:e|(?:i|!|1)(?:s|5)(?:t|7))/gi,                                   //Rap(e OR ist)
                      /^all$/gi];                                                                   //all

//For chat section
var msgFrame = null;
var msgList = null;
var cutoffWithTicker = 74;
var cutoffWithoutTicker = 40;
var resizeInt = -1;

//For name section
var nameList = null;
var nameListWidthInit = 250;
var nameListWidth = nameListWidthInit;
var nameSidebar = true;
var isOnRight = true;

//For cookies!!!
var cookies = [];

//For the 18+ disclaimer
var wasConnectionAllowed = false;
var isOnDisclaimer = true;

//For YouTube Embedding
var gapiKey = "NOTLOADED";
var isGapiLoaded = false;
var isYapiLoaded = false;
var youTubeMatcher = /\^~([A-Za-z0-9-_]{11})~\^~(?:([A-Za-z0-9-_]{24}))?~\^?/g; // Matches the video ID between ^~ ~^, and optionally matches the playlist ID between ~ ~^

//For /r and /reply
var lastMessenger = "";

//For AFK
var date = new Date();
var timeSinceLastMessage = Date.now();
var AFK = false;

//For Day/Night Mode
var isDay = true;

//For news ticker
var currentNews = [];
var currentNewsInd = 0;
var newsTicker = true;
var initialNews = false;

//For Userlist
var users = null;
var sorting = "default";
var adminModsFirst = false;
var afkLast = true;

//For Autocomplete
var tcOptions = {
	minLength: 2
};

//For mobile detection
var mobileInitHeight = -1;
var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

var isConsole = {
    //TV Consoles
    Xbox360: function() {
        return navigator.userAgent.match(/Xbox/i) && !isConsole.XboxOne();
    },
    XboxOne: function() {
        return navigator.userAgent.match(/Xbox One/i);
    },
    PS3: function() {
        return navigator.userAgent.match(/PLAYSTATION 3/i);
    },
    PS4: function() {
        return navigator.userAgent.match(/PlayStation 4/i);
    },
    Wii: function() {
        return navigator.userAgent.match(/Nintendo Wii/i) && !isConsole.WiiU();
    },
    WiiU: function() {
        return navigator.userAgent.match(/Nintendo WiiU/i);
    },
    OUYA: function() {
        return navigator.userAgent.match(/OUYA/i);
    },
    // Handheld Consoles
    NintendoDS: function() {
        return navigator.userAgent.match(/Nintendo (?:3DS|DSi)/i);
    },
    VitaPSP: function() {
        return navigator.userAgent.match(/PlayStation (?:Portable|Vita)/i);
    },
    AnyTV: function() {
        return (isConsole.Xbox360() || isConsole.XboxOne() || isConsole.PS3() || isConsole.PS4() || isConsole.Wii() || isConsole.WiiU() || isConsole.OUYA());
    },
    AnyMobile: function() {
        return (isConsole.NintendoDS() || isConsole.VitaPSP());
    }
};

$(document).ready(function()
{
    msgFrame = $("#msgframe");
    nameList = $("#namelist");
    
    if (!isMobile.any())
    {
        window.onresize = function(event) {

            doResize();
        };
    }
    else
    {
        mobileInitHeight = window.innerHeight;
        nameListWidth = 0;
        nameList.remove();
        nameList = null;
        nameSidebar = false;
    }
    
    msgFrame.css("height", (window.innerHeight-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
    msgFrame.html("<div class='body'><ul id='messages'></ul></div>");
    msgList = msgFrame.contents().find("ul#messages");
    
    if (nameList != null)
    {
        nameList.css("height", (window.innerHeight-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
        nameList.css("width", (nameListWidth).toString()+"px");
    }
    
    // Cookies!!!
    parseCookies();
    
    if (getCookie("sidebar", "right") == "left" && !isMobile.any())
    {
        moveNameList();
    }
    if (getCookie("theme", "day") == "night")
    {
        toggleDayNight();
    }
    sorting = getCookie("sorting", "default");
    adminModsFirst = getCookie("sortadminmodsfirst", "false") == "true";
    afkLast = getCookie("sortafklast", "true") != "false";
    
    // Disclaimer setup
    if (getCookie("disclaimer", "show") == "show")
    {
        $('#disclaimer-modal').modal({keyboard: false, backdrop: 'static'});
        $('#accept-button').click(function() {

            isOnDisclaimer = false;
            $('#disclaimer-modal').modal('hide');
            setCookie("disclaimer", "accepted");
            if (wasConnectionAllowed)
            {
                $('#login-modal').modal({keyboard: false, backdrop: 'static'});
            }
        });
        $('#deny-button').click(function() {

            window.history.back();
        });
    }
    else
    {
        isOnDisclaimer = false;
    }
    
    // Sound setup
    $('#mesg-alerts').click(function () {
        
        soundMesg = this.checked;
        setCookie("soundMesg", soundMesg.toString());
    });
    $('#ment-alerts').click(function () {
        
        soundMent = this.checked;
        setCookie("soundMent", soundMent.toString());
    });
    $('#whsp-alerts').click(function () {
        
        soundWhsp = this.checked;
        setCookie("soundWhsp", soundWhsp.toString());
    });
    $('#jnlv-alerts').click(function () {
        
        soundJnLv = this.checked;
        setCookie("soundJnLv", soundJnLv.toString());
    });
    $('#site-alerts').click(function () {
        
        soundSite = this.checked;
        setCookie("soundSite", soundSite.toString());
    });
    setUpSound();
    
    setUpModal();
    
	socket = io("/", { reconnection: false, transport: ['websocket'] });

	$('#loginform').submit(function()
	{
		return false;
	});

	$('#mutebutton').click(function()
	{
        $('#sound-modal').modal({keyboard: true, backdrop: 'true'});
	});

	socket.on('connect', function()
	{
        
        $('#ticker-x').click(removeTicker);
        
        var errorLabel = document.getElementById('error-label');
		
		var ignore_list = new Array()
		$('#loginsubmit').prop('disabled', false).removeClass('btn-default').addClass('btn-success').text('Start Matchmaking!');
		$('#bigchatsubmit').prop('disabled', false).removeClass('btn-default').addClass('btn-primary').text('Or join the big group chat!');
		$('#nickname').on('input', function()
		{
			var inputNick = $('<div/>').text(($('#nickname').val())).html();
			
			var result = testNick(inputNick);
			errorLabel.innerHTML = result;
		});
		
		$('#loginsubmit').click(function()
		{
			var nick = $('<div/>').text(($('#nickname').val())).html();
			
			if (testNick(nick) != "")
			{
				console.log("Error: '" + nick + "' is not accepted!");
				return false;
			}
			
			var pass = $('<div/>').text(($('#passwordfield').val())).html();

			if($('#iammale').parent().hasClass('active'))
				var gender = 'male';
			else if($('#iamfemale').parent().hasClass('active'))
				var gender = 'female';
			else
				var gender = 'undisclosed';

			if($('#iamtist').parent().hasClass('active'))
				var role = 'tist';
			else if($('#iamsub').parent().hasClass('active'))
				var role = 'sub';
			else
				var role = 'switch';

			if($('#chatwithmales').parent().hasClass('active'))
				var chatwith = 'males';
			else if($('#chatwithfemales').parent().hasClass('active'))
				var chatwith = 'females';
			else
				var chatwith = 'either';

			if($('#iwantrp').parent().hasClass('active'))
				var type = 'roleplaying';
			else if($('#iwanthyp').parent().hasClass('active'))
				var type = 'hypnosis';
			else
				var type = 'either';

			socket.emit('login', { nick: nick, pass: pass, gender: gender, role: role, chatwith: chatwith, type: type, isMobile: isMobile.any(), nabbed: getCookie("nab", "nope") });
            
            saveModal();
            
            removeNameList();
			
			timeSinceLastMessage = Date.now();
			$('#login-modal').modal('hide');
			return false;
		});

		$('#loginform').submit(function()
		{
			bigchat = true;

			var nick2 = $('<div/>').text(($('#nickname').val())).html();
			
			if (testNick(nick2) != "")
			{
				console.log("Error: '" + nick + "' is not accepted!");
				return false;
			}
			
			var pass2 = $('<div/>').text(($('#passwordfield').val())).html();

			if($('#iammale').parent().hasClass('active'))
				var gender = 'male';
			else if($('#iamfemale').parent().hasClass('active'))
				var gender = 'female';
			else
				var gender = 'undisclosed';

			if($('#iamtist').parent().hasClass('active'))
				var role = 'tist';
			else if($('#iamsub').parent().hasClass('active'))
				var role = 'sub';
			else
				var role = 'switch';

			if($('#chatwithmales').parent().hasClass('active'))
				var chatwith = 'males';
			else if($('#chatwithfemales').parent().hasClass('active'))
				var chatwith = 'females';
			else
				var chatwith = 'either';

			if($('#iwantrp').parent().hasClass('active'))
				var type = 'roleplaying';
			else if($('#iwanthyp').parent().hasClass('active'))
				var type = 'hypnosis';
			else if($('#iwantgeneral').parent().hasClass('active'))
				var type = 'general';
			else
				var type = 'either';

			nick = nick2;

			socket.emit('login', { nick: nick2, pass: pass2, gender: gender, role: role, chatwith: chatwith, type: type, inBigChat: bigchat, isMobile: isMobile.any(), nabbed: getCookie("nab", "nope") });
            
            saveModal();

			$('#login-modal').modal('hide');
			return false;
		});
        
        socket.on('allow', function(connectionInfo)
		{
			if (!isOnDisclaimer)
            {
                $('#login-modal').modal({keyboard: false, backdrop: 'static'});
            }
            else
            {
                wasConnectionAllowed = true;
            }
            
            gapiKey = connectionInfo.keyString;
            if (!isYapiLoaded)
            {
                if (isGapiLoaded)
                {
                    youtubeApiLoad();
                }
                else
                {
                    console.log("Warining: Google API Script not yet loaded. Waiting...");
                }
            }
		});
		
		socket.on('denial', function(reason)
		{
			denied = true;
			msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] Your connection was refused. "+reason+"</span>"));
		});
        
        socket.on('nab', function(date)
        {
            setNabCookie(date);
            console.log('nabbed');
        });
        
        socket.on('newsmod', function(newsData)
        {
            msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\" id=\"newsspan"+newsData.id.toString()+"\">" + "<textarea class='form-control' id='newsmod"+newsData.id.toString()+"' rows='5' style='width: 500px;'>"+newsData.currentVal+"</textarea>Password: <input type='password' class='' id='newsmodpass"+newsData.id.toString()+"' /><button id='newsmodsubmit"+newsData.id.toString()+"'>Submit</button><button id='newsmodcancel"+newsData.id.toString()+"'>Cancel</button></span>"));
            
            $('#newsmodsubmit'+newsData.id.toString()).click(function() {
                
                var newNews = $('#newsmod'+newsData.id.toString()).val();
                var password = $('#newsmodpass'+newsData.id.toString()).val();
                socket.emit('newsmodsubmit', { nick: nick, password: password, newNews: newNews });
                
                var parentItem = document.getElementById('newsspan'+newsData.id.toString()).parentElement;
                parentItem.parentElement.removeChild(parentItem);
                msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] News changed.</span>"));
            });
            
            $('#newsmodcancel'+newsData.id.toString()).click(function() {
                
                var parentItem = document.getElementById('newsspan'+newsData.id.toString()).parentElement;
                parentItem.parentElement.removeChild(parentItem);
                msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] News mod cancelled.</span>"));
            });
        });
        
        socket.on('newsupdate', function(newNews)
        {
            currentNews = newNews.array;
            
            if (newsTicker)
            {
                $('#sc-news').vTicker('stop');

                $('#news-container').empty();
                for (var i = 0; i < currentNews.length; i++)
                {
                    $('#news-container').append($('<li>').html(currentNews[i]));
                }

                $('#sc-news').vTicker('init', { pause: 10000 });
            }
            
            if (initialNews)
            {
                msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] The news was updated!"+(newsTicker? "" : " Use \"/news\" to see it.")+"</span>"));
            }
            else
            {
                initialNews = true;
            }
        });
		
		socket.on('rosterupdate', function(newInfo)
		{
			users = newInfo;
            if (!isMobile.any())
            {
                updateNameList();
                
                var nicks = [];
                for (var i = 0; i < users.length; i++)
                {
                    nicks.push(users[i].nick);
                }
                
                var hadFocus = $("#m").is(":focus")
                $('#m').tabcomplete(nicks, tcOptions);
                if (hadFocus) { $('#m').focus(); }
            }
		});
		
		socket.on('nickupdate', function(newnick)
		{
			nick = newnick;
		});
		
		socket.on('openroom', function(data)
		{
			var url = window.location.protocol + "//" + window.location.host + "/room/" + data.roomtoken + "/" + data.usertoken;
			msgList.append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + '[INFO] <a id="toclick" href="' + url + '" target="_blank">Click here to enter the room.</a>' + "</span>"));
			setTimeout(function() { $('#toclick').click(); $('#toclick').attr("id","clicked"); }, 500);
		});
		
		socket.on('whisper', function(sender, receiver, msg)
		{
			if (msg){
                
                var scroll_down = isWithinScrollThreshold();
                
                if (youTubeMatcher.test(msg))
                {
                    youTubeMatcher.lastIndex = 0;
                    if (isConsole.Xbox360())
                    {
                        msg = msg.replace(youTubeMatcher, "YouTube Embedding Not Supported on Xbox 360. <a href='http://youtube.com/watch?v=$1' target='_blank' tabindex='-1'>Link to Video</a>");
                    }
                    else
                    {
                        var videoId = youTubeMatcher.exec(msg)[1];
                        youTubeMatcher.lastIndex = 0;
                        msg = msg.replace(youTubeMatcher, "<div class='yt-video-container yt-loader-container' videoid='$1' playlistid='$2'><div style='vertical-align: middle; text-align: center;'>"+(isYapiLoaded ? "Fetching Video Information..." : "YouTube API Not Loaded =/<br/><a href='http://youtube.com/watch?v=$1'>Link to Video</a>")+"</div></div>");
                        requestYouTubeEmbed(videoId);
                    }
                }
                
				if(sender !== nick)
				{
                    if (ignore_list.indexOf(sender) == -1)
                    {
                        lastMessenger = sender;

                        msgList.append($('<li class="highlight">').html(moment().format('h:mm:ss a') + ": *" + sender + " whispers: " + msg.substring(6 + msg.split(' ')[1].length) + "*"));
                        
                        if(notify)
                        {
                            if (soundWhsp)
                                snd.play();

                            newTitle = "*** " + sender + " messaged you! ***";
                            clearInterval(interval);
                            interval = setInterval(changeTitle, 1000);
                        }
                    }
				}
				else
				{
					msgList.append($('<li class="self">').html(moment().format('h:mm:ss a') + ": *You whisper to " + receiver + ": " + msg.substring(6 + msg.split(' ')[1].length) + "*"));
				}
				
				scrollDown(scroll_down);
			}
		});

		socket.on('chat message', function(msg, who, userFrom)
		{
			if(msg)
			{
				var scroll_down = isWithinScrollThreshold();
                
                if (youTubeMatcher.test(msg))
                {
                    youTubeMatcher.lastIndex = 0;
                    if (isConsole.Xbox360())
                    {
                        msg = msg.replace(youTubeMatcher, "YouTube Embedding Not Supported on Xbox 360. <a href='http://youtube.com/watch?v=$1' target='_blank' tabindex='-1'>Link to Video</a>");
                    }
                    else
                    {
                        var videoId = youTubeMatcher.exec(msg)[1];
                        youTubeMatcher.lastIndex = 0;
                        msg = msg.replace(youTubeMatcher, "<div class='yt-video-container yt-loader-container' videoid='$1' playlistid='$2'><div style='vertical-align: middle; text-align: center;'>"+(isYapiLoaded ? "Fetching Video Information..." : "YouTube API Not Loaded =/")+"</div></div>");
                        requestYouTubeEmbed(videoId);
                    }
                }
                
                var isMention = false;

				var msgClass = "";
				var user = msg.match(/&lt;(.+)&gt;/);
				if(who === "me")
				{
					msgClass+= 'self';
				}
				else if(who === "eval" && msg.lastIndexOf('&lt;' + nick + '&gt;', 0) === 0)
				{
					msgClass+= 'self';
				}
				
				try
				{
					if(bigchat && msg.split('&gt;')[1].substring(1).indexOf(nick) != -1)
					{
						msgClass+= (msgClass != "" ? " " : "")+'mention';
                        isMention = true;
					}
				}
				catch(e) {}
				
				if (userFrom && ignore_list.indexOf(userFrom) != -1)
				{
				}
                else
                {
                    msgList.append($('<li class="'+msgClass+'">').html(moment().format('h:mm:ss a') + ": " + msg));
                }

				if(notify)
				{
                    if (isMention)
                    {
                        if(soundMent)
					       	snd.play();
                    }
                    else
                    {
                        if(soundMesg)
                            snd.play();
                    }
					if(bigchat)
						newTitle = "*** People are talking! ***";
					else
						newTitle = "*** " + lastChat + " messaged you! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}

				scrollDown(scroll_down);
			}
		});
        
		socket.on('information', function(msg, userFrom)
		{
			if (msg)
			{
				if(notify)
				{
                    if (msg.indexOf("has joined.") != -1 || msg.indexOf("has left.") != -1 || msg.indexOf("is AFK.") != -1)
                    {
                        if (soundJnLv)
                            snd.play();
                    }
                    else if (msg.indexOf("[COINFLIP]") != -1 || msg.indexOf("ROLL") != -1)
                    {
                        if (soundMesg)
                            snd.play();
                    }
                    else
                    {
                        if (soundSite)
                            snd.play();
                    }
                    
					newTitle = "*** New message! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				var scroll_down = isWithinScrollThreshold();
				if (!(userFrom && ignore_list.indexOf(userFrom) != -1))
				{
					msgList.append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information"+(msg.indexOf("ROLL") == -1 ? " blocking" : "")+"\">" + msg + "</span>"));
					scrollDown(scroll_down);
				}

			}
		});

		socket.on('ignore', function(user)
		{
			ignore_list.push(user);
		});

		socket.on('partnerDC', function(nick)
		{
			chatting = false;
			$('#sendbutton').attr('disabled', true);
			var themsg = '[INFO] ' + nick + ' has disconnected from you.';
			var scroll_down = isWithinScrollThreshold();
			msgList.append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information blocking\">" + themsg + "</span>"));
			scrollDown(scroll_down);
		});

		socket.on('disconnect', function()
		{
			if(notify)
			{
				if(soundSite)
					snd.play();
				newTitle = "*** Alert ***";
				clearInterval(interval);
				interval = setInterval(changeTitle, 1000);
			}
			var scroll_down = isWithinScrollThreshold();
			if (!denied)
			{
				msgList.append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information blocking\">" + "[INFO] Sorry! You seem to have been disconnected from the server. Please reload the page and try again.</span>"));
			}
			scrollDown(scroll_down);
            isDCd = true;
		});
	});

	socket.on('loggedIn', function()
	{
		loggedIn = true;
		timeSinceLastMessage = Date.now();
		if(bigchat)
		{
            if (!isMobile.any())
            {
                $('#m').focus();
            }
			$('#dcbutton').parent().hide();
			$('#sendbutton').removeAttr('disabled');
			$('#chatbar').unbind('submit');
			$('#chatbar').submit(function()
			{
                var msgInBox = $('#m').val();
                if (msgInBox == "/news")
                {
                    if (!newsTicker)
                    {
                        replaceTicker();
                    }
                }
                else if (msgInBox == "/dialog")
                {
                    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
                }
                else if (msgInBox == "/help" || msgInBox == "/formatting")
                {
                    window.open('/commands');
                }
                else if ((msgInBox == "/list" || msgInBox == "/names") && !isMobile.any() && bigchat)
                {
                    if (!nameSidebar)
                    {
                        replaceNameList();
                    }
                    else
                    {
                        removeNameList();
                    }
                }
                else if (msgInBox != "" && !(/^ +$/.test(msgInBox)))
                {
                    socket.emit('chat message', { message: msgInBox });
                    scrollDown(($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight));
                    
                }
                $('#m').val('');
                $('#mhint').val('');
				return false;
			});
			
			$('#m').on('input', function()
			{
				var msgInBox = $('#m').val();
				if (msgInBox.lastIndexOf("/reply ", 0) === 0 && lastMessenger !== "")
				{
					$('#m').val(msgInBox.replace("/reply ", "/msg " + lastMessenger + " "));
				}
				
				if (msgInBox.lastIndexOf("/r ", 0) === 0 && lastMessenger !== "")
				{
					$('#m').val(msgInBox.replace("/r ", "/msg " + lastMessenger + " "));
				}
			});
		}
		else
		{
			$('#chatbar').submit(function()
			{
				return false;
			});
			socket.emit('getNewChat', { first: true });

		}
	});

	socket.on('newChat', function(nick)
	{
		lastChat = nick;
		chatting = true;
		$('#sendbutton').removeAttr('disabled');
		$('#dcbutton').removeAttr('disabled');
		$('#dcbutton').unbind('click');
		$('#dcbutton').click(function()
		{
			if(newchatclickedonce)
			{
				$('#dcbutton').button('reset');
				newchatclickedonce = false;
				socket.emit('getNewChat', { first: false, last: lastChat });
				$('#dcbutton').attr('disabled', true);
				$('#sendbutton').attr('disabled', true);
				if(chatting)
				{
					var msg = "[INFO] You have disconnected from " + lastChat + ".";
					var scroll_down = isWithinScrollThreshold();
					msgList.append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + msg + "</span>"));
					scrollDown(scroll_down);
				}
				chatting = false;
			}
			else
			{
				$('#dcbutton').button('really');
				newchatclickedonce = true;
				setTimeout(function ()
				{
					$('#dcbutton').button('reset');
					newchatclickedonce = false;
				}, 3000);
			}
		});
		$('#chatbar').unbind('submit');
		$('#chatbar').submit(function()
		{
            var msgInBox = $('#m').val();
            if (msgInBox == "/news")
            {
                if (!newsTicker)
                {
                    replaceTicker();
                }
                else
                {
                    removeTicker();
                }
            }
            else if (msgInBox == "/dialog")
            {
                $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
            }
            else if (msgInBox == "/help" || msgInBox == "/formatting")
            {
                window.open('/commands');
            }
            if ((msgInBox == "/list" || msgInBox == "/names") && !isMobile.any() && bigchat)
            {
                if (!nameSidebar)
                {
                    replaceNameList();
                }
                else
                {
                    removeNameList();
                }
            }
            else if (msgInBox != "" && !(/^ +$/.test(msgInBox)))
            {
                socket.emit('chat message', { message: msgInBox });
                scrollDown(($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight));
            }
            
			$('#m').val('');
			$('#mhint').val('');
			return false;
		});
		
		$('#m').on('input', function()
		{
			var msgInBox = $('#m').val();
			if (msgInBox.lastIndexOf("/reply ", 0) === 0 && lastMessenger !== "")
			{
				$('#m').val(msgInBox.replace("/reply ", "/msg " + lastMessenger + " "));
			}
			
			if (msgInBox.lastIndexOf("/r ", 0) === 0 && lastMessenger !== "")
			{
				$('#m').val(msgInBox.replace("/r ", "/msg " + lastMessenger + " "));
			}
		});
	});

	socket.on('stats', function(stats)
	{
		$('#iammale').parent().html('<input name="iamgender" id="iammale" type="radio"> ' + "Male (" + stats.gender.males + ")");
		$('#iamfemale').parent().html('<input name="iamgender" id="iamfemale" type="radio"> ' + "Female (" + stats.gender.females + ")");
		$('#iamundisclosed').parent().html('<input name="iamgender" id="iamundisclosed" type="radio"> ' + "Undisclosed (" + stats.gender.undisclosed + ")");
		$('#iamtist').parent().html('<input name="iamrole" id="iamtist" type="radio"> ' + "Hypnotist (" + stats.role.tist + ")");
		$('#iamsub').parent().html('<input name="iamrole" id="iamsub" type="radio"> ' + "Subject (" + stats.role.sub + ")");
		$('#iamswitch').parent().html('<input name="iamrole" id="iamswitch" type="radio"> ' + "Switch (" + stats.role.switchrole + ")");
		$('#bigchatsubmit').html('Or join the ' + randomAdjective() + ' public chat! (' + stats.bigroom + ")");
	});

	$(window).blur(function()
	{
		notify = true;
	});

	$(window).focus(function()
	{
		notify = false;
		clearInterval(interval);
		$("title").text(oldTitle);
	});

	var afkTime = 30*60*1000; // 30 minutes in milliseconds

	var afk = setInterval(function(){
		if(bigchat)
		{
			timenow = Date.now()
			if ((!AFK) && (timenow - timeSinceLastMessage > afkTime)) // If we're not AFK, but we haven't said anything in 30 minutes, mark us AFK.
		    {
		    	socket.emit('AFK', {AFK: true, nick: nick })
		    	AFK = true;
		    }
		}

	}, 1000);
    
	socket.on('afk', function(data)
	{
		if(bigchat && data.nick == nick)
        {
            AFK = data.AFK;
			timeSinceLastMessage = Date.now();
        }
        
        for (var i = 0; i < users.length; i++)
        {
            if (users[i].nick == data.nick)
            {
                users[i].afk = data.AFK;
                updateNameList();
            }
        }
	});

	//binaural beat setup
	var playing = false;
	var prevBeat = null;

	socket.on('binaural', function(BBeat)
	{
		if(!BBeat)
			var BBeat = 7;
			var prevBeat = 7; // If they just did /binaural we want to stop the binaurals if they're playing
		var frequency = 65;

		var leftear = (BBeat / 2) + frequency;
		var rightear = frequency - (BBeat / 2);
		if (playing && (prevBeat == BBeat))
		{
			stop();
			playing = false;
		}
		else
		{
			stop();
			SetupBeat(leftear,rightear);
			PlayBeat(BBeat,frequency);
			prevBeat = BBeat
			playing = true;
		}
	});
});

var audiolet = new Audiolet();
var out = audiolet.output;
var sine1,sine2,pan1,pan2,gain;

var SetupBeat = function(leftear,rightear){
	sine1 = new Sine(audiolet, leftear);
	sine2 = new Sine(audiolet, rightear);
	pan1 = new Pan(audiolet, 1);
	pan2 = new Pan(audiolet, 2); 
	gain = new Gain(audiolet, 0.5)
	sine1.connect(pan1);
	sine2.connect(pan2);
}

var PlayBeat = function(beat,frequency){
	beat = parseFloat(beat);
	frequency = parseFloat(frequency);
	var beat = beat / 2;
	var leftear = beat + frequency;
	var rightear = frequency - beat;
	stop();
	SetupBeat(leftear,rightear);
	start();
}

var start = function(){
	pan1.connect(gain);
	pan2.connect(gain);
	gain.connect(out);
}

var stop = function(){
	try
	{
		gain.disconnect(out);
	} catch (e) {}
}

function doResize() {
    
    msgFrame.css("height", (window.innerHeight-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    if (nameList != null)
    {
        nameList.css("height", (window.innerHeight-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    }
    msgFrame.css("width", (window.innerWidth-nameListWidth-32).toString()+"px");
    
    if (resizeInt != -1)
    {
        clearInterval(resizeInt);
    }
    
    resizeInt = setInterval(function() {
        
        msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
        clearInterval(resizeInt);
        resizeInt = -1;
    }, 100);
}

function isWithinScrollThreshold() {
    
    return (msgFrame.scrollTop() + msgFrame.height() + 300 >= msgFrame[0].scrollHeight);
}

function scrollDown(scroll_down)
{
	if (scroll_down)
	{
		msgFrame.stop(true,true).animate({ scrollTop: msgFrame[0].scrollHeight}, 500);
	}
}

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
                return "This name is not allowed.";
            }
        }
		return "";
	}
}

function replaceTicker()
{
    $('.page').append('<div class="ticker-bg" style="position: fixed; bottom: 40px; width: 100%; height: 34px; padding: 3px;">\n<button id="ticker-x" type="button" class="btn btn-default" style="padding-top: 3px; padding-bottom: 3px; color: #000000; float: right;">X</button>\n<div class="ticker-parent" style="position: relative; width: 97.5%;">\n<div id="sc-news" class="ticker" style="font: 1em Roboto, Helvetica, Arial;">\n<ul id="news-container">\n</ul>\n</div>\n</div>\n</div>');
    
    for (var i = 0; i < currentNews.length; i++)
    {
        $('#news-container').append($('<li>').html(currentNews[i]));
    }
    
    $('#ticker-x').click(removeTicker);
    $('#sc-news').vTicker('init', { pause: 10000 });
    newsTicker = true;
    msgFrame.css("height", ((isMobile.any() ? mobileInitHeight : window.innerHeight)-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    if (nameList != null) { nameList.css("height", ((isMobile.any() ? mobileInitHeight : window.innerHeight)-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px"); }
}

function removeTicker()
{
    $('#sc-news').vTicker('stop');
    var tickerDiv = document.getElementById('ticker-x').parentElement;
    tickerDiv.parentElement.removeChild(tickerDiv);
    newsTicker = false;
    msgFrame.css("height", ((isMobile.any() ? mobileInitHeight : window.innerHeight)-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    if (nameList != null) { nameList.css("height", ((isMobile.any() ? mobileInitHeight : window.innerHeight)-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px"); }
}

function replaceNameList()
{
    var scroll_down = isWithinScrollThreshold();
    msgFrame.before("<div class='list-"+(isOnRight ? "right" : "left")+"' id='namelist'></div>");
    nameListWidth = nameListWidthInit;
    msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
    nameList = $("#namelist");
    nameList.css("height", (window.innerHeight-(newsTicker ? cutoffWithTicker : cutoffWithoutTicker)).toString()+"px");
    nameList.css("width", (nameListWidth).toString()+"px");
    updateNameList();
    nameSidebar = true;
    scrollDown(scroll_down);
}

function removeNameList()
{
    if (nameList != null)
    {
        nameListWidth = 0;
        nameList.remove();
        nameList = null;
        msgFrame.css("width", (window.innerWidth-nameListWidth).toString()+"px");
        nameSidebar = false;
    }
}

function moveNameList()
{
    if (isOnRight)
    {
        nameList.removeClass("list-right");
        nameList.addClass("list-left");
    }
    else
    {
        nameList.removeClass("list-left");
        nameList.addClass("list-right");
    }
    isOnRight = !isOnRight;
    updateNameList();
    setCookie("sidebar", (isOnRight ? "right" : "left"));
}

function updateNameList()
{
    if (users != null)
    {

        users.sort(function(a, b) {
            var retVal = 0;
        
            if (sorting == "alpha")
            {
                var nickA=a.nick.toLowerCase(), nickB=b.nick.toLowerCase();
                if(nickA < nickB) retVal = -1;
                if(nickA > nickB) retVal = 1;
            }
        
            if (afkLast)
            {
                if(!a.afk && b.afk) retVal = -1;
                if(a.afk && !b.afk) retVal = 1;
            }
        
            if (adminModsFirst)
            {
                if(a.authority.indexOf("mod.png") != -1 && b.authority.indexOf("mod.png") == -1) retVal = -1;
                if(a.authority.indexOf("creator.png") != -1 && b.authority.indexOf("creator.png") == -1) retVal = -1;
                if(a.authority.indexOf("admin.png") != -1 && b.authority.indexOf("admin.png") == -1) retVal = -1;

                if(a.authority.indexOf("admin.png") == -1 && b.authority.indexOf("admin.png") != -1) retVal = 1;
                if(a.authority.indexOf("creator.png") == -1 && b.authority.indexOf("creator.png") != -1) retVal = 1;
                if(a.authority.indexOf("mod.png") == -1 && b.authority.indexOf("mod.png") != -1) retVal = 1;
            }
            
            return retVal;
        });
        
        var sidebarHtml = '<div class="btn-group" id="sidebar-buttons"><label id="sidebar-move" type="button" class="btn btn-default" onclick="moveNameList()">'+(isOnRight ? "&lt;" : "&gt;")+'</label><label id="sidebar-x" type="button" class="btn btn-default" onclick="removeNameList()">X</label></div><div class="dropdown" id="sidebar-sort-btn"><label id="sidebar-sort" type="button" class="btn btn-default" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Sorting <span class="caret"></span></label><ul class="dropdown-menu" style="padding: 5px;" role="menu aria-labelledby="sidebar-sort"><li class="dd-option" onclick="sortNameList(\'default\');">Join Order</li><li class="dd-option" onclick="sortNameList(\'alpha\');">Alphabetical</li><li><hr></li><li class="dd-option" onclick="sortNameList(\'adminmodsfirst\');">'+(adminModsFirst ? "&#9745" : "&#9744")+' Admin/Mods First</li><li class="dd-option" onclick="sortNameList(\'afklast\');">'+(afkLast ? "&#9745" : "&#9744")+' AFK Last</li></ul></div><br/><br/><h3 style="margin-top: 10px;">Users: '+users.length+'</h3><ul id="names">';
        for (var i = 0; i < users.length; i++)
        {
            sidebarHtml += "<li>"+"<span class='authority-tag'>"+users[i].authority+"</span><span  style='"+(users[i].afk ? "color: #777777;" : "")+"'>"+"<span class='gender-role-tags'>"+users[i].gender+users[i].role+"</span>"+users[i].nick+"</span></li>";
        }
        sidebarHtml += "</ul>";

        nameList.html(sidebarHtml);
    }
}

function sortNameList(type)
{
    if (type == "adminmodsfirst")
    {
        adminModsFirst = !adminModsFirst;
        setCookie("sortadminmodsfirst", adminModsFirst.toString());
    }
    else if (type == "afklast")
    {
        afkLast = !afkLast;
        setCookie("sortafklast", afkLast.toString());
    }
    else
    {
        setCookie("sorting", type);
        sorting = type;
    }
    socket.emit('reqnewroster');
}

function loadGif(id, url)
{
    document.getElementById("hiddenInd" + id.toString()).setAttribute("src", "/images/ldg.png");
    document.getElementById("hiddenInd" + id.toString()).setAttribute("onclick", "");
    document.getElementById("hiddenImg" + id.toString()).setAttribute("src", url);
    document.getElementById("hiddenLnk" + id.toString()).setAttribute("href", url);
}

function onGifLoaded(id) {
    document.getElementById("hiddenInd" + id.toString()).style.display = "none";
    document.getElementById("hiddenLnk" + id.toString()).style.display = "";
}

function togglePasswordField ()
{
    var pwField = document.getElementById('password');
    if (pwField.style.display == "none")
    {
        pwField.style.display = "";
    }
    else
    {
        pwField.style.display = "none";
    }
}

function toggleDayNight ()
{
    var stylesheet1 = $('#stylesheet1');
    var stylesheet2 = $('#stylesheet2');
    var stylesheet3 = $('#stylesheet3');
    var dayNightToggle = document.getElementById('daynbutton');
    var dayNightImage = document.getElementById('daynimage');
    //Text box
    var mainTextBox = document.getElementById('m');
    var hintTextBox = document.getElementById('mhint');
    
    var scrollValue = (isWithinScrollThreshold() ? -1 : msgFrame.scrollTop());
    
    if (isDay)
    {
        stylesheet1.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/bootstrap.min.css' id='stylesheet4' />");
        stylesheet2.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/bootstrap-theme.min.css' id='stylesheet5' />");
        stylesheet3.after("<link rel='stylesheet' type='text/css' href='/stylesheets/night/style.css' id='stylesheet6' />");
    }
    else
    {
        $('#stylesheet4').remove();
        $('#stylesheet5').remove();
        $('#stylesheet6').remove();
        
    };
    dayNightImage.setAttribute('src', '/images/'+(isDay ? "day" : "night")+'.png');
    if (hintTextBox) { hintTextBox.style.backgroundColor = (isDay ? "#222222" : "#ffffff"); }
    mainTextBox.style.color = (isDay ? "#ffffff" : "#000000");
    isDay = !isDay;
    setCookie("theme", (isDay ? "day" : "night"));
    if (scrollValue == -1)
    {
        scrollDown(true);
    }
    else
    {
        msgFrame.scrollTop(scrollValue);
    }
    
    doResize();
}

// ----------
// Cookies!!!
// ----------

function setUpSound () {
    
    soundMesg = getCookie("soundMesg", "true") == "true";
    soundMent = getCookie("soundMent", "true") == "true";
    soundWhsp = getCookie("soundWhsp", "true") == "true";
    soundJnLv = getCookie("soundJnLv", "true") == "true";
    soundSite = getCookie("soundSite", "true") == "true";
    $('#mesg-alerts').prop('checked', soundMesg);
    $('#ment-alerts').prop('checked', soundMent);
    $('#whsp-alerts').prop('checked', soundWhsp);
    $('#jnlv-alerts').prop('checked', soundJnLv);
    $('#site-alerts').prop('checked', soundSite);
}

function setUpModal () {
    
    var cookieName = getCookie("username", "");
    if (cookieName == "")
    {
	   $('#randomnick').click();
    }
    else
    {
        $('#nickname').val(cookieName);
    }
    
    var cookieGender = getCookie("gender", "undisclosed");
    $('#iam'+cookieGender).click();
    
    var cookieRole = getCookie("role", "swtich");
    $('#iam'+cookieRole).click();
    
    var cookiePrefer = getCookie("prefer", "either");
    $('#chatwith'+cookiePrefer).click();
    
    var cookieHypRp = getCookie("chatfor", "either");
    $('#iwant'+cookieHypRp).click();
    
    var cookiePassword = getCookie("password", "none");
    document.getElementById('password').style.display = cookiePassword;
}

function saveModal () {
    
    var cookieName = $('#nickname').val();
    var cookieGender = ($('#iammale').parent().hasClass('active') ? "male" : ($('#iamfemale').parent().hasClass('active') ? "female" : "undisclosed"));
    var cookieRole = ($('#iamtist').parent().hasClass('active') ? "tist" : ($('#iamsub').parent().hasClass('active') ? "sub" : "switch"));
    var cookiePrefer = ($('#chatwithmales').parent().hasClass('active') ? "males" : ($('#chatwithfemales').parent().hasClass('active') ? "females" : "either"));
    var cookieHypRp = ($('#iwantrp').parent().hasClass('active') ? "rp" : ($('#iwanthyp').parent().hasClass('active') ? "hyp" : "either"));
    var cookiePassword = document.getElementById('password').style.display;
    
    setCookie("username", cookieName);
    setCookie("gender", cookieGender);
    setCookie("role", cookieRole);
    setCookie("prefer", cookiePrefer);
    setCookie("chatfor", cookieHypRp);
    setCookie("password", cookiePassword);
}

// --------------
// For Straw Poll
// --------------
function modalPoll(pollId) {
    
    $('#iframe-modal-body').html("<iframe src='http://strawpoll.me/embed_1/"+pollId+"' style='width: 800px; height: 496px; border: 0; display: block; margin: auto;'>Loading poll...</iframe>");
    $('#iframe-modal-title').text("Straw Poll - Vote Now!");
    
    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
}

// -----------
// For YouTube
// -----------
function modalYouTube(videoId, playlistId) {
    
    $('#iframe-modal-body').html("<iframe width='800' height='450' style='display: block; margin: auto;' src='http://www.youtube.com/embed/"+videoId+(playlistId != "" ? ("?list="+playlistId) : "")+"' frameborder='0' allowfullscreen></iframe>");
    $('#iframe-modal-title').text("YouTube");
    
    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
}

function requestYouTubeEmbed (videoId) {
    
    if (isYapiLoaded)
    {
        gapi.client.youtube.videos.list({ part: "snippet,contentDetails,status,player,statistics", id: videoId}).then(youtubeRequestSucceeded, youtubeRequestFailed);
    }
    else
    {
        console.log("ERROR: Request attempted, but YouTube's API isn't loaded!")
    }
}

function youtubeApiLoad() {
    
    isGapiLoaded = true;
    if (gapiKey != "NOKEY" && gapiKey != "NOTLOADED")
    {
        gapi.client.setApiKey(gapiKey);
        gapi.client.load('youtube', 'v3', function() {
            isYapiLoaded = true;
            console.log('YouTube API v3 Loaded.');
        });
    }
    else if (gapiKey == "NOTLOADED")
    {
        console.log('Warning: YT API Key Not Yet Received. Will reattempt after connection to server.');
    }
    else
    {
        console.log('ERROR: YT API Key Invalid.');
    }
    
    gapiKey = "";
}

function youtubeRequestSucceeded (resp) {
    
    console.log(resp.result);
    
    var resultingVideo = resp.result.items[0];
    var loadingContainers = document.getElementsByClassName('yt-loader-container');
    var correctContainer = null;
    
    for (var i = 0; i < loadingContainers.length; i++)
    {
        if (loadingContainers[i].getAttribute('videoid') == resultingVideo.id)
        {
            correctContainer = loadingContainers[i];
            break;
        }
    }
    
    if (correctContainer == null)
    {
        console.log('ERROR: Loading container not found for id: ' + resultingVideo.id);
    }
    
    if (/*resultingVideo.processingDetails.processingStatus == "succeeded"*/true) // Need to find out which requests only require the API key and not OAuth.
    {
        correctContainer.className = "";
        correctContainer.style.verticalAlign = "middle";
        correctContainer.style.display = "inline-block";
        
        var id = resultingVideo.id;
        var playlist = correctContainer.getAttribute('playlistid');
        var title = resultingVideo.snippet.title;
        var channel = resultingVideo.snippet.channelTitle;
        var channelLink = "http://www.youtube.com/channel/"+resultingVideo.snippet.channelId;
        
        var description = resultingVideo.snippet.description;
        var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi;
        description = description.replace(link, "<a tabindex='-1' target='_blank' href='http://$1'>$1</a>");
        description = description.replace("\n", "<br />");
        
        var views = resultingVideo.statistics.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        var length = resultingVideo.contentDetails.duration;
        var durationRegex = /PT(?:([0-9]{1,2})H)?(?:([0-9]{1,2})M)?(?:([0-9]{1,2})S)?/g;
        var hours = length.replace(durationRegex, "$1");
        var minutes = length.replace(durationRegex, "$2");
        var seconds = length.replace(durationRegex, "$3");
        
        if (length == "P1D")
        {
            length = "1 Day (Why?)";
        }
        else
        {
            length = (hours != "" ? hours+":" : "");
            length += (hours != "" ? (minutes != "" ? (minutes.length < 2 ? "0"+minutes : minutes) : "00") : (minutes != "" ? minutes : "0"))+":";
            length += (seconds.length < 2 ? (seconds.length < 1 ? "00" : "0"+seconds) : seconds);
        }
        
        var displayString = "<div class='yt-video-container'>\n<div class='yt-thumbnail'>\n<a target='_blank' class='yt-thumbnail-imglink' href='http://www.youtube.com/watch?v="+id+"'>\n<span class='yt-thumbnail-imgspan'>\n<img class='yt-thumbnail-img' src='http://i.ytimg.com/vi/"+id+"/mqdefault.jpg' />\n</span>\n<span class='yt-thumbnail-time'>"+length+"</span>\n</a>\n</div>\n<div class='yt-details'>\n<h3 class='yt-details-title'><a target='_blank' href='http://www.youtube.com/watch?v="+id+"'>"+title+"</a></h3>\n<div style='display: block; margin: 5px 0 0;'>\n<ul class='yt-details-meta'>\n<li style='padding: 0px;'>by <a target='_blank' href='"+channelLink+"'>"+channel+"</a></li>\n<li style='padding: 0px;'>"+views+" views</li>\n</ul>\n</div>\n<div class='yt-details-desc'>"+description+"</div>\n</div>\n</div>";
        var embedString = resultingVideo.status.embeddable ? "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+" playlistid='"+playlist+"'>\n<img src='/images/yt-play-embedded.png' style='cursor: pointer;' onclick='modalYouTube(\""+id+"\", \""+playlist+"\")' />\n</div>" : "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+" playlistid='"+playlist+"'>\n<img src='/images/yt-cant-embed.png' />\n</div>";
        
        correctContainer.innerHTML = displayString+embedString;
    }
    else
    {
        correctContainer.innerHTML = "<span style='vertical-align: middle; text-align: center;'>Video Not Processed.</span>";
    }
}

function youtubeRequestFailed (reason) {
    
    isYapiLoaded = false;
    console.log("Error: " + reason.result.message);
    var loadingContainers = document.getElementsByClassName('yt-loader-container');
    
    for (var i = 0; i < loadingContainers.length; i++)
    {
        loadingContainers[i].innerHTML = "YouTube API Not Loaded =/"
    }
}
// -----------
// Regex Stuff
// -----------
function link_replacer(match, p1, p2, offset, string)
{
    return "<a tabindex='-1' target='_blank' href='http://"+p1+"'>"+p1+"</a>";
}

window.onbeforeunload = confirmExit;
function confirmExit()
{
	if ((chatting || bigchat) && !isDCd)
		return "Wait, you're still in a chat session!";
}

function changeTitle()
{
	document.title = isOldTitle ? oldTitle : newTitle;
	isOldTitle = !isOldTitle;
}

function randomAdjective(){
	var adjs = ['adaptable', 'adventurous', 'affable', 'affectionate', 'agreeable', 'ambitious', 'amiable', 'amicable', 'amusing', 'brave', 'bright', 'broad-minded', 'calm', 'charming', 'communicative', 'compassionate ', 'conscientious', 'considerate', 'convivial', 'courageous', 'courteous', 'creative', 'decisive', 'determined', 'diligent', 'diplomatic', 'discreet', 'dynamic', 'easygoing', 'emotional', 'energetic', 'enthusiastic', 'exuberant', 'fair-minded', 'faithful', 'fearless', 'forceful', 'frank', 'friendly', 'funny', 'generous', 'gentle', 'good', 'gregarious', 'hard-working', 'helpful', 'honest', 'humorous', 'imaginative', 'impartial', 'independent', 'intellectual', 'intelligent', 'intuitive', 'inventive', 'kind', 'loving', 'loyal', 'modest', 'neat', 'nice', 'optimistic', 'passionate', 'patient', 'persistent ', 'pioneering', 'philosophical', 'placid', 'plucky', 'polite', 'powerful', 'practical', 'pro-active', 'quick-witted', 'quiet', 'rational', 'reliable', 'reserved', 'resourceful', 'romantic', 'self-confident', 'sensible', 'sensitive', 'sociable', 'straightforward', 'thoughtful', 'unassuming', 'understanding', 'versatile', 'warmhearted', 'willing', 'witty', 'mysterious', 'incredible', 'amazing', 'stupefying', 'unbelieveable', 'mind-blowing'];
	return adjs[Math.floor(Math.random()*adjs.length)]
}

$("#about").click(function()
{
	window.open('/about');
});

$('#randomnick').click(function()
{
	var adjs = ['Good', 'Mindless', 'Little', 'Tired', 'Wise', 'Dreamy', 'Sleepy', 'Blank', 'Enchanted', 'Enchanting', 'Entranced', 'Hypnotic', 'Bad', 'The', 'Hypnotized'];
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	$('#nickname').val(adjs[Math.floor(Math.random()*adjs.length)] + animals[Math.floor(Math.random()*animals.length)] + (Math.floor(Math.random() * (9 - 1)) + 1) + (Math.floor(Math.random() * (9 - 1)) + 1));
});
