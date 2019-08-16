const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const WebSocketServer = require("websocket").server;
const express = require("express");
var app = express();

var port = process.env.PORT || 8081,
    ip   = process.env.IP || "0.0.0.0";

//start with a game
var currentGameId = 0;
// var activeGames = {"0":newGame()};

app.use(function(req,res,next) {
    console.log(req.url)
    var svrUrl = url.parse(req.url);
    var filename = svrUrl.pathname;
    //paths with numbers in them correspond to specific games
    filename = filename.substr(1);
    if (!filename || filename === "game") {
        filename = "game.html";
    } else if (filename === "replay") {
        //if no game specified, show replay list
        if (svrUrl.query) {
            filename = "replay.html";
        } else {
            filename = "replayList.html";
        }
    }
    req.url = "/" + filename;
    next();
});
app.use(express.static("./"));
app.use(express.static("./frontend"));
// do this for websocket
var server = http.createServer(app);
server.listen(port,function() {
    console.log("Server running at http://" + ip + ":" + port);
});

var wsServer = new WebSocketServer({
    httpServer: server
});

var board = [];
var length = 17
for (var i = 0 ; i < length ; i++) {
    for (var j = 0 ; j < length ; j++) {
        board.push(null);
    }
}
listeners = [];
var startPlayer = 0
var currentPlayer = 0;
var replay = [false, false]
var winner = null
function restartGame() {
    startPlayer = 1 - startPlayer
    currentPlayer = startPlayer
    winner = null
    for (var i = 0 ; i < board.length ; i++) {
        board[i] = null
    }
}

function check(cnt) {
    var x = cnt % length
    var y = (cnt - x) / length
    var team = board[cnt]
    var dirs = [
        [1,1],
        [0,1],
        [1,0],
        [1,-1]
    ]
    return !!dirs.find(d => {
        var cnt = 0
        for (var i = -4 ; i <= 4 ; i++) {
            var x1 = x + i*d[0], y1 = y + i*d[1]
            if (x1 >= 0 && x1 < length && y1 >= 0 && y1 < length) {
                if (board[x1 + length*y1] === team) {
                    cnt++
                    if (cnt === 5) {
                        return true
                    }
                } else {
                    cnt = 0
                }
            }
        }
    })
}


wsServer.on("request", function(request) {
    var connection = request.accept(null, request.origin);
    var query = request && request.resourceURL && request.resourceURL.query;
    var gameId = query.game;

    var messageHandler;
    var closeHandler;

    var sendData = function(info) {
        connection.sendUTF(JSON.stringify(info));
    };
    var id = 0;
    if (listeners[0]) {
        id = 1;
        if (listeners[1]) {
            id = 2;
        }
    }
    sendData({type: 'start', team: id, board: board, turn: currentPlayer})
    if (winner !== null) {
        sendData({
            type: "win",
            team: winner
        })
    }
    listeners[id] = sendData
    messageHandler = function(message) {
        var query = JSON.parse(message);
        var type = query ? query.type : "";
        switch(type) {
            case "play":
                if (query.team == currentPlayer && board[query.cnt] === null) {
                    board[query.cnt] = query.team
                    var win = check(query.cnt)
                    listeners.forEach((l) => {
                        l && l(query);
                        if (win) {
                            winner = query.team
                            l && l({
                                type: "win",
                                team: winner
                            })
                        }
                    })
                    currentPlayer = 1 - currentPlayer
                }
                break;
                
            case "replay":
                replay[id] = true
                if (replay[0] && replay[1]) {
                    restartGame()
                    listeners.forEach((l, i) => {
                        l && l({type: 'start', team: i, board: board, turn: currentPlayer})
                    })
                    replay[0] = replay[1] = false
                }
                break;
            case "getGames":
                var list = [];
                for (var gameId in activeGames) {
                    list.push([gameId,activeGames[gameId].spaces()]);
                }
                var ret = {type:"getGames",games:list};
                sendData(ret);
                break;
            case "joinGame":
                joinGame(query.gameId,query.name);
                break;
            case "createGame":
                var thisGame = newGame();
                currentGameId++;
                activeGames[currentGameId] = thisGame;
                joinGame(currentGameId,query.name);
                break;
        }
    };

    //these allow changes in the functions outside
    connection.on("message", function(message) {
        if (message.type === "utf8" && typeof messageHandler === "function") {
            messageHandler(message.utf8Data);
        }
    });

    connection.on("close", function() {
        listeners[id] = null;
        if (typeof closeHandler === "function") {
            closeHandler();
        }
    });
});
