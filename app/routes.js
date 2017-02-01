var functions   = require('../config/functions');

module.exports = function(app, passport) {

// Render Functions ===================================================================

	function renderMain(req, res) {

		// redirect when logged in
		if ( req.isAuthenticated() ) {
			res.redirect("/chat");
		}
		else {

			var title = "Oblichat | Reclaim Privacy";

			if (req.get('X-PJAX')) {

				res.render('bodies/index.ejs', {
					title	: title,
					message	: req.flash('loginMessage')
				});

			}
			else {

				res.render('main_skeleton.ejs', {
					title	: title,
					body	: 'bodies/index.ejs',
					message	: req.flash('loginMessage')
				});

			}
		}

	}

	function renderRegister(req, res) {

		var title = "Oblichat | Register";

		if (req.get('X-PJAX')) {

			res.render('bodies/register.ejs', {
				title	: title,
				message	: req.flash('registerMessage')
			});

		}
		else {

			res.render('main_skeleton.ejs', {
				title	: title,
				body	: 'bodies/register.ejs',
				message	: req.flash('registerMessage')
			});

		}

	}

	function renderChat(req, res, results) {
		// optional parameter results

		var title = "Oblichat | Chat";
		var info  = "";		 // no information message is shown
		var focus = false;   // tab 'requests' is not focused by default

		// this is a param that is sent from client side in order to show the information message
		if ( req.body.info ) {
			info = req.body.info
		}

		// focus on tab 'requests'
		if ( req.body.focus ) {
			focus = true;
		}

		functions.getContactListDetails(req, function(err, contacts) {
			functions.getRequestListDetails(req, function(err, requests) {
				if (err)
					throw (err);

				if (req.get('X-PJAX')) {

					// if we have results refresh only a small frame in the page
					if (results) {

						// if we only want to show search results refresh results div only
						res.render('frames/results.ejs', {
							results	  : results
						});

					}
					else {

						res.render('bodies/chat.ejs', {
							title	  : title,
							contacts  : contacts,
							requests  : requests,
							user 	  : req.user,
							focus	  : focus,
							info	  : info,
							error	  : req.flash('error')
						});

					}

				}
				else {

					res.render('main_skeleton.ejs', {
						title	  : title,
						contacts  : contacts,
						requests  : requests,
						user 	  : req.user,
						focus	  : focus,
						info	  : info,
						error	  : req.flash('error'),
						body	  : 'bodies/chat.ejs'
					});

				}
			});
		});

	}

	function renderSettings(req, res) {

		var title = "Oblichat | Account Settings";

		if (req.get('X-PJAX')) {

			res.render('bodies/settings.ejs', {
				title	: title,
				user 	: req.user,
				error   : req.flash('error'),
				success : req.flash('success')
			});

		}
		else {

			res.render('main_skeleton.ejs', {
				title	: title,
				user 	: req.user,
				error   : req.flash('error'),
				success : req.flash('success'),
				body	: 'bodies/settings.ejs'
			});

		}

	}

	function renderPasswordChange(req, res) {

		var title = "Oblichat | Change Password";

		if (req.get('X-PJAX')) {

			res.render('bodies/password.ejs', {
				title	: title,
				user    : req.user,
				error   : req.flash('error'),
				success : req.flash('success')
			});

		}
		else {

			res.render('main_skeleton.ejs', {
				title	: title,
				user 	: req.user,
				error   : req.flash('error'),
				success : req.flash('success'),
				body	: 'bodies/password.ejs'
			});

		}

	}

	function renderSetOTP(req, res) {

		var title = "Oblichat | Set one-time Password";

		if (req.get('X-PJAX')) {

			res.render('bodies/otp.ejs', {
				title   : title,
				user    : req.user,
				error   : req.flash('error'),
				success : req.flash('success')
			});

		}
		else {

			res.render('main_skeleton.ejs', {
				title   : title,
				user    : req.user,
				error   : req.flash('error'),
				success : req.flash('success'),
				body    : 'bodies/otp.ejs'
			});

		}

	}

	function renderProfile(req, res) {

		var user = req.params[0];

		var title = "Oblichat | User " + user;

		functions.userExists(user, function(err, exists) {
			if (!exists) {
				// if user doesn't exist render 404 not found page
				res.status(404);
				res.render('errors/404.ejs');

			} else{

				functions.getUserAvatar(user, function(err, path) {
					if (err)
						throw (err);

					if (req.get('X-PJAX')) {

						res.render('bodies/profile.ejs', {
							title	   : title,
							user 	   : req.user,
							username   : user,
							avatar     : path,
							isLoggedIn : req.isAuthenticated(),
							error      : req.flash('error'),
							success    : req.flash('success')
						});

					}
					else {

						res.render('main_skeleton.ejs', {
							title	   : title,
							user 	   : req.user,
							username   : user,
							avatar     : path,
							isLoggedIn : req.isAuthenticated(),
							error      : req.flash('error'),
							success    : req.flash('success'),
							body       : 'bodies/profile.ejs'
						});

					}

				});

			}

		});

	}

// Normal Routes =======================================================================

	// show the home page
	app.get('/', function(req, res) {
		renderMain(req, res);
	});

	app.get('/login', function(req, res) {
		renderMain(req, res);
	});

	app.get('/register', function(req, res) {
		renderRegister(req, res);
	});

	app.get('/chat', isLoggedIn, function(req, res) {
		renderChat(req, res);
	});

	app.get('/settings', isLoggedIn, function(req, res) {
		renderSettings(req, res);
	});

	app.get('/password', isLoggedIn, function(req, res) {
		renderPasswordChange(req, res);
	});

	app.get('/otp', isLoggedIn, function(req, res) {
		renderSetOTP(req, res);
	});

	// profile section
	app.get('/user/*', function(req, res) {
		renderProfile(req, res);
	});

	// profile section shortcut
	app.get('/u/*', function(req, res) {
		renderProfile(req, res);
	});

	// form processing
	app.post('/password', isLoggedIn, function(req, res) {

		var currentpassword = req.body.currentpassword;
		var password 		= req.body.password;
		var retypepassword  = req.body.retypepassword;

		functions.changePassword(req, currentpassword, password, retypepassword, function(err) {
			if (err)
				throw (err);

			res.redirect('/password');
		});
	});

	// form processing
	app.post('/otp', isLoggedIn, function(req, res) {

		var currentpassword = req.body.currentpassword;
		var password 		= req.body.password;

		functions.addOTP(req, currentpassword, password, function(err) {
			if (err)
				throw (err);

			res.redirect('/otp');
		});
	});

	// form processing
	app.post('/chat', isLoggedIn, function(req, res) {

		var username = req.body.username;

		// if info param is set it's not a search query
		if ( req.body.info ) {
			renderChat(req, res)
		} else {

			functions.searchContact(req, username, function(err, results) {
				if (err)
					throw (err);

				renderChat(req, res, results)
			});

		}

	});

	// upload personal avatar
	app.post('/settings', isLoggedIn, function(req, res) {

		functions.uploadAvatar(req, res, function(err) {
			if (err)
				throw (err);

			res.redirect('/settings');
		});

	});
	
	// ajax add to contacts
	app.post('/add', isLoggedIn, function(req, res) {

		var username = req.body.username;

		functions.addContact(req, username, function(err) {
			if (err) {
				res.send(err);
			}
			else {
				res.send("OK");
			}
		});

	});

	// ajax confirm request
	app.post('/confirm', isLoggedIn, function(req, res) {

		var username = req.body.username;

		functions.confirmContact(req, username, function(err) {
			if (err) {
				res.send(err);
			}
			else {
				res.send("OK");
			}
		});

	});

	// ajax block request
	app.post('/block', isLoggedIn, function(req, res) {

		var username = req.body.username;

		functions.blockContact(req, username, function(err) {
			if (err) {
				res.send(err);
			}
			else {
				res.send("OK");
			}
		});

	});
	


	// LOGOUT ==============================
	app.get('/logout', function(req, res) {
		req.logout();
		renderMain(req, res);
	});

	// =============================================================================
	// AUTHENTICATE (LOGIN OR REGISTER) ============================================
	// =============================================================================

	// locally --------------------------------

		// process the login form
		app.post('/', passport.authenticate('login', {
			successRedirect : '/chat', // redirect to home section
			failureRedirect : '/', // redirect back to the register page if there is an error
			failureFlash : true // allow flash messages
		}));

		// process the register form
		app.post('/register', passport.authenticate('register', {
			successRedirect : '/chat', // redirect to home section
			failureRedirect : '/register', // redirect back to the register page if there is an error
			failureFlash : true // allow flash messages
		}));

	// =============================================================================
	// UNLINK ACCOUNTS =============================================================
	// =============================================================================
	// used to unlink accounts. for social accounts, just remove the token
	// for local account, remove email and password
	// user account will stay active in case they want to reconnect in the future

	// local -----------------------------------
	app.get('/unlink/local', isLoggedIn, function(req, res) {
		var user            = req.user;
		user.local.email    = undefined;
		user.local.password = undefined;
		user.save(function(err) {
			res.redirect('/profile');
		});
	});


};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/');
}
