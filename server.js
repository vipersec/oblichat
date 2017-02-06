// server.js

// set up ======================================================================
var express      = require('express');
var app          = express();
var port         = process.env.PORT || 8080;
var mongoose     = require('mongoose');
var passport     = require('passport');
var lupus        = require('lupus');
var flash        = require('connect-flash');
var crypto       = require('crypto');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var favicon      = require('serve-favicon');

var server       = require('http').createServer(app);
var io           = require('socket.io')(server);

const MongoStore = require('connect-mongo')(session);

var configDB     = require('./config/database.js');
var functions    = require('./config/functions');

// this should be changed in every new installation
var SECRET_TOKEN = "nWUy5PT4FcVTdtXuMrYHPTHhSjXC4tCPos6IyPHQnWUy5PT4FcVTdtXuMrYH";

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.use(express.static(__dirname + '/public'));
// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); // set up ejs for templating

//set custom favicon
app.use(favicon(__dirname + '/public/images/favicon.ico'));

// required for passport
app.use( sessionMiddleware = session({
   secret: SECRET_TOKEN,
   resave : true,
   saveUninitialized: true,
   clear_interval: 900,
   cookie: { maxAge: 2 * 60 * 60 * 1000 },
   store: new MongoStore(configDB)
}));

io.use(function(socket, next) {
   sessionMiddleware(socket.request, socket.request.res, next);
});

app.use( passport.initialize() );
app.use( passport.session() ); // persistent login sessions
app.use( flash() ); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// error handling ======================================================================

// Handle 404 not found
app.use(function(req, res) {
   res.status(404);
   res.render('errors/404.ejs');
});

// it's better to keep the user's personal room in memory instead of calculating the HMAC again and again
roomCache = [];

// socket.io ====================================================================
io.on('connection', function (socket) {

   var authenticated = false;

   console.log('A client connected');
   // socket.request.session.passport.user holds the user's Id
   var userId = socket.request.session.passport.user;

   if ( userId ) {

      authenticated = true;

      functions.getUsername( userId, function(err, username) {
         if (!roomCache[username]) {
            console.log( "Room cache created for user: " + username );
            roomCache[username] = crypto.createHmac('sha256', SECRET_TOKEN).update( username ).digest('hex');
         }

         // join personal notification room
         socket.join( roomCache[username] );
         console.log( "Personal room: " + roomCache[username] );

      });


   } else {

      console.log( "Unauthenticated" );
      authenticated = false;
      socket.disconnect();

   }

   socket.on('loaded', function() {
      if (authenticated) {

         functions.getUsername( userId, function(err, username) {

            // emit to our contacts that we are online
            functions.getUserContacts( userId, function(err, contacts) {
               console.log( "Contacts: " + contacts );

               // use lupus for non-blocking for loop
               lupus(0, contacts.length, function(i) {
                  io.to(roomCache[contacts[i]]).emit('online', username);
               });

            });

         });

      }
   });

   socket.on('disconnect', function() {
      if (authenticated) {

         functions.getUsername( userId, function(err, username) {

            // if the room doesn't exist it means that there are no sockets attached to it (no open tabs)
            // which means that we can emit the 'offline' event (user left)
            if ( !io.nsps["/"].adapter.rooms[roomCache[username]] ) {

               // remove our name from the roomCache
               delete roomCache[username];

               // clear public RSA keys from the server for the given offline user
               delete publicKeys[username];

               // emit to our contacts that we are not online
               functions.getUserContacts( userId, function(err, contacts) {

                  // use lupus for non-blocking for loop
                  lupus(0, contacts.length, function(i) {
                     io.to(roomCache[contacts[i]]).emit('offline', username);
                  });

               });

            }
         });

      }
   });

   socket.on('send', function (message, username) {
      if (authenticated) {

         if (message) {
            message = functions.escapeHtml(message);

            // TODO: check if username is in contacts list
            functions.getUsername( userId, function(err, fromuser) {
               // notify user that you sent a message using his personal room
               io.to(roomCache[username]).emit('receive', message, fromuser);
            });
         }

      }
   });

   socket.on('check', function () {
      if (authenticated) {

         functions.getUsername( userId, function(err, username) {
            functions.getUserContacts( userId, function(err, contacts) {
               // use lupus for non-blocking for loop
               lupus(0, contacts.length, function(i) {
                  if (roomCache[contacts[i]]) {
                     io.to(roomCache[username]).emit('online', contacts[i]);
                  }
               });

            });
         });

      }
   });

});

// launch ======================================================================
server.listen(port, function () {
   console.log('Cleaning the screen...');
   process.stdout.write("\u001b[2J\u001b[0;0H"); // clear the screen
   console.log('The magic happens on port ' + port);
});