var fs 				   = require('fs');
var randomstring 	   = require("randomstring");
var toBuffer 		   = require('stream-to-array');
var mmm 			   = require('mmmagic');
var	Magic 			   = mmm.Magic;

var User    	       = require('../app/models/user');
var ObjectId           = require('mongodb').ObjectID;

// load multiparty to handle image uploads
var multiparty 		   = require('multiparty');

// Allowed image mime types
const ALLOWED_TYPES = ['image/png', 'image/gif', 'image/jpeg', 'image/bmp'];

// Maximum file size allowed
const MAX_FILE_UPLOAD = 20 * 1024 * 1024 ; // 20 MB

// Minimum and maximum values for password fields
//noinspection JSAnnotator
PASS_MIN = 6;
//noinspection JSAnnotator
PASS_MAX = 40;

// Minimum and maximum values for username fields
//noinspection JSAnnotator
USER_MIN = 4;
//noinspection JSAnnotator
USER_MAX = 20;

///////////////////////// HELPER FUNCTIONS //////////////////////////////////

/**
 * Helper function, removes the characters that can harm our users
 * @param {string} text - the input text that we want to be sanitized
 * @return {string} sanitized text
 */
exports.escapeHtml = function(text) {
    var map = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
		"'": '&#039;',
		'{': '&#123;',
		'}': '&#125;',
		"\n": '<br>'
    };

    return text.replace(/[<>"'\{\}\n]/g, function(m) { return map[m]; });
};

/**
 * Helper function, get's the extension of a given file name, ex. jpg, png
 * @param {string} filename - the file name
 * @return {string} file extension
 */
exports.getExtension = function(filename) {
	var a = filename.split(".");
	if( a.length === 1 || ( a[0] === "" && a.length === 2 ) ) {
		return "";
	}
	return a.pop().toLowerCase();
};

/**
 * Helper function, checks length of any number of parameters
 * @param {int} min - the minimum characters required
 * @param {int} max - the maximum characters required
 * @param {...*} parameter/s - any number of parameters that we want to be checked
 * @return {boolean} true if the input(s) is not valid, false if everything is ok
 */
exports.notLengthBetween = function(min, max) {

	for (var i = 0; i < arguments.length; i++) {
		if ( (arguments[i].length < min) || (arguments[i].length > max) ) {
			return true; //a parameter/s exceed (or) below specified lengths
		}
	}
	return false; // all good
};

/**
 * Helper function, checks if the argument(s) are empty or undefined or contain special characters, gets any number of parameters
 * @param {...*} parameter/s - any number of parameters that we want to be checked
 * @return {boolean} true if the input(s) is not valid, false if everything is ok
 */
exports.isInvalid = function() {
	for (var i = 0; i < arguments.length; i++) {
		if (arguments[i]) {
			if ( typeof arguments[i] === 'string' ) {

				if ( /[^a-zA-Z0-9_\u00C0-\u00ff]/g.test(arguments[i]) ) {
					// string does not contain only letters but also special characters
					return true; //invalid parameter detected
				}

			}

		}
		else {
			return true; // invalid parameter detected
		}
	}
	return false; // all good
};

////////////////////// END OF HELPER FUNCTIONS ///////////////////////////////

/**
 * Function that get's the usernames that are in the user's contact list along with their corresponding avatars
 * @callback callback
 * @param {object} req - express request object that contains user's ID
 * @return {error|null, JSON} error or a json that contains usernames-avatars pairs
 */
exports.getContactListDetails = function(req, callback) {

	User.find(
		{
			username: {
				$in: req.user.contacts
			}
		},
		{
			_id: 0,
			username: 1,
			avatar: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result );
			}
		});

};

/**
 * Function that get's the usernames that requested to be added in the user's contact list along with their corresponding avatars
 * @callback callback
 * @param {object} req - express request object that contains user's ID
 * @return {error|null, JSON} error or a json that contains usernames-avatars pairs
 */
exports.getRequestListDetails = function(req, callback) {

	User.find(
		{
			username: {
				$in: req.user.requests
			}
		},
		{
			_id: 0,
			username: 1,
			avatar: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result );
			}
		});

};

/**
 * Function that checks if a user already exists in the database
 * @callback callback
 * @param {string} username - the username to be checked
 * @return {error|null, boolean} error, true or false
 */
exports.userExists = function(username, callback) {

	if ( exports.isInvalid(username) )
		return callback(null, false);

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return callback(null, false);

	User.findOne({ 'username' :  username }, function(err, user) {

		if (err)
			return callback(err);

		if (user) {
			return callback(null, true);
		} else {
			return callback(null, false);
		}

	});

};

/**
 * Function that get's the avatar image path of a single user, this is going to be used in the profile section only
 * @callback callback
 * @param {string} username - the username
 * @return {error|null, string} error or a string that contains the url to the avatar image
 */
exports.getUserAvatar = function(username, callback) {

	if ( exports.isInvalid(username) )
		return callback( new Error('Special characters are not allowed') );

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return callback( new Error('Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters') );

	User.findOne(
		{
			username: username
		},
		{
			_id: 0,
			avatar: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result );
			}
		});

};

/**
 * Function that get's target user's ID
 * @callback callback
 * @param {string} username - the username
 * @return {error|null, string} error or a string that contains the user's Id
 */
exports.getUserId = function(username, callback) {

	if ( exports.isInvalid(username) )
		return callback( new Error('Special characters are not allowed') );

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return callback( new Error('Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters') );

	User.findOne(
		{
			username: username
		},
		{
			_id: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result['_id'] );
			}
		});

};

/**
 * Function that get's target user's username
 * @callback callback
 * @param {string} id - the user's id
 * @return {error|null, string} error or a string that contains the user's username
 */
exports.getUsername = function(id, callback) {

	if ( exports.isInvalid(id) )
		return callback( new Error('Special characters are not allowed') );

	if ( exports.notLengthBetween(24, 24, id) )
		return callback( new Error('Id must be 24 characters') );

	User.findById(
		id,
		{
			username: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result['username'] );
			}
		});

};

/**
 * Function that get's target user's contacts
 * @callback callback
 * @param {string} id - the user'd id
 * @return {error|null, array} error or an array that contains the user's contacts
 */
exports.getUserContacts = function(id, callback) {

	if ( exports.isInvalid(id) )
		return callback( new Error('Special characters are not allowed') );

	if ( exports.notLengthBetween(24, 24, id) )
		return callback( new Error('Id must be 24 characters') );

	User.findById(
		id,
		{
			_id: 0,
			contacts: 1
		},
		function(err, result) {

			if (err){
				console.log(err);
			}
			else {
				return callback( null, result['contacts'] );
			}
		});

};

/**
 * Function that searches oblichat's DB for usernames that contain a given string
 * @callback callback
 * @param {object} req - express request object that contains user's ID
 * @param {string} username - username to be searched
 * @return {error|null, JSON} error or a json that contains the contacts that contain the given string along with the avatar path
 */
exports.searchContact = function(req, username, callback) {

	if ( exports.isInvalid(username) )
		return callback( null, req.flash('error', 'Special characters are not allowed') );

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return callback( null, req.flash('error', 'Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters') );

	User.find(
		{
			_id: { $ne: req.user._id }, 						// do not show myself
			$and:[ {'username': { $nin: req.user.contacts }},   // do not show already connected contacts
				   {'username': new RegExp(username)}
			]
		},
		{
			_id: 0,
			username: 1,
			avatar: 1
		},
		function(err, result) {

			if (err){
				return callback( new Error('error in searchContact') );
			}
			else {
				return callback( null, result );
			}
		});

};

/**
 * Function that checks the file size of a given  file and if it is really an image
 * @param {object} file - the input file
 * @return {error|null, buffer, string, boolean}
 *  the first returned value is an error (if any)
 *  the second value is the buffer of the file,
 *  the third value is the file extension ex. jpg, png, etc...
 *  the fourth value is false if the file is not an image and true if it is
 */
exports.isValidImage = function(file, callback) {

	var buf;

	toBuffer(file, function (err, parts) {

		var buffers = [];
		for (var i = 0, l = parts.length; i < l ; ++i) {
			var part = parts[i];
			buffers.push((part instanceof Buffer) ? part : new Buffer(part));

			if (i == l-1) {
				buf = Buffer.concat(buffers);

				var magic = new Magic(mmm.MAGIC_MIME_TYPE);

				magic.detect(buf, function(err, mimetype) {

					if (err) throw err;

					if (ALLOWED_TYPES.indexOf(mimetype) > -1) {
						// all good
						callback(null, buf, mimetype.substring(6), true);
					}
					else {
						// not an image
						callback(null, null, null, false);
					}

				});
			}
		}

	});

};


// ======================= Functions below do not return any value except the error msg if any ========================


/**
 * Function that uploads user's personal avatar image
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {object} res - express resource object, not used here
 * @return {error|null} error or null if everything is ok
 */
exports.uploadAvatar = function(req, res, finish) {

	var dir = '/uploads/'+ String(req.user._id);


	// if directory doesn't exist create it
	if (!fs.existsSync('./public' + dir)){
		fs.mkdirSync('./public' + dir);
	}

	var form = new multiparty.Form();

	form.on('error', function() {
		// FIXME: Does not return the error to the user properly
		return finish( null, req.flash('error', 'An error occurred') );
	});

	form.on('progress', function (bytesReceived) {
		if (5000000 < bytesReceived) { // 5MB limit
			console.log('filesize exeeded');
			this.emit('error');
		}
	});

	form.on("part", function(part) {

		exports.isValidImage(part, function(err, buffer, filetype, isvalid) {
			if (err) throw err;

			if ( isvalid ) {
				console.log("it is an image");

				var newFilePath = dir + '/' + randomstring.generate() + '.' + filetype;

				var wstream = fs.createWriteStream('./public' + newFilePath);
				wstream.write(buffer);
				wstream.end();

				wstream.on('close', function() {
					User.findOne({ '_id' : req.user._id }, function(err, user) {
						if ( user.avatar == '/images/avatar.jpg' ) {
							user.avatar 	 = newFilePath;
							req.user.avatar  = newFilePath;
						}
						else {
							if (fs.existsSync('./public' + user.avatar)){
								fs.unlinkSync('./public' + user.avatar);
							}
							user.avatar     = newFilePath;
							req.user.avatar = newFilePath;
						}

						user.save(function(err) {
							if (err)
								return finish( new Error('Error in updating database field') );

							return finish( null, req.flash('success', 'Avatar updated successfully') );
						});

					});
				});

			}
			else {
				console.log("not an image");
				// ignore it
				part.resume();
				return finish( null, req.flash('error', 'Avatar was not uploaded') );
			}
		});

	});

	// Close emitted after form parsed
	form.on('close', function(err) {
		if (err) throw err;
	});

	// Parse req
	form.parse(req);

};

/**
 * Function that adds the current user in the given username's request list
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {string} username - username to be added to contacts
 * @return {error|null} error or null if everything is ok
 */
exports.addContact = function(req, username, finish) {

	if ( exports.isInvalid(username) )
		return finish( new Error('invalid or empty parameter/s') );

	// add to target user's request list
	User.update(
		{ 'username': username },
		{
			$addToSet: { requests: req.user.username }
		},
		function(err) {
			if (err){
				return finish( new Error('error in addContact') );
			}
			else {
				return finish();
			}
		}
	);

};

/**
 * Function that adds a given username to the user's contact list
 * and removes the given user from the contact request list
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {string} username - username to be added to contacts
 * @return {error|null} error or null if everything is ok
 */
exports.confirmContact = function(req, username, finish) {

	if ( exports.isInvalid(username) )
		return finish( new Error('invalid or empty parameter/s') );

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return finish( new Error('error', 'Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters') );

	// check if usename is indeed in the current user's request list in order to proceed
	if ( req.user.requests.indexOf(username) >= 0 ) {

		User.update(
			{ 'username': req.user.username },
			{
				$addToSet: { contacts: username },   // add to current user's contact list
				$pull: { requests: username }   	 // remove the previously added user from contact requests list
			},
			function(err) {
				if (err){
					return finish( new Error('error in confirmContact') );
				}
				else {

					// add to target user's contact list
					User.update(
						{ 'username': username },
						{
							$addToSet: { contacts: req.user.username }
						},
						function(err) {
							if (err){
								return finish( new Error('error in confirmContact') );
							}
							else {
								return finish();
							}
						}
					);

				}
			}
		);

	}
	else {
		console.log("sdfdsg");
		console.log(username);
		console.log(req.user.requests);
		// username is not in user's request list, perhaps user tried to do something fishy
		return finish();
	}

};


/**
 * Function that blocks a given username
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {string} username - username to be added to contacts
 * @return {error|null} error or null if everything is ok
 */
exports.blockContact = function(req, username, finish) {

	if ( exports.isInvalid(username) )
		return finish( new Error('invalid or empty parameter/s') );

	if ( exports.notLengthBetween(USER_MIN, USER_MAX, username) )
		return finish( new Error('error', 'Username must be between ' + USER_MIN + ' and ' + USER_MAX + ' characters') );

	User.update(
		{ 'username': req.user.username },
		{
			$addToSet: { blocked: username },    // add to current user's blocked list
			$pull: { requests: username }   	 // remove the user from contact requests list
		},
		function(err) {
			if (err){
				return finish( new Error('error in confirmContact') );
			}
			else {
				return finish();
			}
		}
	);

};

/**
 * Function that changes the current password of the user
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {string} currentpassword - user's current password
 * @param {string} password - a new password
 * @param {string} retypepassword - the same new password again for validation purposes
 * @return {error|null} error or null if everything is ok
 */
exports.changePassword = function(req, currentpassword, password, retypepassword, finish) {

	if ( exports.isInvalid(currentpassword, password, retypepassword) )
		return finish( new Error('invalid or empty parameter/s') );

	if ( exports.notLengthBetween(PASS_MIN, PASS_MAX, currentpassword, password, retypepassword) )
		return finish( null, req.flash('error', 'Passwords must be between ' + PASS_MIN + ' and ' + PASS_MAX + ' characters') );

	User.findOne(req.user._id, function(err, user) {

		if (err)
			return finish(err);

		if (!user) {
			return finish( new Error('User not found') );
		}
		else {

			if ( user.isCurrentPassword(currentpassword) ) {
				 user.password = user.generateHash(password);
				 user.save();
				 return finish( null, req.flash('success', 'The password has changed successfully.') );
			}
			else {
				return finish( null, req.flash('error', 'The current password is invalid.') );
			}

		}

	});

};

/**
 * Function that adds a one-time password of the user's list of disposable passwords
 * @callback finish
 * @param {object} req - express request object that contains user's ID
 * @param {string} currentpassword - user's current password
 * @param {string} password - a new one-time password
 * @return {error|null} error or null if everything is ok
 */
exports.addOTP = function(req, currentpassword, password, finish) {
	// Function to add a one time password

	if ( exports.isInvalid(currentpassword, password) )
		return finish( new Error('invalid or empty parameter/s') );

	if ( exports.notLengthBetween(PASS_MIN, PASS_MAX, currentpassword, password) )
		return finish( null, req.flash('error', 'Passwords must be between ' + PASS_MIN + ' and ' + PASS_MAX + ' characters') );

	User.findOne(req.user._id, function(err, user) {

		if (err)
			return finish(err);

		if (!user) {
			return finish( new Error('User not found') );
		}
		else {

			if ( user.isCurrentPassword(currentpassword) ) {
				User.update(
					{ '_id': req.user._id},
					{
						$addToSet: { OTP: user.generateHash(password) }
					},
					function(err) {
						if (err){
							return finish( new Error('error in addOTP') );
						}
						else {
							return finish( null, req.flash('success', 'One-time password has been added successfully.') );
						}
					}
				);
			}
			else {
				return finish( null, req.flash('error', 'The current password is invalid.') );
			}
		}
	});

};
