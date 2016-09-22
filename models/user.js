var crypto = require('crypto');
var bcrypt = require('bcrypt');
var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    firstname:String,
    lastname:String,
    StudentId:Number,
    email:String,
    username: String,
    password: String,
    groupname:String,
    group:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group"
    },

    resetPasswordToken:String,
    resetPasswordExpires:Date,
});
UserSchema.virtual("isAdmin").get(function () {
   return (this.username == "a");
});

UserSchema.pre('save', function(next) {
    var user = this;
    var SALT_FACTOR = 5;
    if (!user.isModified('password')) return next();
    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if (err) return next(err);
        var hash = bcrypt.hashSync(user.password, salt, null);
        user.password = hash;
        console.log(user.password);
        return next();
    });
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
};

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model("User", UserSchema);