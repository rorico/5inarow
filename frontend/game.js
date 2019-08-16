var speed = 500;
var games = 0;

//game parts
var board = [];
var length = 17
for (var i = 0 ; i < length ; i++) {
    var x = [];
    for (var j = 0 ; j < length ; j++) {
        x.push(0);
    }
    board.push(x)
}

var cnt = 0
var html = "<table>";
for (var i = 0 ; i < board.length ; i++) {
    html += "<tr>";
    for (var j = 0 ; j < board[i].length ; j++) {
        var clickable = "<div><div id='" + cnt  +"' class='clickable'></div></div><div></div><div></div><div></div><div></div>"
        html += "<td class='button'>" + clickable + "</td>";

        cnt++;
    }
    html += "</tr>";
}
html += "</table>";

$("body").html(html)


$('.clickable').click(function() {
    sendData({
        type: "play",
        cnt: this.id,
        team: team
    })
});

var team;
var connection;
var myTurn;

$(document).ready(function() {
    startConnection();
});

function showMsg(message) {
    $("body").append("<div id='msg'>" + message + "</div>");
}

function startConnection() {
    var socket = window.WebSocket || window.MozWebSocket;
    var loc = window.location, new_uri;
    if (loc.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    var gameId = loc.pathname.substring(1);
    new_uri += "//" + loc.host + "/websocket?game=" + 0;
    connection = new socket(new_uri);
    connection.onerror = function (error) {
        console.log(error);
    };

    connection.onclose = function () {
        var message = "Connection to server closed";
        showMsg(message);
    };

    connection.onmessage = function (message) {
        var data = JSON.parse(message.data);
        console.log(data);
        switch (data.type) {
        case "start":
            team = data.team;
            board = data.board;
            var length = board.length;
            for (var i = 0 ; i < length ; i++) {
                if (board[i] !== null) {
                    $("#" + i).addClass(board[i] ? 'white' : 'black')
                } else {
                    $("#" + i).removeClass('white black')
                }
            }
            $("table").addClass(team ? 'white' : 'black')
            myTurn = data.turn === team
            if (myTurn) {
                $("table").addClass("myTurn")
            } else {
                $("table").removeClass("myTurn")
            }
            if (team === 2) {
                showMsg("Two players already playing")
            }
            break;
        case "play":
            if (data.team === undefined) {
                alert("something went very wrong");
            } else {
                var pos = data.pos;
                $(".last").removeClass('last')
                $("#" + data.cnt).addClass(data.team == 1 ? 'white' : 'black').addClass('last')
                if (data.team === team) {
                    $("table").removeClass("myTurn")
                } else {
                    $("table").addClass("myTurn")
                }
            }
            break;
        case "win":
            showMsg("Team " + (data.team == 1 ? 'white' : 'black') + " wins!" + 
                    "<div id='yes'>REPLAY</div>")
            $("#yes").click(function() {
                $(this).addClass("clicked")
                $("#msg").remove()
                sendData({type: "replay"})
            })
            break;
        case "endGame":
            break;
        case "newGame":
            break;
        }
    };
}

function playData(player,result) {
    sendData({type:"play",player:player,result:result});
}

function sendNewGame(player,result) {
    sendData({type:"start"});
}

function sendData(data) {
    connection.send(JSON.stringify(data));
}

function getPercentage(num,den) {
    return num + " (" + ((num/den)*100).toFixed(2) + "%)";
}