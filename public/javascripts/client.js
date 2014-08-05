var socket = io.connect('http://localhost:3001');
var loggedIn = true;
var lastChat = "";

$(document).ready(function()
{
	$('#login-modal').modal({keyboard: false, backdrop: 'static'});
	$('#randomnick').click();
	var socket = io.connect('http://localhost:3001');

	$('#loginform').submit(function()
	{
		return false;
	});

	socket.on('connect', function()
	{
		$('#loginsubmit').prop('disabled', false).removeClass('btn-default').addClass('btn-success').text('Start!');
		$('#loginform').submit(function()
		{
			var nick = $('#nickname').val();

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

			socket.emit('login', { nick: nick, gender: gender, role: role, chatwith: chatwith, type: type});
			$('#login-modal').modal('hide');
			return false;
		});

		socket.on('chat message', function(msg)
		{
			$('#messages').append($('<li>').text(moment().format('h:mm:ss a') + ": " + msg));
		});

		socket.on('information', function(msg)
		{
			$('#messages').append($('<li>').text(moment().format('h:mm:ss a') + ": " + msg).css('font-style', 'italic').css('font-weight', 'bold'));
		});

		socket.on('disconnect', function()
		{
			$('#messages').append($('<li>').text(moment().format('h:mm:ss a') + ": " + "[INFO] Sorry! You seem to have been disconnected from the server. Please reload the page and try again.").css('font-style', 'italic').css('font-weight', 'bold'));
		});
	});

	socket.on('loggedIn', function()
	{
		loggedIn = true;
		$('#chatbar').submit(function()
		{
			return false;
		});
		socket.emit('getNewChat', { first: true });
	});

	socket.on('newChat', function(nick)
	{
		lastChat = nick;
		$('#sendbutton').removeProp('disabled');
		$('#dcbutton').removeProp('disabled');
		$('#dcbutton').click(function()
		{
			socket.emit('getNewChat', { first: false, last: lastChat });
			$('#dcbutton').prop('disabled', true);
			$('#sendbutton').prop('disabled', true);
			var msg = "[INFO] You have disconnected from " + lastChat + ".";
			$('#messages').append($('<li>').text(moment().format('h:mm:ss a') + ": " + msg).css('font-style', 'italic').css('font-weight', 'bold'));
		});
		$('#chatbar').submit(function()
		{
			socket.emit('chat message', { message: $('#m').val() });
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
	});
});

$('#randomnick').click(function()
{
	var adjs = ['Good', 'Mindless', 'Little', 'Tired', 'Wise', 'Dreamy', 'Sleepy', 'Blank', 'Enchanted', 'Enchanting', 'Entranced', 'Hypnotic', 'Bad', 'The', 'Hypnotized'];
	var animals = ['Alligator', 'Crocodile', 'Alpaca', 'Ant', 'Antelope', 'Ape', 'Armadillo', 'Donkey', 'Baboon', 'Badger', 'Bat', 'Bear', 'Beaver', 'Bee', 'Beetle', 'Buffalo', 'Butterfly', 'Camel', 'Caribou', 'Cat', 'Cattle', 'Cheetah', 'Chimpanzee', 'Chinchilla', 'Cicada', 'Clam', 'Cockroach', 'Cod', 'Coyote', 'Crab', 'Cricket', 'Crow', 'Raven', 'Deer', 'Dinosaur', 'Dog', 'Dolphin', 'Porpoise', 'Duck', 'Eel', 'Elephant', 'Elk', 'Ferret', 'Fishfly', 'Fox', 'Frog', 'Toad', 'Gerbil', 'Giraffe', 'Gnat', 'Gnu', 'Wildebeest', 'Goat', 'Goldfish', 'Gorilla', 'Grasshopper', 'Hamster', 'Hare', 'Hedgehog', 'Herring', 'Hippopotamus', 'Hornet', 'Horse', 'Hound', 'Hyena', 'Insect', 'Jackal', 'Jellyfish', 'Kangaroo', 'Wallaby', 'Leopard', 'Lion', 'Lizard', 'Llama', 'Locust', 'Moose', 'Mosquito', 'Mouse', 'Rat', 'Mule', 'Muskrat', 'Otter', 'Ox', 'Oyster', 'Panda', 'Pig', 'Hog', 'Platypus', 'Porcupine', 'Pug', 'Rabbit', 'Raccoon', 'Reindeer', 'Rhinoceros', 'Salmon', 'Sardine', 'Shark', 'Sheep', 'Skunk', 'Snail', 'Snake', 'Spider', 'Squirrel', 'Termite', 'Tiger', 'Trout', 'Turtle', 'Tortoise', 'Walrus', 'Weasel', 'Whale', 'Wolf', 'Wombat', 'Woodchuck', 'Worm', 'Yak', 'Zebra'];
	$('#nickname').val(adjs[Math.floor(Math.random()*adjs.length)] + animals[Math.floor(Math.random()*animals.length)] + (Math.floor(Math.random() * (9 - 1)) + 1) + (Math.floor(Math.random() * (9 - 1)) + 1));
});