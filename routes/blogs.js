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
        
        req.Blog.find({ date: { $gt: dateNum } }, function(err, posts) {
            
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
                var isNight = req.cookies.theme == "night";
                res.render('bloglist', { logoType: (isNight ? "night" : "day"), nightStyle: (isNight ? "/stylesheets/night/common.css" : ""), blogText: "No posts within the past week =/" });
            }
            else
            {
                var listText = "";
                
                for (var i = 0; i < posts.length; i++)
                {
                    listText += "<br />";
                    listText += "<h3><a href='http://www.sleepychat.com/blog/"+posts[i].date.toString()+"'>"+posts[i].title+"</a></h3>";
                    listText += "<h5>Posted: "+(new Date(posts[i].date).toDateString())+"</h5>";
                    listText += "<p>"+posts[i].content.substring(0, 197)+"...</p>";
                }
                
                var isNight = req.cookies.theme == "night";
                res.render('bloglist', { logoType: (isNight ? "night" : "day"), nightStyle: (isNight ? "/stylesheets/night/common.css" : ""), blogText: listText });
            }
        });
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
            res.render('error',
            {
                message: 'Error: Invalid post ID, "'+args[0]+'".',
                error: {}
            });
            return;
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

module.exports = router;