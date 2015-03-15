requestAnimFrame = (function() {
return window.requestAnimationFrame ||
window.webkitRequestAnimationFrame ||
window.mozRequestAnimationFrame ||
window.oRequestAnimationFrame ||
window.msRequestAnimationFrame ||
function(callback) {
window.setTimeout(callback, 1000/60);
};
})();

var canvas = document.getElementById('canvas-rain');
var ctx = canvas.getContext('2d');

var body = document.getElementById('messages');

canvas.setAttribute('raining', 'false');
canvas.setAttribute('lightning', 'false');

var width = 0;
var height = 0;

window.onresize = function onresize() {
	width = canvas.width = window.innerWidth;
	height = canvas.height = window.innerHeight;
};

window.onresize();

var particles = [];
var drops = [];
var nombrebase = 5;
var nombreb = 2;

var maxSnow = 100;
var snowParts = [];
var angle = 0;

for(var i = 0; i < maxSnow; i++)
{
    snowParts.push({
        x: Math.random()*width, //x-coordinate
        y: Math.random()*height, //y-coordinate
        r: Math.random()*4+1, //radius
        d: Math.random()*maxSnow //density
    })
}

var currentOpacity = 0;
var flashSpeed = 25;
var fadeSpeed = 1.5;
var minWait = 5;
var maxWait = 15;
var currentWait = getRandomArbitrary(minWait+5, maxWait);
var waitLeft = currentWait;
var flashing = false;
var fading = false;
var isMulti = false;
var multiNumber = 1;
var maxMulti = getRandomInt(2, 4);
var multiFade = getRandomArbitrary(0.6, 0.8);
var lastTime = new Date();

var isRainy = false;
var isLightning = false;
var isSnowing = false;
var shouldquit = false;
var doanim = false;

function Rain(X, Y, nombre) {
	if (!nombre) {
		nombre = nombreb;
	}
	while (nombre--) {
		particles.push( 
		{
			speedX : (Math.random() * 0.25),
			speedY : (Math.random() * 9) + 1,
			X : X,
			Y : Y,
			alpha : 1,
			couleur : "hsla(200, 100%, 50%, 1)",
		})
	}
}

function explosion(X, Y, couleur, nombre) {
	if (!nombre) {
		nombre = nombrebase;
	}
	while (nombre--) {
		drops.push( 
		{
			speedX : (Math.random() * 4-2	),
			speedY : (Math.random() * -4 ),
			X : X,
			Y : Y,
			radius : 0.65 + Math.floor(Math.random() *1.6),
			alpha : 1,
			couleur : couleur
		})
	}
}

function draw(ctx) {

	ctx.save();
	ctx.clearRect(0, 0, width, height);
	
	var localParticles = particles;
	var localDrops = drops;
	var tau = Math.PI * 2;

	for (var i = 0, activeParticles; activeParticles = localParticles[i]; i++) {
			
		ctx.globalAlpha = activeParticles.alpha;
		ctx.fillStyle = activeParticles.couleur;
		ctx.fillRect(activeParticles.X, activeParticles.Y, activeParticles.speedY/4, activeParticles.speedY);
	}

	for (var i = 0, activeDrops; activeDrops = localDrops[i]; i++) {
			
		ctx.globalAlpha = activeDrops.alpha;
		ctx.fillStyle = activeDrops.couleur;
		
		ctx.beginPath();
		ctx.arc(activeDrops.X, activeDrops.Y, activeDrops.radius, 0, tau);
		ctx.fill();
	}
    if (isSnowing)
    {
        for (var i = 0, activeSnow; activeSnow = snowParts[i]; i++)
        {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.beginPath();
            for(var i = 0; i < maxSnow; i++)
            {
                var p = snowParts[i];
                ctx.moveTo(p.x, p.y);
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2, true);
            }
            ctx.closePath();
            ctx.fill();
        }
    }
    if (currentOpacity > 0)
    {
        ctx.fillStyle = "hsla(0, 0%, 95%, " + Math.min(Math.max(currentOpacity, 0), 1) + ")";
        ctx.fillRect(0, 0, width, height);
    }
    
	ctx.restore();
}

function update() {
	
	//canvas.style.top = $(window).scrollTop().toString()+"px";
    
    isRainy = canvas.getAttribute('raining') == "true";
    isLightning = canvas.getAttribute('lightning') == "true";
    isSnowing = canvas.getAttribute('snowing') == "true";
    console.log(isSnowing);
    
    var thisTime = new Date();
    var deltaTime = (thisTime.getTime() - lastTime.getTime()) / 1000;
    deltaTime = Math.min(deltaTime, 0.03);
    lastTime = thisTime;
	
    //--------
    // Raining
    //--------
    var localParticles = particles;
    var localDrops = drops;

    var dropStop = 0;

    for (var i = 0, activeParticles; activeParticles = localParticles[i]; i++) {
        activeParticles.X += activeParticles.speedX;
        activeParticles.Y += activeParticles.speedY+5;
        if (activeParticles.Y > height-dropStop) {
            localParticles.splice(i--, 1);
            explosion(activeParticles.X, activeParticles.Y, activeParticles.couleur);
        }
    }

    for (var i = 0, activeDrops; activeDrops = localDrops[i]; i++) {
        activeDrops.X += activeDrops.speedX;
        activeDrops.Y += activeDrops.speedY;
        activeDrops.radius -= 0.075;
        if (activeDrops.alpha > 0) {
            activeDrops.alpha -= 0.005;
        } else {
            activeDrops.alpha = 0;
        }
        if (activeDrops.radius < 0) {
            localDrops.splice(i--, 1);
        }
    }

    
	
    if (isRainy)
    {
        var i = 2;
        while (i--) {
            Rain(Math.floor((Math.random()*width)), -15);
        }
    }
    
    // ---------
    // Lightning
    // ---------
    if (waitLeft > 0)
    {
        waitLeft -= deltaTime;
    }
    else if (isLightning)
    {
        isMulti = (Math.random() > 0.75);
        currentWait = getRandomArbitrary(minWait, maxWait);
        waitLeft = currentWait;
        flashing = true;
        fading = false;
    }

    if (flashing)
    {
        if (currentOpacity < 1)
        {
            currentOpacity += flashSpeed * deltaTime;
        }
        else
        {
            fading = true;
            flashing = false;
        }
    }

    if (fading)
    {
        if (currentOpacity > 0)
        {
            currentOpacity -= fadeSpeed * deltaTime;
        }
        else
        {
            fading = false;
        }

        if (isMulti && multiNumber < maxMulti)
        {
            if (currentOpacity < multiFade)
            {
                flashing = true;
                fading = false;
                multiNumber++;
                multiFade = getRandomArbitrary(0.6, 0.8);
            }
        }
        else if (isMulti)
        {
            isMulti = false;
            multiNumber = 1;
            maxMulti = getRandomInt(2, 4)
        }
    }
    
    // ----
    // Snow
    // ----
    
    if (isSnowing)
    {
        angle += 0.01;
		for(var i = 0; i < maxSnow; i++)
		{
			var p = snowParts[i];
			//Updating X and Y coordinates
			//We will add 1 to the cos function to prevent negative values which will lead flakes to move upwards
			//Every particle has its own density which can be used to make the downward movement different for each flake
			//Lets make it more random by adding in the radius
			p.y += Math.cos(angle+p.d) + 1 + p.r/2;
			p.x += Math.sin(angle) * 2;
			
			//Sending flakes back from the top when it exits
			//Lets make it a bit more organic and let flakes enter from the left and right also.
			if(p.x > width+5 || p.x < -5 || p.y > height)
			{
				if(i%3 > 0) //66.67% of the flakes
				{
					snowParts[i] = {x: Math.random()*width, y: -10, r: p.r, d: p.d};
				}
				else
				{
					//If the flake is exitting from the right
					if(Math.sin(angle) > 0)
					{
						//Enter from the left
						snowParts[i] = {x: -5, y: Math.random()*height, r: p.r, d: p.d};
					}
					else
					{
						//Enter from the right
						snowParts[i] = {x: width+5, y: Math.random()*height, r: p.r, d: p.d};
					}
				}
			}
		}
	}
    
    if (particles.length == 0 && drops.length == 0 && flashing == false && fading == false && isRainy == false && isLightning == false && isSnowing == false)
    {
        doanim = false;
    }
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function animate() {
    
    if (doanim)
    {
        requestAnimFrame(animate);
        update();
        draw(ctx);
    }
}