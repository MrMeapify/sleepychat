var socket = io();
var isOldTitle = true;
var oldTitle = "Sleepychat - Private Room";
var newTitle = "*** New message! ***";
var interval = null;
var notify = false;
var snd = new Audio("/sounds/notify.ogg");
var sound = true;

var args = window.location.pathname.split('/');
var roomtoken = args[2];
var usertoken = args[3];

var date = new Date();
var timeSinceLastMessage = Date.now();
var isAFK = false;

$(document).ready(function()
{
	var socket = io();
	
	$('#chatbar').unbind('submit');
	$('#chatbar').submit(function()
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
		$('#chatbar').unbind('submit');
		$('#chatbar').submit(function()
		{
			socket.emit('chat message', { message: $('#m').val() });
			timeSinceLastMessage = Date.now();
			$('#m').val('');
			return false;
		});
		
		socket.on('chat message', function(msg, who)
		{
			if(msg)
			{
				if(notify)
				{
					if(sound)
						snd.play();
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": " + msg));
				if (who === "me")
				{
					$('#messages > li').filter(':last').addClass('self');
				}
				else if(who === "eval" && msg.lastIndexOf('<' + nick + '>', 0) === 0)
				{
					$('#messages > li').filter(':last').addClass('self');
				}
				
				scrollDown();
			}
		});
		
		socket.on('nickupdate', function(newnick)
		{
			nick = newnick;
		});

		socket.on('information', function(msg)
		{
			if(msg)
			{
				if(notify)
				{
					if(sound)
						snd.play();
					newTitle = "*** New message! ***";
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
				$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ": <span class=\"information\">" + msg + "</span>"));
				scrollDown();
			}
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
			$('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] Sorry! You seem to have been disconnected from the server. Please reload the page to resume chatting.</span>"));
			scrollDown();
		});
		
		socket.emit('joinroom', roomtoken, usertoken);
		timeSinceLastMessage = Date.now();
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

function scrollDown()
{
	$('body,html').stop(true,true).animate({ scrollTop: $('body,html')[0].scrollHeight}, 500);
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