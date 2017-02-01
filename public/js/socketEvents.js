// we want to initiate a connection after a user is logged in
var socket = io.connect({ autoConnect: false });

function socketConnect() {
    // if upperbar is visible the user is probably logged in so we can initiate a socket connection
    // (of course I double check if someone is authenticated in server side)
    if($('#upperbar').is(':visible')){

        if (!socket.connected) {
            console.log("socket connect");
            socket.open(); // start connecting
        }

    }
    else {
        socket.close();
    }
}

$(document).on('pjax:complete',   function() {
    socketConnect();
});

$(document).ready(function() {

    socketConnect();

    var container = $('#pjax-container');

    // whenever a user comes online mark that user as available
    socket.on('online', function(username) {
        console.log("Username " + username + " is online");
        $("#" + username + " > .conv_img > .circle-mark").css('color', '#43e265');
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
            content.append('<div class="message-wrapper me ' + user + '">\n              <div class="circle-wrapper animated bounceIn"></div>\n              <div class="text-wrapper animated fadeIn">' + message + '</div>\n            </div>');
            inner.scrollTop(inner[0].scrollHeight); //scrollBottom

            socket.emit('send', message, user);
        }

    }

    // receive message
    function receiveMessage(message, username) {
        var content = $('#content');
        var input = $('#input');
        var inner = $('#inner');
        var selecteduser = $(".selected > .conv_head > .username").val();

        if (message) {
            message = escapeHtml(message);

            // if user is not focused to the user that sends the message hide the message and present an alert
            if (selecteduser != username) {
                content.append('<div style="display: none;" class="message-wrapper them ' + username + '">\n              <div class="circle-wrapper animated bounceIn"></div>\n              <div class="text-wrapper animated fadeIn">' + message + '</div>\n            </div>');

                var notifyuser = $("#" + username + " > .notification");

                // increase the unread message counter
                var counter = parseInt(notifyuser.text());
                if (counter >= 99) {
                    notifyuser.text( "99+" );
                }
                else {
                    notifyuser.text( ++counter );
                }

                //show the notification
                notifyuser.css({"display":"inline-block"});
                // play sound
                var audio = new Audio('/sounds/alert.wav');
                audio.play();
            }
            else {
                content.append('<div class="message-wrapper them ' + username + '">\n              <div class="circle-wrapper animated bounceIn"></div>\n              <div class="text-wrapper animated fadeIn">' + message + '</div>\n            </div>');
                inner.scrollTop(inner[0].scrollHeight); //scrollBottom
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