var express = require("express");
var router  = express.Router();
var passport = require("passport");
var mongoose = require("mongoose");
var User = require("../models/user");
var Problem = require("../models/problem");
var Puzzle = require("../models/puzzle");
var Group = require("../models/group");
var middleware = require("../middleware/index");
var rycode = require("../middleware/rycode");
var _ = require("lodash");

router.all("/*",middleware.isAdminLoggedIn,middleware.havePermission);

router.get("/", function(req, res){
    res.render('admin/index');
});

router.get("/register", function(req, res){
    res.render('dev/register');
});

router.post("/register", function(req, res){
    var user = new User({username: req.body.username});
    User.findOne({username: user.username}).exec(function (err, existUser) {
        if (err) return next(err);
        if (existUser) {
            req.flash('error', 'Username already exist');
            res.redirect('/admin/register');
        } else {
            user.save(function (err) {
                res.redirect('/admin/registerPass/'+user.username);
            });
        }
    });
});

router.get("/registerPass/:username", function(req, res){
    User.findOne({username:req.params.username}).exec(function (err,user) {
        res.render('dev/registerpass',{username:user.username});
    });
});
router.post("/registerPass/:username", function(req, res){
    var newpass = rycode.encode(req.body);
    User.findOne({username:req.params.username}).exec(function (err,user) {
        if(newpass.length < 10)
        {
            user.rycode = "";
            user.save();
            req.flash("error","Rycode is too short!");
            res.redirect('/admin/registerPass/'+user.username);
        }
        else if(user.rycode == "")
        {
            user.rycode = newpass;
            user.save();
            req.flash("success","Enter passcode again");
            res.redirect('/admin/registerPass/'+user.username);
        }
        else
        {
            if(newpass != ""&&user.rycode == newpass)
            {
                user.rycode = newpass;
                user.password = newpass;
                user.isAdmin = true;
                user.save();
                req.flash("success","Completed");
                res.redirect('/admin/login');
            }
            else
            {
                user.rycode = "";
                user.save();
                req.flash("error","Wrong");
                res.redirect('/admin/registerPass/'+user.username);
            }
        }
    });
});

//show login form
router.get("/login", function(req, res){
    res.render("dev/login");
});
router.post("/login", function(req, res) {
    User.findOne({username: req.body.username}).exec(function (err, user) {
        res.render('dev/loginUser', {username: user.username});
    });
});
router.post('/login/:username', function(req, res, next) {
    req.body.username = req.params.username;
    req.body.password = rycode.encode(req.body).substring(0, rycode.encode(req.body).length - 1);;
    passport.authenticate('local', function(err, user, info) {
                if (err) return next(err);
                if (!user) {
                    return res.redirect('/admin/login')
                }
                req.logIn(user, function(err) {
                    if (err) return next(err);
                    return res.redirect('/admin');
                });
            })(req, res, next);
});


router.get("/newpass", function(req, res){
    res.render('dev/newpass');
});
router.post("/newpass", function(req, res){
    var newpass = rycode.encode(req.body);
    User.findOne({username:"a"}).exec(function (err,user) {
        if(user.rycode == "")
        {
            user.rycode = newpass;
            user.save();
            req.flash("success","Again");
        }
        else
        {
            if(newpass != ""&&user.rycode == newpass)
            {
                user.rycode = newpass;
                user.save();
                req.flash("success","Completed");
            }
            else
            {
                user.rycode = "";
                user.save();
                req.flash("error","Wrong");
            }
        }
        res.redirect('/admin/newpass');
    });
});

router.post("/rycode", function(req, res){
    var newpass = rycode.encode(req.body);
    User.findOne({username:"a"}).exec(function (err,user) {
        if(newpass != ""&&user.rycode == newpass)
            req.flash("success","Correct");
        else
            req.flash("error","Wrong");
        res.redirect('/admin/rycode');
    });
});
router.get("/rycode", function(req, res){
    res.render('dev/rycode');
});

router.get("/console", function(req, res){
    res.render('console');
});
router.get("/mailTemplates", function(req, res){
    res.render('dev/mailTemplates');
});
router.get("/mailTemplates/:template", function(req, res){
    res.render('dev/mailTemplates/'+req.params.template+"/html",
        {address:req.headers.host,link:"dsdasdsad",hoursLeft:"adsdas"});
});

router.post("/console", function(req, res){
    var command = req.body.input.split(" ");
    var model = command[1];
    command = command[0];
    if(command == "clean")
        mongoose.model(model).remove({},function (err) {});
    res.redirect('/admin/console');
});

// router.post("/newpass", function(req, res){
//     var newpass = [];
//
//     for(var key in req.body) {
//         newpass.push(req.body[key]);
//     }
//     User.findOne({username:"a"}).exec(function (err,user) {
//         user.newpass.push(newpass);
//         if(user.newpass.length>3)
//         {
//             var pass = user.newpass;
//             var confirm = [];
//                 for (j = 0; j < pass[0].length; j++) {
//                         var count = 0;
//                     for (i = 0; i < 3; i++) {
//                         if(pass[i][j] == true)
//                             count++;
//                     }
//                     if(count>=2)
//                         confirm.push(true);
//                     else
//                         confirm.push(false);
//
//                 }
//             user.newpass = [];
//             console.log("CONFIRM :" + confirm);
//         }
//
//         user.save();
//         console.log(user.newpass);
//         res.redirect('/admin/knock');
//     });
// });


router.get("/puzzles", function(req, res){
    // Get all problems from DB
    Problem.find({}, function(err, allProblems) {
        if (err) {
            console.log(err);
        } else {
            res.render("problems/index", {problems: allProblems});
        }
    });
});

//NEW - show form to create new problem
router.get("/puzzles/new", function(req, res){
    res.render("problems/new");
});

// SHOW - shows more info about one problem
router.get("/puzzles/:id", function(req, res){
    //find the problem with provided ID
    Problem.findById(req.params.id).populate("comments").exec(function(err, foundProblem){
        if(err){
            console.log(err);
        } else {
            //render show template with that problem
            res.render("problems/show", {problem: foundProblem});
        }
    });
});

router.get("/puzzles/:id/edit", function(req, res){
    //find the problem with provided ID
    Problem.findById(req.params.id, function(err, foundProblem){
        if(err){
            console.log(err);
        } else {
            //render show template with that problem
            res.render("problems/edit", {problem: foundProblem});
        }
    });
});

router.put("/puzzles/:id", function(req, res){
    var newData = {name: req.body.name, answer: req.body.answer,
        description: req.body.description,score:req.body.score,type:req.body.type
    };
    Problem.findByIdAndUpdate(req.params.id, {$set: newData}, function(err, problem){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            req.flash("success","Successfully Updated!");
            res.redirect("/admin/problems/"+problem._id);
        }
    });
});

router.delete("/puzzles/:problem_id",function(req, res,next){
    var problem_id = req.params.problem_id;
    Problem.findOne({'_id':req.params.problem_id}).exec(function(err,problem) {
        if(err) return next(err);
        problem.remove();
        req.flash("success"," Successfully deleted!");
        res.redirect("/admin/problems");
    });
});


module.exports = router;