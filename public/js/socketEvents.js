// we want to initiate a connection after a user is logged in
var socket = io.connect({ autoConnect: false });

/**
 * Function that initiate a web socket connection to the server if the user has logged in
 */
function socketConnect() {
    // if upperbar is visible the user is probably logged in so we can initiate a socket connection
    // (of course I double check if someone is authenticated in server side)
    if($('#upperbar').is(':visible')){

        if (!socket.connected) {

            console.log("socket connect");
            socket.open(); // start connecting
            showSpinner();

            // generate our private/public RSA key pair
            setTimeout(function() {
                generateKeyPair();
            }, 500);

        }

    }
    else {
        socket.close();
    }
}

/**
 * Helper function that shows a a loading spinner
 */
function showSpinner() {
    var opts = {
        lines: 11 // The number of lines to draw
        , length: 0 // The length of each line
        , width: 52 // The line thickness
        , radius: 0 // The radius of the inner circle
        , scale: 1.75 // Scales overall size of the spinner
        , corners: 1 // Corner roundness (0..1)
        , color: '#7572f2' // #rgb or #rrggbb or array of colors
        , opacity: 0.2 // Opacity of the lines
        , rotate: 0 // The rotation offset
        , direction: 1 // 1: clockwise, -1: counterclockwise
        , speed: 0.8 // Rounds per second
        , trail: 34 // Afterglow percentage
        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
        , zIndex: 2e9 // The z-index (defaults to 2000000000)
        , className: 'spinner' // The CSS class to assign to the spinner
        , left: '50%' // Left position relative to parent
        , shadow: false // Whether to render a shadow
        , hwaccel: false // Whether to use hardware acceleration
        , position: 'relative' // Element positioning
    };
    var target = document.getElementById('spinner');
    var spinner = new Spinner(opts).spin(target);
    $("#loader").show();
}

/**
 * Function that executes after the RSA key pair has been generated and is stored on the server.
 * it hides the loading icon and emits to our contacts that we are online
 */
function loaded() {
    socket.emit('loaded');
    $("#loader").fadeOut();
    console.log("ready!!!");
}

/**
 * This function counts the total unread messages that we have from a given
 * user and displays the number back to us with a nice orange bubble next to the user's avatar
 * @param {string} username - the username that has sent some unread messages
 */
function notifyBubble(username) {
    var notifyuser = $("#" + username + " > .notification");

    // count the unread messages of the given user
    var counter = $("#messages > .message-wrapper.them.unread." + username).length;
    if (counter >= 99) {
        notifyuser.text( "99+" );
    }
    else {
        notifyuser.text( counter );
    }

    //show the notification
    notifyuser.css({"display":"inline-block"});
}

/**
 * This is a function that appends a message to the visible div #messages
 * @param {string} fromuser - the username of the user who sent the message
 * @param {string} message  - the text of the message
 * @param {string} who      - this parameter indicates how the message should be represent visually (can only be 'me' or 'them')
 * @param {string} hidden   - optional parameter, if set then the class ".unread" is added and the message will be invisible
 */
function appendMessage(fromuser, message, who, hidden) {
    var unread;

    if (typeof hidden == 'undefined') {
        hidden = '';
        unread = '';
    }
    else {
        hidden = 'style="display: none;"';
        unread = 'unread';
    }

    var content = $('#messages');
    content.append('<div ' + hidden +' class="message-wrapper ' + unread + ' ' + who + ' ' + fromuser + '">\n              <div class="circle-wrapper animated bounceIn"></div>\n              <div class="text-wrapper animated fadeIn">' + message + '</div><input type="hidden" class="username" value="' + fromuser + '">\n            </div>');
}

/**
 * This is a function that appends a message to the hidden invisible div #messageKeeper
 * in order to keep the message elements across the page loads
 * @param {string} fromuser - the username of the user who sent the message
 * @param {string} message  - the text of the message
 * @param {string} who      - this parameter indicates how the message should be represent visually (can only be 'me' or 'them')
 */
function saveMessage(fromuser, message, who) {
    var messageKeeper = $('#messageKeeper');
    messageKeeper.append('<div style="display: none;" class="message-wrapper unread ' + who + ' ' + fromuser + '">\n              <div class="circle-wrapper animated bounceIn"></div>\n              <div class="text-wrapper animated fadeIn">' + message + '</div><input type="hidden" class="username" value="' + fromuser + '">\n            </div>');
}

/**
 * This function copies the all the messages from the hidden invisible div #messageKeeper into the visible div #messages
 * and calls notifyBubble() to alert the user for any unread messages
 */
function checkMessages() {
    var messageKeeper = $('#messageKeeper');
    var messages = $('.message-wrapper');
    var content = $('#messages');

    // if the message keeper contains messages, transfer that message to the main chat dashboard
    if ( messageKeeper.length) {
        content.html( messageKeeper.html() );

        $("#messages > .unread").each(function() {
            var username = $(".username", this).val();
            notifyBubble(username);
        });
    }

    socketConnect();
}

/**
 * Function that checks if a the current tab is focused or not
 */
var activeTab = (function(){
    var stateKey, eventKey, keys = {
        hidden: "visibilitychange",
        webkitHidden: "webkitvisibilitychange",
        mozHidden: "mozvisibilitychange",
        msHidden: "msvisibilitychange"
    };
    for (stateKey in keys) {
        if (stateKey in document) {
            eventKey = keys[stateKey];
            break;
        }
    }
    return function(c) {
        if (c) document.addEventListener(eventKey, c);
        return !document[stateKey];
    }
})();

activeTab(function(){
    if ( !activeTab() ) {
        document.title = "returned";
    }
});

/**
 * Function that plays a sound and changes the title if tab is not focused
 * @param {string} username - the username of the user who sent the message
 */
function newNotification(username) {
    var audio = new Audio('/sounds/alert.wav');
    audio.play();

    var visible = activeTab();

    if (!visible) {
        // and change title
        var newTitle = $(document).find("title").text() + " --New message from " + username + "-- ";
        //do not add the same thing again and again
        if ( document.title != newTitle) {
            titleScroller(newTitle)
        }
    }

}

/**
 * Function that scrolls the page title
 */
function titleScroller(text) {
    document.title = text;
    setTimeout(function () {
        titleScroller(text.substr(1) + text.substr(0, 1));
    }, 200);
}

$(document).on('pjax:beforeReplace',   function() {
    // before you navigate away from the page copy all the messages to the messageKeeper to keep them alive
    var messageKeeper = $('#messageKeeper');
    var messages = $('.message-wrapper');
    var content = $('#messages');

    // if there are any messages save them to the messageKeeper
    if ( content.length) {
        messages.hide();
        messageKeeper.html( content.html() );
    }
});

$(document).on('pjax:complete',   function() {
    checkMessages()
});

window.addEventListener('popstate', function(event) {
    // Browser back button is pressed
    checkMessages()
}, false);

$(document).ready(function() {

    socketConnect();

    var container = $('#pjax-container');

    // whenever a user comes online mark that user as available
    socket.on('online', function(username) {
        console.log("Username " + username + " is online");
        $("#" + username + " > .conv_img > .circle-mark").css('color', '#43e265');

        // if the user that we have selected just came online request the public key again
        if ( $('.selected > .conv_head > .username').val() == username ) {

            console.log("Reload public key");
            getPublicKey(username, function(publicKey) {

                // store user's public key locally for later use
                localStorage.setItem(username, publicKey);

                // loading have finished, enable the input again
                document.getElementById("input").disabled = false;
                NProgress.done();

            });

        }
    });

    socket.on('offline', function(username) {
        console.log("Username " + username + " is offline");
        $("#" + username + " > .conv_img > .circle-mark").css('color', '#b5b2b2');
    });

    socket.on('receive', function(message, username) {
        console.log("Received " + message + " from " + username);
        receiveMessage(message, username);
    });

    // send message
    function sendMessage() {
        var content = $('#content');
        var input = $('#input');
        var inner = $('#inner');
        var user = $(".selected > .conv_head > .username").val();
        var message = input.val();

        input.focus();

        if (message) {
            message = escapeHtml(message);
            input.val('');
            appendMessage(user, message, 'me');
            inner.scrollTop(inner[0].scrollHeight); //scrollBottom

            // retrieve the public key of the recipient from the local storage
            var publicKey = localStorage.getItem(user);

            var crypt = new JSEncrypt();
            crypt.setPublicKey(publicKey);

            // send the message to the server encrypted
            socket.emit('send', crypt.encrypt(message), user);
        }

    }

    // receive message
    function receiveMessage(message, username) {
        var messageKeeper = $('#messageKeeper');
        var content = $('#content');
        var input = $('#input');
        var inner = $('#inner');
        var selecteduser = $(".selected > .conv_head > .username").val();

        if (message) {

            // decrypt message using our private key which is stored locally
            var crypt = new JSEncrypt();
            var ownPrivateKey = localStorage.getItem('privateKey');
            crypt.setPrivateKey(ownPrivateKey);
            message = crypt.decrypt(message);

            // remove any potential code that can harm us
            message = escapeHtml(message);

            // if the div "content" does not exist, then the user is not in the chat page
            if ( !content.length) {
                // keep the (unread) message for later use
                saveMessage(username, message, 'them');
                newNotification(username);
            }
            else {

                // if user is not focused to the user that sends the message hide the message and present an alert
                if ( selecteduser != username )  {
                    appendMessage(username, message, 'them', 'hidden');
                    notifyBubble(username);
                    newNotification(username);
                }
                else {
                    appendMessage(username, message, 'them');
                    inner.scrollTop(inner[0].scrollHeight); //scrollBottom
                    newNotification(username);
                }

            }


        }
    }

    container.on("click", "#send", function () {
        sendMessage();
    });

    container.on('keydown', '#input', function(e) {
        var key = e.which || e.keyCode;
        if (key === 13) {
            e.preventDefault();
            sendMessage();
        }
    });

});