function parseCookies () {
    
    var all = document.cookie;
    
    if (all == "")
    {
        return;
    }
    
    var list = all.split('; ');
    
    for (var i = 0; i < list.length; i++)
    {
        cookies[i] = list[i].split('=');
    }
}

function getCookie (name, defaultVal) {
    
    for (var i = 0; i < cookies.length; i++)
    {
        if (cookies[i][0] == name)
        {
            return cookies[i][1];
        }
    }
    
    return defaultVal;
}

function setCookie (name, newValue) {
    
    for (var i = 0; i < cookies.length; i++)
    {
        if (cookies[i][0] == name)
        {
            cookies[i][1] = newValue.toString();
            var expiry = new Date();
            expiry.setMonth(expiry.getMonth()+1);
            document.cookie = name+"="+newValue.toString()+"; expires="+expiry.toUTCString();
            return;
        }
    }
    
    var newCookie = [name, newValue.toString()];
    cookies.push(newCookie);
    var expiry = new Date();
    expiry.setMonth(expiry.getMonth()+1);
    document.cookie = name+"="+newValue.toString()+"; expires="+expiry.toUTCString();
}