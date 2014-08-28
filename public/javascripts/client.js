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

$(document).ready(function()
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
		var ignore_list = new Array()
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
			if(notify)
			{
				newTitle = "*** " + sender + " messaged you! ***";
				clearInterval(interval);
				interval = setInterval(changeTitle, 1000);
			}
			
			console.log(sender);
			console.log(sender.length);
			
			scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
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
		});

		socket.on('chat message', function(msg, who)
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

			scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
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
			
			if (user && ignore_list.indexOf(user[1]) != -1)
			{
				$('#messages > li').filter(':last').hide();
			}

			scrollDown(scroll_down);
		});

		socket.on('information', function(msg)
		{
			if(notify)
			{
				if(sound)
					snd.play();
				newTitle = "*** New message! ***";
				clearInterval(interval);
				interval = setInterval(changeTitle, 1000);
			}
			scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
			{
				scroll_down = true;
			}
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + msg + "</span>"));
			scrollDown(scroll_down);
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
			scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
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
			scroll_down = false;
			if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
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
				$('#m').val('');
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
					scroll_down = false;
					if ($(window).scrollTop() + $(window).height() + 50 >= $('body,html')[0].scrollHeight)
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
			$('#m').val('');
			return false;
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
		$('#bigchatsubmit').html('or join the big group chat! (' + stats.bigroom + ")");
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
});

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
