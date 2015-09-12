var express = require('express');
var router = express.Router();

router.get('/*', function(req, res)
{
    if (req.path.substring(1) == "")
    {
        var now = new Date();
        var then = now;
        then.setUTCDate(then.getUTCDate() - 7);
        
        var dateNum = then.getTime();
        
        DoBlogList(req.Blog, dateNum, req.cookies.theme, res);
    }
    else
    {
        var args = req.path.substring(1).split('/');
        if (args.length !== 1)
        {
            res.render('error',
            {
                message: 'Error: Invalid post ID.',
                error: {}
            });

            return;
        }

        var postID = parseInt(args[0]);

        if (isNaN(postID))
        {
            if (args[0] == "all")
            {
                DoBlogList(req.Blog, 0, req.cookies.theme, res);
                
                return;
            }
            else
            {
                res.render('error',
                {
                    message: 'Error: Invalid post ID, "'+args[0]+'".',
                    error: {}
                });
                return;
            }
        }

        req.Blog.findOne( { date: postID }, function(err, post) {
            
            if (err)
            {
                res.render('error',
                {
                    message: 'Error: Invalid post ID.',
                    error: {}
                });
            }
            else if (post == null)
            {
                res.render('error',
                {
                    message: 'Error: Invalid post ID.',
                    error: {}
                });
            }
            else
            {
                var isNight = req.cookies.theme == "night";
                res.render('blogpost', { logoType: (isNight ? "night" : "day"), nightStyle: (isNight ? "/stylesheets/night/common.css" : ""), postTitle: post.title, postDate: (new Date(post.date).toDateString()), postContent: post.content });
            }
        });
    }
});

function DoBlogList(Blog, since, theme, res)
{
    Blog.find({ date: { $gt: since } }, function(err, posts) {

        if (err)
        {
            res.render('error',
            {
                message: err.message,
                error: err
            });
        }
        else if (posts.length == 0)
        {
            var isNight = theme == "night";
            res.render('bloglist', { logoType: (isNight ? "night" : "day"), nightStyle: (isNight ? "/stylesheets/night/common.css" : ""), blogText: "No posts within the past week =/<br /><a href='/blog/all'>View all posts</a>" });
        }
        else
        {
            var listText = "";

            for (var i = 0; i < posts.length; i++)
            {
                var contents = posts[i].content;
                
                if (contents.length > 200)
                {
                    contents = contents.substring(0, 197)+"...";
                }
                
                if (contents.indexOf("</p>") != -1)
                {
                    contents = contents.substring(0, contents.indexOf("</p>"));
                    
                    if (contents[contents.length-1] == '.')
                    {
                        contents += "..";
                    }
                    else
                    {
                        contents += "...";
                    }
                }
                
                var newText = "<br />";
                newText += "<h3><a href='/blog/"+posts[i].date.toString()+"'>"+posts[i].title+"</a></h3>";
                newText += "<h5>Posted: "+(new Date(posts[i].date).toDateString())+"</h5>";
                newText += "<p>"+contents+"</p>";

                listText = newText + listText;
            }
            
            if (since != 0)
            {
                listText += "<br /><a href='/blog/all'>View all posts</a>";
            }

            var isNight = theme == "night";
            res.render('bloglist', { logoType: (isNight ? "night" : "day"), nightStyle: (isNight ? "/stylesheets/night/common.css" : ""), blogText: listText });
        }
    });
}

module.exports = router;