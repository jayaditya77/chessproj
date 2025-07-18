const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const { title } = require('process');

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Board" });
});

io.on("connection", (uniquesocket) => {
    console.log("New client connected");

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    uniquesocket.on("move", (move) => {
        try {
            if (chess.turn() === 'w' && uniquesocket.id !== players.white) return;
            if (chess.turn() === 'b' && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());

                if (chess.game_over()) {
                    io.emit("gameOver", {
                        result: chess.in_checkmate() ? (chess.turn() === 'w' ? 'Black wins' : 'White wins') :
                                chess.in_stalemate() ? 'Stalemate' :
                                chess.in_draw() ? 'Draw' :
                                'Game over'
                    });
                }

            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log("Error:", err);
            uniquesocket.emit("invalidMove", move);
        }
    });

    uniquesocket.on("disconnect", () => {
        console.log("disconnected");

        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
    });
});

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
