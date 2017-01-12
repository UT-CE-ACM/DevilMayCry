var express = require("express");
var router  = express.Router();
var Problem = require("../models/problem");
var Tag = require("../models/tag");
var Group = require("../models/group");
var Puzzle = require("../models/puzzle");
var User = require("../models/user");
var middleware = require("../middleware");
var request = require("request");
var multer = require('multer');
var rimraf = require('rimraf');
var fs = require("fs");
var upload = multer({
    dest: './Uploads/',
    onFileUploadComplete: function (file) {
        console.log(file.fieldname + ' uploaded to  ' + file.path)
    }
});
var sanitize = require('mongo-sanitize');
var path = require('path');
const submissionWait = 5*1000;
// router.all("/*",middleware.isLoggedIn,middleware.havePermission);
//INDEX - show all problems
router.all("/*",middleware.isLoggedIn);

router.get("/", function(req, res){
    User.findById(req.user.id)
        .deepPopulate(["group","group.competition.puzzles", "group.competition.puzzles.problem","group.competition"])
        .exec(function (err,user) {
            if(!user.group) {
                res.render("dashboard/index", {user: user, puzzles: null, superTags: null});
            } else {
                if (err)
                    console.log(err);
                else {
                    Puzzle.find({_id: {$in: user.group.competition.puzzles}}).populate("problem").exec(function (err, puzzles) {
                        Tag.find({}).exec(function (err, superTags) {
                            if (err)
                                console.log(err);
                            else
                                res.render("dashboard/index", {user: user, puzzles: puzzles, superTags: superTags});
                        })
                    });
                }
            }
        });
});

router.get("/ranking", function(req, res){
    Group.find({}).populate("competition").sort({"competition.stage": -1}).limit(20).exec(function (err,groups) {
        res.render("dashboard/ranking",{groups:groups});
    });
});

router.get("/puzzles/:puzzle_id", function(req, res){
    User.findById(req.user._id).populate("group").exec(function (err,user) {
        Puzzle.findById(req.params.puzzle_id).populate(["problem","group"]).exec( function (err, puzzle) {
            if (err) {
                console.log(err);
            } else {
                if(user.group.view(puzzle))
                    res.render("dashboard/puzzle/show", {puzzle: puzzle});

                else
                {
                    req.flash("error", "You do not have enough credits! problem cost is "+puzzle.cost);
                    middleware.dmcRedirect(res,"/dashboard");
                }
            }
        });
    });
});

router.get("/puzzles/:puzzle_id/hint", function(req, res){
    User.findById(req.user._id).populate("group").exec(function (err,user) {
        Puzzle.findById(req.params.puzzle_id).populate(["group","problem"]).exec(function (err, puzzle) {
            if (err) {
                console.log(err);
            } else {
                if(!puzzle.requsetForHint())
                    console.log("You do not have enough hints :(")
                middleware.dmcRedirect(res,"/dashboard/puzzles/"+puzzle._id);
            }
        });
    });
});

router.post("/puzzles/:puzzle_id/answer",upload.single("file"), function(req, res){
    var answer = sanitize(req.body.answer);
    User.findById(req.user._id).populate("group").exec(function (err,user) {
        Puzzle.findById(req.params.puzzle_id).deepPopulate(["problem","group","group.competition"]).exec(function (err, puzzle) {
            if (err) {
                console.log(err);
            } else {
                if(Date.now() - submissionWait > puzzle.lastSubmit ) {
                    if(req.file) {
                        puzzle.submisson.file = user.group.name + path.extname(req.file.originalname);
                        var submission_dir = puzzle.problem.dir + "Submissions";
                        var submission_name = puzzle.submisson.file;
                        if (puzzle.submisson.file)
                            if (fs.existsSync(submission_dir + "/" + submission_name))fs.unlinkSync(submission_dir + "/" + submission_name);
                        middleware.uploadToDir(req.file.path, submission_dir, submission_name);
                        submission_name = user.group.name + path.extname(req.file.originalname);
                        puzzle.status = "submitted";
                        puzzle.save();
                        req.flash("success", "جواب شما ثبت شد!");
                    }
                    else if(answer != "")
                    {
                        if (puzzle.submitAnswer(answer))
                            req.flash("success", "جواب شما درست بود:)");
                        else
                            req.flash("error", "جواب شما نادرست بود :(");
                    }
                }else
                    req.flash("error", "برای ثبت دوباره جواب باید منتظر بمانید");
                middleware.dmcRedirect(res,"/dashboard");
            }
        });
    });
});

module.exports = router;