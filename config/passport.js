var LocalStrategy = require('passport-local').Strategy;
var User          = require('../app/models/user');
var functions     = require('./functions');

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    // used to deserialize the user
    passport.deserializeUser(function(username, done) {
        User.findOne(
            { username: username },
            function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('login', new LocalStrategy({
        // by default, local strategy uses username and password
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {

        if (username)
            username = username.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive username matching

        if (functions.isInvalid(username) ) {
            return done(null, false, req.flash('loginMessage', 'Special characters are not allowed.'));
        }

        if (functions.notLengthBetween(USER_MIN, USER_MAX, username) ) {
            return done(null, false, req.flash('loginMessage', 'No user found.'));
        }

        if (functions.notLengthBetween(PASS_MIN, PASS_MAX, password) ) {
            return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
        }

        // asynchronous
        process.nextTick(function() {
            User.findOne({ 'username' :  username }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, req.flash('loginMessage', 'No user found.'));

                if (!user.isCurrentPassword(password))
                    return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));

                // all is well, return user
                else
                    return done(null, user);
            });
        });

    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('register', new LocalStrategy({
        // by default, local strategy uses username and password
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {

        if (username) {
            username = username.toLowerCase(); // Use lower-case username to avoid case-sensitive username matching
        }

        if (functions.isInvalid(username) ) {
            return done(null, false, req.flash('registerMessage', 'Special characters are not allowed.'));
        }

        if (functions.notLengthBetween(USER_MIN, USER_MAX, username) ) {
            return done(null, false, req.flash('registerMessage', 'Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters'));
        }

        if (functions.notLengthBetween(PASS_MIN, PASS_MAX, password) ) {
            return done(null, false, req.flash('registerMessage', 'Password must be between ' + PASS_MIN + ' and ' + PASS_MAX + ' characters'));
        }

        if (password !== req.body.passwordrepeat ) {
            return done(null, false, req.flash('registerMessage', 'The passwords do not match.'));
        }

        User.findOne({ 'username' :  username }, function(err, user) {
            // if there are any errors, return the error
            if (err)
                return done(err);

            // check to see if there is already a user with that username
            if (user) {
                return done(null, false, req.flash('registerMessage', 'This username is already taken.'));
            } else {
                // create the user
                var newUser            = new User();

                newUser.password   = newUser.generateHash(password);
                newUser.username   = username;
                newUser.avatar     = '/images/avatar.jpg';

                newUser.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, newUser);
                });
            }

        });


    }));

};
