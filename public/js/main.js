// Minimum and maximum values for password fields
const PASS_MIN = 6;
const PASS_MAX = 40;

// Minimum and maximum values for username fields
const USER_MIN = 4;
const USER_MAX = 20;

/**
 * Helper function, removes the characters that can harm our users
 * @param {string} text - the input text that we want to be sanitized
 * @return {string} sanitized text
 */
function escapeHtml(text) {
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
}

/**
 * Helper function, checks length of any number of parameters
 * @param {int} min - the minimum characters required
 * @param {int} max - the maximum characters required
 * @param {...*} parameter/s - any number of parameters that we want to be checked
 * @return {boolean} true if the input(s) is not valid, false if everything is ok
 */
function notLengthBetween(min, max) {
    //helper function, checks length of any number of parameters

    for (var i = 0; i < arguments.length; i++) {
        if ( (arguments[i].length < min) || (arguments[i].length > max) ) {
            return true; //a parameter exceeds the length
        }
    }
    return false; // all good
}

/**
 * Helper function, checks if the argument(s) are empty or undefined or contain special characters, gets any number of parameters
 * @param {...*} parameter/s - any number of parameters that we want to be checked
 * @return {boolean} true if the input(s) is not valid, false if everything is ok
 */
function isInvalid() {
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
}

/**
 * Helper function, checks if the file is an actual image
 * @callback callback
 * @param {string} elementid - the element's id that holds the file content
 * @return {boolean} true if the file is an image, false if it's not an image
 */
function isImage(elementid, callback) {

    if (!window.FileReader) {
        // The file API isn't supported on this browser yet
        callback(true);
    }

    var fileupload = document.getElementById(elementid).files;

    if (!fileupload) {
        callback(false); // Null element id
    }

    var blob = fileupload[0];
    var fileReader = new FileReader();

    fileReader.onloadend = function(e) {
        var arr = (new Uint8Array(e.target.result)).subarray(0, 4);
        var header = "";
        for(var i = 0; i < arr.length; i++) {
            header += arr[i].toString(16);
        }

        // Check the file signature against known types
        switch (header) {
            case "89504e47":
                // "image/png";
                callback(true);
                break;
            case "47494638":
                // "image/gif";
                callback(true);
                break;
            //case "424d":
            //    // "image/bmp";
            //    callback(true);
            //    break;
            case "ffd8ffe0":
            case "ffd8ffe1":
            case "ffd8ffe2":
                // "image/jpeg";
                callback(true);
                break;
            default:
                // unknown
                callback(false); // Not an image
                break;
        }

    };

    fileReader.readAsArrayBuffer(blob);

}

/**
 * Helper function, reveals a hidden error message
 * @param {string} message - the error message to be displayed
 */
function alertError(message) {
    document.getElementById('erroralert').innerHTML = '<a class="close">x</a>' + message;
    $('#erroralert').show();
}

/**
 * Helper function, reveals a hidden info message
 * @param {string} message - the info message to be displayed
 */
function alertInfo(message) {
    document.getElementById('infoalert').innerHTML = '<a class="close">x</a>' + message;
    $('#infoalert').show();
}

/**
 * A function that checks if there is an active public key stored in the server,
 * if not it generates a new public/private key pair and sends the new public key to the server
 */
function generateKeyPair() {

    // check if an active public key has been set for us in the server side
    $.ajax({
        type: 'POST',
        url: '/publicKeyExists',
        success: function(data) {

            if ( data == false ) {

                // generate our keys
                var keySize = 2048;
                var crypt = new JSEncrypt({default_key_size: keySize});
                crypt.getKey();

                // set a new private RSA key
                var privateKey = crypt.getPrivateKey();
                localStorage.setItem('privateKey', privateKey);

                // set a new public RSA key
                var publicKey = crypt.getPublicKey();
                localStorage.setItem('publicKey', publicKey);

                // send the public key to the server
                $.ajax({
                    type: 'POST',
                    url: '/publicKeyStore',
                    data: { publicKey: publicKey },
                    success: function(data) {
                        if ( data == "OK" ) {
                            // everything is ok, remove the loader
                            loaded();
                        }
                        else {
                            // Something went wrong
                            alertError("Something went wrong")
                        }
                    }
                });

            }
            else {
                // The public key is already created and stored
                loaded();
            }

        }
    });

}

/**
 * Function that gets the current active public key of a given user
 */
function getPublicKey(username, callback) {

    NProgress.start();

    // disable input while loading
    document.getElementById("input").disabled = true;

    $.ajax({
        type: 'POST',
        url: '/getPublicKey',
        data: { username: username },
        success: callback
    });

}

$(document).ready(function() {

    var container = $('#pjax-container');

    // select contact to chat
    container.on("click", ".conv_head_highlight", function(){

        // get the username of the selected user from the element
        var username = $(".username", this).val();
        var $this = this;

        getPublicKey(username, function(publicKey) {

            console.log("The public key of user " + username + " is: " + publicKey);

            // store user's public key locally for later use
            localStorage.setItem(username, publicKey);

            if($('#bottom').is(':hidden')){
                $('#bottom').show();
                //$('#bottom').animateCss('slideInUp');
            }

            $('#input').focus();

            $('.conv_head_highlight').removeClass('selected');
            //highlight the avatar of the person you are talking with
            $($this).addClass('selected');


            // get the avatar image of the selected element (we need the URL only, that's why we use slice() )
            var avatar = $(".conv_img", $this).css("background-image").slice(5, -2);

            $("#userdetails").attr('href', '/user/' + username);
            $("#userdetails > .avatar-circle").attr('src', avatar);
            $("#selecteduser").show();


            // hide all the other chat messages except the ones from the user we selected to talk to
            var message_from_selected_user = $('.message-wrapper.' + username);
            message_from_selected_user.show();
            message_from_selected_user.removeClass('unread');

            $('.message-wrapper').not('.' + username).hide();

            var notifyuser = $("#" + username + " > .notification");
            notifyuser.hide();
            // clear any previous notification (message counter)
            notifyuser.text(0);


            var inner = $('#inner');
            inner.scrollTop(inner[0].scrollHeight); //scrollBottom

            // loading have finished, enable the input again
            document.getElementById("input").disabled = false;

            NProgress.done();
        });

    });

    $.fn.extend({
        animateCss: function (animationName) {
            var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            this.addClass('animated ' + animationName).one(animationEnd, function() {
                $(this).removeClass('animated ' + animationName);
            });
        }
    });

    // hide message when clicking the 'x' button
    container.on("click", ".close", function () {
        $(".alert").hide();
    });

    // submit form by clicking the second helper search button
    container.on('click', '#oblisearchbutton2', function() {
        $( "#oblisearch" ).trigger( "submit" );
    });

    // submit contact search form with pjax
    container.on('submit', '#oblisearch', function(event) {
        event.preventDefault(); // stop default submit behavior

        if ( isInvalid( $('#convSearch').val() ) ) {
            alertError("Special characters are not allowed");
        }
        else if ( notLengthBetween( USER_MIN, USER_MAX, $('#convSearch').val() ) ) {
            alertError("Search username must be between " + USER_MIN + " and " + USER_MAX + " characters");
        }
        else {

            // clear timeout otherwise doStuff() will be executed ~300ms after form submission :P
            clearTimeout(timer);

            //submit form
            $.pjax({
                container: "#pjax-search-container",  //refresh the container that is responsible for showing search results
                type: 'POST',
                url: '/chat',
                data: $(this).serialize()
            });
        }

    });

    // submit login form with pjax
    container.on('submit', '#loginform', function(event) {
        event.preventDefault(); // stop default submit behavior

        if ( notLengthBetween( USER_MIN, USER_MAX, $('#username').val() ) ) {
            alertError("Username must be between " + USER_MIN + " and " + USER_MAX + " characters");
            return;
        }

        if ( notLengthBetween( PASS_MIN, PASS_MAX, $('#inputPassword').val() ) ) {
            alertError("Passwords must be between " + PASS_MIN + " and " + PASS_MAX + " characters");
            return;
        }

        // if everything is ok, submit form
        $.pjax({
            container: "#pjax-container",
            type: 'POST',
            url: '/',
            data: $(this).serialize()
        });

    });

    // submit register form with pjax
    container.on('submit', '#registerform', function(event) {
        event.preventDefault(); // stop default submit behavior

        if ( notLengthBetween( USER_MIN, USER_MAX, $('#username').val() ) ) {
            alertError("Username must be between " + USER_MIN + " and " + USER_MAX + " characters");
            return;
        }

        if ( notLengthBetween( PASS_MIN, PASS_MAX, $('#inputPassword').val(), $('#inputPasswordConfirm').val() ) ) {
            alertError("Passwords must be between " + PASS_MIN + " and " + PASS_MAX + " characters");
            return;
        }

        // if everything is ok, submit form
        $.pjax({
            container: "#pjax-container",
            type: 'POST',
            url: '/register',
            data: $(this).serialize()
        });

    });

    // submit change password form with pjax
    container.on('submit', '#changepassform', function(event) {
        event.preventDefault(); // stop default submit behavior

        if ( notLengthBetween( PASS_MIN, PASS_MAX, $('#currentpassword').val(), $('#password').val(), $('#retypepassword').val() ) ) {
            document.getElementById('password-strength-text').innerHTML = "<div id='feedback-bubble'>Passwords must be between " + PASS_MIN + " and " + PASS_MAX + " characters</div>";
        }
        else {
            //submit form
            $.pjax({
                container: "#pjax-container",
                type: 'POST',
                url: '/password',
                data: $(this).serialize()
            });
        }

    });

    // submit one-time password form with pjax
    container.on('submit', '#otpform', function(event) {
        event.preventDefault(); // stop default submit behavior

        if ( notLengthBetween( PASS_MIN, PASS_MAX, $('#currentpassword').val(), $('#password').val() ) ) {
            document.getElementById('password-strength-text').innerHTML = "<div id='feedback-bubble'>Passwords must be between " + PASS_MIN + " and " + PASS_MAX + " characters</div>";
        }
        else {
            //submit form
            $.pjax({
                container: "#pjax-container",
                type: 'POST',
                url: '/otp',
                data: $(this).serialize()
            });
        }

    });

    // submit upload avatar form
    container.on('submit', '#avatarform', function(event) {
        event.preventDefault(); // stop default submit behavior

        var fileinput = ($("#avatar-upload"))[0];

        // check if a file is selected
        if (fileinput.files.length > 0) {

            var formData = new FormData($('#avatarform')[0]);

            if (typeof FileReader !== "undefined") {
                // Allow only images that are less than 5 MB
                if (fileinput.files[0].size > 5242880) {
                    alertError("Image is more than 5 megabytes");
                    return;
                }
            }

            isImage('avatar-upload', function (result) {
                if (result) {

                    // if everything is ok, submit form
                    $.pjax({
                        container: "#pjax-container",
                        type: 'POST',
                        url: '/settings',
                        contentType: false,
                        processData: false,
                        data: formData
                    });
                }
                else {
                    alertError("Not a valid image type, allowed types are: <br />.gif, .png, .jpg, .jpeg");
                }
            });

        }

    });

    // add contact
    container.on("click", ".conv_head_result", function () {

        $.ajax({
            type: 'POST',
            url: '/add',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    $.pjax({
                        container: "#pjax-container",
                        type: 'POST',
                        url: '/chat',
                        data: { info: "Contact request sent" }
                    });

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    // confirm contact
    container.on("click", ".accept", function () {

        $.ajax({
            type: 'POST',
            url: '/confirm',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    $.pjax({
                        container: "#pjax-container",
                        type: 'POST',
                        url: '/chat',
                        data: { info: "New contact added", focus: true }
                    });

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    // block contact
    container.on("click", ".block", function () {

        $.ajax({
            type: 'POST',
            url: '/block',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    $.pjax({
                        container: "#pjax-container",
                        type: 'POST',
                        url: '/chat',
                        data: { info: "The contact has been blocked", focus: true }
                    });

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    container.on("change", "#avatar-upload", function () {
        document.getElementById("avatar-selected-block").style.display = 'block';
        $("#avatar-selected").text( $("#avatar-upload").val() );
    });

    // delete account link
    container.on("click", "#del", function () {
        $("#del").fadeOut(700);
        $(".deletebtn").fadeIn(700);
    });

    // inspired by the Heroku user dropdown

    function dropdownClick(target, other) {
        if ($(other).hasClass('active')) {
            $(other).removeClass('active');
        }
        $(target).toggleClass('active');
    }

    $('.dropdown-trigger').on('click', function() {
        dropdownClick('.profile-dropdown', '.mobile-menu-dropdown');
    });

    $('.dropdown-trigger--mobile').on('click', function() {
        dropdownClick('.mobile-menu-dropdown', '.profile-dropdown');
    });

    $(document).click(function(event) {

        if(!$(event.target).closest('.dropdown-trigger').length) {
            if($('.profile-dropdown').is(":visible")) {
                $('.profile-dropdown').removeClass('active');
            }
        }

        if(!$(event.target).closest('.dropdown-trigger--mobile').length) {
            if($('.mobile-menu-dropdown').is(":visible")) {
                $('.mobile-menu-dropdown').removeClass('active');
            }
        }

    });

    //Execute when user stops typing

    var timer = null;
    container.on("keydown", "#convSearch", function (event) {
        clearTimeout(timer);
        timer = setTimeout(doStuff, 100);

        // prevent form submission by hitting 'enter' if the search button is not visible
        if(event.keyCode == 13) {
            var button = document.getElementById("oblisearchbutton");
            if (button.style.display == 'none') {
                event.preventDefault();
                return false;
            }
        }
    });

    function doStuff() {

        $('.conv_head_result').hide();
        $('.conv_head').show();

        var searchValue = document.getElementById("convSearch").value.toLowerCase();
        var elements = document.getElementsByClassName("conv_head");
        var contact_divs = document.getElementsByClassName("contact");
        var i = 0;
        var hidden = 0;


        if ( searchValue != '' ) {

            // show input clear mark 'x'
            $("#convSearch").css({"background-position": "12px 14px, right 15px center"});

            for(i=0; i<elements.length; i++) {
                if ( elements[i].textContent.toLowerCase().includes(searchValue) == false) {
                    contact_divs[i].style.display = 'none';
                    hidden += 1;
                }
                else {
                    contact_divs[i].style.display = 'block';
                }
            }
            if ( ( hidden == elements.length ) && ("searchbuttonhidden") ) {
                // All elements are hidden, result not found

                // make oblisearch button visible along with the separator
                $('#oblisearchbutton').show();
                $('#searchnotfound').show();

                $('.tabs').hide();

            }
            else {

                $('#searchnotfound').hide();
                $('#oblisearchbutton').hide();

                $('.tabs').show();
                $('#oblisearchbutton2').show();
            }

        }
        else {
            // hide input clear mark 'x'
            $("#convSearch").css({"background-position": "12px 14px, right -15px center"});
            $('#searchnotfound').hide();
            $('#oblisearchbutton').hide();
            $('#oblisearchbutton2').hide();

            $('.tabs').show();

            document.getElementById("oblisearchbutton").style.display = 'none';
            for(i=0; i<elements.length; i++) {
                contact_divs[i].style.display = 'block';
            }
        }
    }

    //------------------------------

    // clearable search input
    function tog(v){return v?'addClass':'removeClass';}
    container.on('input', '.clearable', function(){
        $(this)[tog(this.value)]('x');
    }).on('mousemove', '.x', function( e ){
        $(this)[tog(this.offsetWidth-40 < e.clientX-this.getBoundingClientRect().left)]('onX');
    }).on('touchstart click', '.onX', function( ev ){
        ev.preventDefault();
        // if the 'x' button is pressed clear search input and show contacts
        $('.alert-info').hide();
        $(this).removeClass('x onX').val('').change();
        doStuff()
    }).on('click', '.clear', function(){
        // if the 'x' button from info message is pressed clear search input and show contacts
        $('#convSearch').removeClass('x onX').val('').change();
        doStuff()
    });







    // Action for user profile page only
    // ====================================================

    // chat with contact
    container.on("click", ".profile-chat", function () {

        //TODO: focus given contact
        $.pjax({
            container: "#pjax-container",
            type: 'GET',
            url: '/chat'
        });

    });

    // confirm contact
    container.on("click", ".profile-accept", function () {

        $.ajax({
            type: 'POST',
            url: '/confirm',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    $.pjax({
                        container: "#pjax-container",
                        type: 'POST',
                        url: '/chat',
                        data: { info: "New contact added", focus: true }
                    });

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    // add contact
    container.on("click", ".profile-add", function () {

        $.ajax({
            type: 'POST',
            url: '/add',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    alertInfo("Contact request sent");

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    // block contact
    container.on("click", ".profile-block", function () {

        $.ajax({
            type: 'POST',
            url: '/block',
            data: { username: $(".username", this).val() },
            success: function(data) {
                if (data=="OK") {

                    // if everything is ok do a pjax call
                    alertInfo("The contact has been blocked");

                }
                else {
                    // Something went wrong
                    alertError("Something went wrong")
                }
            }
        });

    });

    // ====================================================


});
