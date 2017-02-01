// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

mongoose.Promise = global.Promise;

// define the schema for our user model
var userSchema = mongoose.Schema({

    username      : String,
    password      : String,
    avatar	      : String,
    OTP           : [],
    contacts      : [],
    requests      : [],
    blocked       : []
});

// index username field because it will be queried like crazy
userSchema.index( {username: 1}, {unique: true} );

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is current
userSchema.methods.isCurrentPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
