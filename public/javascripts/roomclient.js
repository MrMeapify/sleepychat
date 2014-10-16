var socket = io();
var isOldTitle = true;
var oldTitle = "Hypnochat - Private Room";
var newTitle = "*** New message! ***";
var interval = null;
var notify = false;
var snd = new Audio("/sounds/notify.ogg");
var soundMesg = true;
var soundSite = true;

var isDay = true;

var args = window.location.pathname.split('/');
var roomtoken = args[2];
var usertoken = args[3];

var date = new Date();
var timeSinceLastMessage = Date.now();
var isAFK = false;

//For YouTube Embedding
var apiKey = "NOTLOADED";
var isYapiLoaded = false;
var youTubeMatcher = /\^~([A-Za-z0-9-_]{11})~\^/g; // Matches stuff between ^~ ~^

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

$(document).ready(function()
{
    if (!isMobile.any())
    {
        $('#m').focus();
    }
    
    $('#mesg-alerts').click(function () {
        
        soundMesg = this.checked;
    });
    
    $('#site-alerts').click(function () {
        
        soundSite = this.checked;
    });
    
	var socket = io();
	
	$('#chatbar').unbind('submit');
	$('#chatbar').submit(function()
	{
		return false;
	});
	
	$('#mutebutton').click(function()
	{
		$('#sound-modal').modal({keyboard: true, backdrop: 'true'});
	});

	socket.on('connect', function()
	{
		$('#chatbar').unbind('submit');
		$('#chatbar').submit(function()
		{
            var msgInBox = $('#m').val();
            
            if (msgInBox == "/dialog")
            {
                $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
            }
            else
            {
                socket.emit('chat message', { message: msgInBox });
                timeSinceLastMessage = Date.now();
            }
            
			$('#m').val('');
			return false;
		});
        
        socket.on('allow', function(googleApiKey)
		{
			apiKey = googleApiKey.keyString;
            if (!isYapiLoaded)
            {
                youtubeApiLoad();
            }
		});
		
		socket.on('chat message', function(msg, who)
		{
			if(msg)
			{
				if(notify)
				{
					if(soundMesg)
						snd.play();
					clearInterval(interval);
					interval = setInterval(changeTitle, 1000);
				}
                
                if (youTubeMatcher.test(msg))
                {
                    youTubeMatcher.lastIndex = 0;
                    var videoId = youTubeMatcher.exec(msg)[1];
                    youTubeMatcher.lastIndex = 0;
                    msg = msg.replace(youTubeMatcher, "<div class='yt-video-container yt-loader-container' videoid='$1'><div style='vertical-align: middle; text-align: center;'>"+(isYapiLoaded ? "Fetching Video Information..." : "YouTube API Not Loaded =/")+"</div></div>");
                    requestYouTubeEmbed(videoId);
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
					if(soundSite)
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
				if(soundSite)
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

	//binaural beat setup
	var playing = false;
	var prevBeat = null;

	socket.on('binaural', function(BBeat)
	{
		if(!BBeat)
			var BBeat = 7;
			var prevBeat = 7; // If they just did /binaural we want to stop the binaurals if they're playing
		console.log(BBeat)
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


function scrollDown()
{
	$('body,html').stop(true,true).animate({ scrollTop: $('body,html')[0].scrollHeight}, 500);
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

function toggleDayNight ()
{
    var stylesheet1 = document.getElementById('stylesheet1');
    var stylesheet2 = document.getElementById('stylesheet2');
    var dayNightToggle = document.getElementById('daynbutton');
    var dayNightImage = document.getElementById('daynimage');
    //Text box
    var mainTextBox = document.getElementById('m');
    var hintTextBox = document.getElementById('mhint');

    if (isDay)
    {
        stylesheet1.setAttribute('href', '/stylesheets/bootstrap-night.min.css');
        stylesheet2.setAttribute('href', '/stylesheets/style-night.css');
        dayNightImage.setAttribute('src', '/images/day.png');
        hintTextBox.style.backgroundColor = '#222222';
        mainTextBox.style.color = '#ffffff';
        isDay = false;
    }
    else if (!isHalloween)
    {
        stylesheet1.setAttribute('href', '/stylesheets/bootstrap.min.css');
        stylesheet2.setAttribute('href', '/stylesheets/style.css');
        dayNightImage.setAttribute('src', '/images/night.png');
        hintTextBox.style.backgroundColor = '#ffffff';
        mainTextBox.style.color = '#000000';
        isDay = true;
    }
    else
    {
        var scroll_down = isWithinScrollThreshold();
        $('#messages').append($('<li>').html(moment().format('h:mm:ss a') + ":  <span class=\"information\">" + "[INFO] You're in Halloween Mode. Use \"/halloween\" to turn it off.</span>"));
        scrollDown(scroll_down);
    }
}

// --------------
// For Straw Poll
// --------------
function modalPoll(pollId) {
    
    $('#iframe-modal-body').html("<iframe src='http://strawpoll.me/embed_1/"+pollId+"/r' style='width: 800px; height: 496px; border: 0; display: block; margin: auto;'>Loading poll...</iframe>");
    $('#iframe-modal-title').text("Straw Poll - Vote Now!");
    
    $('#iframe-modal').modal({keyboard: true, backdrop: 'true'});
}

// -----------
// For YouTube
// -----------
function modalYouTube(videoId) {
    
    $('#iframe-modal-body').html("<iframe width='800' height='450' style='display: block; margin: auto;' src='http://www.youtube.com/embed/"+videoId+"' frameborder='0' allowfullscreen></iframe>");
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
    
    if (apiKey != "NOKEY" && apiKey != "NOTLOADED")
    {
        gapi.client.setApiKey(apiKey);
        gapi.client.load('youtube', 'v3', function() {
            isYapiLoaded = true;
            console.log('YouTube API v3 Loaded.');
        });
    }
    else if (apiKey == "NOTLOADED")
    {
        console.log('Warning: YT API Key Not Yet Received. Will reattempt after connection to server.');
    }
    else
    {
        console.log('ERROR: YT API Key Invalid.');
    }
    
    apiKey = "";
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
    
    if (/*resultingVideo.processingDetails.processingStatus == "succeeded"*/true)
    {
        correctContainer.className = "";
        correctContainer.style.verticalAlign = "middle";
        correctContainer.style.display = "inline-block";
        
        var id = resultingVideo.id;
        var title = resultingVideo.snippet.title;
        var channel = resultingVideo.snippet.channelTitle;
        var channelLink = "http://http://www.youtube.com/channel/"+resultingVideo.snippet.channelId;
        
        var description = resultingVideo.snippet.description;
        var link = /(?:https?:\/\/)?((?:[\w\-_.])+\.[\w\-_]+\/[\w\-_()\/\,]*(\.[\w\-_()\:]+)?(?:[\-\+=&;%@\.\w?#\/\:\,]*))/gi;
        description = description.replace(link, "<a tabindex='-1' target='_blank' href='http://$1'>$1</a>");
        description = description.replace("\n", "<br />");
        
        var views = resultingVideo.statistics.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        
        var length = resultingVideo.contentDetails.duration;
        var hours = length.replace(/PT(?:([0-9])H)?(?:([0-9]{1,2})M)?([0-9]{1,2})S/g, "$1");
        var minutes = length.replace(/PT(?:([0-9])H)?(?:([0-9]{1,2})M)?([0-9]{1,2})S/g, "$2");
        var seconds = length.replace(/PT(?:([0-9])H)?(?:([0-9]{1,2})M)?([0-9]{1,2})S/g, "$3");
        
        length = (hours.length != "" ? hours+":" : "");
        length += (hours != "" ? (minutes != "" ? (minutes.length < 2 ? "0"+minutes : minutes) : "00") : (minutes != "" ? minutes : "0"))+":";
        length += (seconds.length < 2 ? "0"+seconds : seconds);
        
        var displayString = "<div class='yt-video-container'>\n<div class='yt-thumbnail'>\n<a target='_blank' class='yt-thumbnail-imglink' href='http://www.youtube.com/watch?v="+id+"'>\n<span class='yt-thumbnail-imgspan'>\n<img class='yt-thumbnail-img' src='http://i.ytimg.com/vi/"+id+"/mqdefault.jpg' />\n</span>\n<span class='yt-thumbnail-time'>"+length+"</span>\n</a>\n</div>\n<div class='yt-details'>\n<h3 class='yt-details-title'><a target='_blank' href='http://www.youtube.com/watch?v="+id+"'>"+title+"</a></h3>\n<div style='display: block; margin: 5px 0 0;'>\n<ul class='yt-details-meta'>\n<li style='padding: 0px;'>by <a target='_blank' href='"+channelLink+"'>"+channel+"</a></li>\n<li style='padding: 0px;'>"+views+" views</li>\n</ul>\n</div>\n<div class='yt-details-desc'>"+description+"</div>\n</div>\n</div>";
        var embedString = resultingVideo.status.embeddable ? "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+"'>\n<img src='/images/yt-play-embedded.png' style='cursor: pointer;' onclick='modalYouTube(\""+id+"\")' />\n</div>" : "\n<div class='yt-video-container' style='width: 112px;' videoid='"+id+"'>\n<img src='/images/yt-cant-embed.png' />\n</div>";
        
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
    if (chatting || bigchat)
        return "Wait, you're still in a chat session!";
}

function changeTitle()
{
    document.title = isOldTitle ? oldTitle : newTitle;
    isOldTitle = !isOldTitle;
}