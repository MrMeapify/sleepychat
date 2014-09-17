var socket = io();
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
var sound = true;
var lastMessenger = "";

var date = new Date();
var timeSinceLastMessage = Date.now();
var isAFK = false;

//For Autocomplete
var users = [];

var ignore_list = [];

$.getScript('/javascripts/tabcomplete.js', function()
{
	$('#login-modal').modal({keyboard: false, backdrop: 'static'});
	$('#randomnick').click();
	var socket = io();

	$('#loginform').submit(function()
	{
		return false;
	});

	$('#mutebutton').click(function()
	{
		if(sound)
		{
			sound = false;
			$('#mutebutton').html('<i class="fa fa-volume-off"></i>');
		}
		else
		{
			sound = true;
			$('#mutebutton').html('<i class="fa fa-volume-up"></i>');
		}
	});

	socket.on('connect', function()
	{
		$('#loginsubmit').prop('disabled', false).removeClass('btn-default').addClass('btn-success').text('Start Matchmaking!');
		$('#bigchatsubmit').prop('disabled', false).removeClass('btn-default').addClass('btn-primary').text('Or join the big group chat!');
		$('#loginform').submit(function()
		{
			var nick = $('<div/>').text(($('#nickname').val())).html();

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

			socket.emit('login', { nick: nick, gender: gender, role: role, chatwith: chatwith, type: type });
			
			timeSinceLastMessage = Date.now();
			$('#login-modal').modal('hide');
			return false;
		});

		$('#bigchatsubmit').click(function()
		{
			bigchat = true;

			var nick2 = $('<div/>').text(($('#nickname').val())).html();

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

			socket.emit('login', { nick: nick2, gender: gender, role: role, chatwith: chatwith, type: type, inBigChat: true });
			

			$('#login-modal').modal('hide');
			return false;
		});
		
		socket.on('rosterupdate', function(newList)
		{
			users = newList;
			$('#m').tabcomplete(users);
		});
		
		socket.on('nickupdate', function(newnick)
		{
			nick = newnick;
		});
		
		socket.on('openroom', function(data)
		{
			var url = window.location.protocol + "//" + window.location.host + "/room/" + data.roomtoken + "/" + data.usertoken;
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + '[INFO] <a id="toclick" href="' + url + '" target="_blank">Click here to enter the private room.</a>' + "</span>"));
			setTimeout(function() { $('#toclick').click(); $('#toclick').attr("id","clicked"); }, 500);
		});
		
		socket.on('whisper', function(sender, msg)
		{
			if (msg){
				if(notify)
				{
					newTitle = "*** " + sender + " messaged you! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				
				var scroll_down = false;
				if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
				{
					scroll_down = true;
				}
				if(sender !== nick)
				{
					lastMessenger = sender;
			
					$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": *" + sender + " whispers: " + msg.substring(6 + msg.split(' ')[1].length) + "*"));
					$('#messages > li').filter(':last').addClass('highlight');
				}
				else
				{
					$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": *You whisper: " + msg.substring(6 + msg.split(' ')[1].length) + "*"));
					$('#messages > li').filter(':last').addClass('self');
				}
				
				scrollDown(scroll_down);
			}
		});

		socket.on('chat message', function(msg, who, userFrom)
		{
			if(msg)
			{
				if(notify)
				{
					if(sound)
						snd.play();
					if(bigchat)
						newTitle = "*** People are talking! ***";
					else
						newTitle = "*** " + lastChat + " messaged you! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}

				var scroll_down = false;
				if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
				{
					scroll_down = true;
				}

				$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": " + msg));
				var user = msg.match(/&lt;(.+)&gt;/);
				if(who === "me")
				{
					$('#messages > li').filter(':last').addClass('self');
				}
				else if(who === "eval" && msg.lastIndexOf('&lt;' + nick + '&gt;', 0) === 0)
				{
					$('#messages > li').filter(':last').addClass('self');
				}
				
				try
				{
					if(bigchat && msg.split('&gt;')[1].substring(1).indexOf(nick) != -1)
					{
						$('#messages > li').filter(':last').addClass('highlight');
					}
				}
				catch(e) {}
				
				if (userFrom && ignore_list.indexOf(userFrom) != -1)
				{
					$('#messages > li').filter(':last').hide();
				}
			}
		});
		socket.on('information', function(msg, userFrom)
		{
			if (msg)
			{
				if(notify)
				{
					if(sound)
						snd.play();
					newTitle = "*** New message! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				var scroll_down = false;
				if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
				{
					scroll_down = true;
				}
				if (!(userFrom && ignore_list.indexOf(userFrom) != -1))
				{
					$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + msg + "</span>"));
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
			var scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
			{
				scroll_down = true;
			}
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + themsg + "</span>"));
			scrollDown(scroll_down);
		});

		socket.on('disconnect', function()
		{
			if(notify)
			{
				if(sound)
					snd.play();
				newTitle = "*** Alert ***";
				clearInterval(interval);
				interval = setInterval(changeTitle, 1000);
			}
			var scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
			{
				scroll_down = true;
			}
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] Sorry! You seem to have been disconnected from the server. Please reload the page and try again.</span>"));
			scrollDown(scroll_down);
		});
	});

	socket.on('loggedIn', function()
	{
		loggedIn = true;
		timeSinceLastMessage = Date.now();
		if(bigchat)
		{
			$('#dcbutton').parent().hide();
			$('#sendbutton').removeAttr('disabled');
			$('#chatbar').unbind('submit');
			$('#chatbar').submit(function()
			{
				var msgInBox = $('#m').val();
				if (msgInBox.lastIndexOf("/r ", 0) === 0 || msgInBox.lastIndexOf("/reply ", 0) === 0)
				{
					if (lastMessenger !== "")
					{
						msgInBox = msgInBox.replace("/reply", "/msg " + lastMessenger);
						msgInBox = msgInBox.replace("/r", "/msg " + lastMessenger);
					}
				}
				socket.emit('chat message', { message: msgInBox });
				timeSinceLastMessage = Date.now();
				$('#m').val('');
				$('#mhint').val('');
				scrollDown(($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight));
				return false;
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
					var scroll_down = false;
					if ($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight)
					{
						scroll_down = true;
					}
					$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + msg + "</span>"));
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
			if (msgInBox.lastIndexOf("/r ", 0) === 0 || msgInBox.lastIndexOf("/reply ", 0) === 0)
			{
				if (lastMessenger !== "")
				{
					msgInBox = msgInBox.replace("/reply", "/msg " + lastMessenger);
					msgInBox = msgInBox.replace("/r", "/msg " + lastMessenger);
				}
			}
			socket.emit('chat message', { message: msgInBox });
			timeSinceLastMessage = Date.now();
			$('#m').val('');
			scrollDown(($(window).scrollTop() + $(window).height() + 300 >= $('body,html')[0].scrollHeight));
			return false;
		});
	});

	socket.on('rotate', function(toRotate, userFrom, hash, origintime)
	{
		if (userFrom && !ignore_list.indexOf(userFrom) != -1)
		{
			var rotates = toRotate.split(", ");
			var current = rotates[Math.floor(Math.random()*rotates.length)]
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": &lt;" + userFrom + '&gt; <span  id="'+ hash +'">' + current + "</span>"));

			var TimeBetweenMsgs = Math.max((rotates.reduce(function(previousValue, currentValue, index, array) 
			{
				return previousValue+(currentValue.length)
			}, 0)/rotates.length)*60, 300); // get the average string length, multiply it by 50, and if it's more than 300 return that, otherwise return 300
			(function(rotates, userFrom, hash, current) {
				var prev = current;
				var current = null;
				setInterval(function(){
					var rotemp = rotates.filter(function(i) {
						return i != prev
					}); // create a variable called rotemp, wich is the same as rotates, but without the previous value
					rotemp = rotemp.length ? rotemp : rotates; // if rotemp is empty (because it only contained one variable) then just use rotates
					current = rotemp[Math.floor(Math.random()*rotemp.length)];
					$('#'+hash).html(current);
					prev = current;
				}, TimeBetweenMsgs);
		    })(rotates, userFrom, hash, current); // We do this to create a new scope, so setInterval doesn't forget the vars
			console.log(toRotate.split(", "));
			console.log(toRotate);
		}
			
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

	var afkTime = 7*60*1000; // 7 minutes in milliseconds

	var afk = setInterval(function(){
		if(bigchat)
		{
			timenow = Date.now()
			if ((!isAFK) && (timenow - timeSinceLastMessage > afkTime)) // If we're not AFK, but we haven't said anything in 2 seconds, then mark ourselves as afk
		    {
		    	socket.emit('AFK', {isAFK: true, nick: nick, time: timenow - timeSinceLastMessage, inPrivate: false})
		    	isAFK = true;
		    }
		    else if(isAFK && (timenow - timeSinceLastMessage <= afkTime)) // If we're AFK, but we have said something in the last 2 seconds, then mark ourselves as not afk
		    {
		    	socket.emit('AFK', {isAFK: false, nick: nick, time: timenow - timeSinceLastMessage, inPrivate: false})
		    	isAFK = false;
		    }
		}

	}, 250);
	socket.on('afk', function(nick)
	{
		if(bigchat)
			timeSinceLastMessage = Date.now() - (afkTime+1000) // simulate the user not having typed something for 8 seconds
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


function scrollDown(scroll_down)
{
	if (scroll_down)
	{
		$('body,html').stop(true,true).animate({ scrollTop: $('body,html')[0].scrollHeight}, 500);
	}
}

window.onbeforeunload = confirmExit;
function confirmExit()
{
	if (chatting || bigchat)
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

$("#bugsandfeatures").click(function()
{
	window.location = "https://github.com/MrMeapify/sleepychat/issues";
});

$("#legalities").click(function()
{
	window.location = window.location.protocol + "//" + window.location.host + "/legal";
});

$('#randomnick').click(function()
{
	var adjs = ['Good', 'Mindless', 'Little', 'Tired', 'Wise', 'Dreamy', 'Sleepy', 'Blank', 'Enchanted', 'Enchanting', 'Entranced', 'Hypnotic', 'Bad', 'The', 'Hypnotized'];
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	$('#nickname').val(adjs[Math.floor(Math.random()*adjs.length)] + animals[Math.floor(Math.random()*animals.length)] + (Math.floor(Math.random() * (9 - 1)) + 1) + (Math.floor(Math.random() * (9 - 1)) + 1));
});

