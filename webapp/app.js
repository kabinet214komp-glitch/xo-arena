const tg = window.Telegram?.WebApp;

if (tg) {

    tg.ready();

    tg.expand();
}


// ======================================================
// ELEMENTS
// ======================================================

const menu =
    document.getElementById("menu");

const roomPanel =
    document.getElementById("roomPanel");

const friendButton =
    document.getElementById("friendButton");

const randomButton =
    document.getElementById("randomButton");

const search =
    document.getElementById("search");

const cancelSearch =
    document.getElementById("cancelSearch");

const inviteButton =
    document.getElementById("inviteButton");

const connection =
    document.getElementById("connection");

const roomText =
    document.getElementById("roomText");

const playerText =
    document.getElementById("playerText");

const waiting =
    document.getElementById("waiting");

const status =
    document.getElementById("status");

const newGame =
    document.getElementById("newGame");

const backButton =
    document.getElementById("backButton");

const result =
    document.getElementById("result");

const resultIcon =
    document.getElementById("resultIcon");

const resultText =
    document.getElementById("resultText");

const cells =
    document.querySelectorAll(".cell");


// ======================================================
// STATE
// ======================================================

let socket = null;

let roomId = null;

let myPlayer = null;

let board = [];

let currentTurn = null;

let winner = null;

let botUsername = null;

let searching = false;


// ======================================================
// TELEGRAM BOT USERNAME
// ======================================================

async function loadConfig() {

    try {

        const response =
            await fetch("/config");

        const data =
            await response.json();

        botUsername =
            data.username;

    } catch (error) {

        console.error(
            "Config error:",
            error
        );
    }
}


// ======================================================
// URL ROOM
// ======================================================

function getRoomFromURL() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("room");
}


// ======================================================
// CONNECT
// ======================================================

function connect(room) {

    roomId = room;

    menu.classList.add("hidden");

    roomPanel.classList.remove("hidden");

    roomText.textContent =
        `Комната: #${roomId}`;


    const protocol =
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";


    const url =
        protocol +
        "//" +
        window.location.host +
        "/ws/" +
        roomId;


    connection.textContent =
        "🟡 Подключение...";


    socket =
        new WebSocket(url);


    socket.onopen = () => {

        connection.textContent =
            "🟢 Онлайн";

        connection.style.color =
            "#4ade80";
    };


    socket.onmessage = event => {

        const data =
            JSON.parse(
                event.data
            );

        handleMessage(data);
    };


    socket.onerror = error => {

        console.error(
            "WebSocket error:",
            error
        );

        connection.textContent =
            "🔴 Ошибка";
    };


    socket.onclose = () => {

        connection.textContent =
            "🔴 Соединение потеряно";
    };
}


// ======================================================
// MESSAGE
// ======================================================

function handleMessage(data) {

    if (data.type === "connected") {

        myPlayer =
            data.player;

        board =
            data.board || [];

        currentTurn =
            data.turn;

        winner =
            data.winner;

        updatePlayer();

        updatePlayers(
            data.players
        );

        render();

        updateStatus();

        return;
    }


    if (data.type === "state") {

        board =
            data.board || [];

        currentTurn =
            data.turn;

        winner =
            data.winner;

        updatePlayers(
            data.players
        );

        render();

        updateStatus();


        if (data.players >= 2) {

            waiting.classList.add(
                "hidden"
            );

        } else {

            waiting.classList.remove(
                "hidden"
            );
        }


        if (winner) {

            showResult(winner);
        }

        return;
    }


    if (data.type === "error") {

        status.textContent =
            data.message;
    }
}


// ======================================================
// PLAYER
// ======================================================

function updatePlayer() {

    if (myPlayer === "X") {

        playerText.textContent =
            "❌ Ты играешь за X";

    } else {

        playerText.textContent =
            "⭕ Ты играешь за O";
    }
}


// ======================================================
// PLAYERS
// ======================================================

function updatePlayers(count) {

    if (count >= 2) {

        waiting.classList.add(
            "hidden"
        );

    } else {

        waiting.classList.remove(
            "hidden"
        );
    }
}


// ======================================================
// BOARD
// ======================================================

function render() {

    cells.forEach(
        (cell, index) => {

            const value =
                board[index] || "";

            cell.textContent =
                value;

            cell.classList.remove(
                "x",
                "o"
            );


            if (value === "X") {

                cell.classList.add(
                    "x"
                );
            }


            if (value === "O") {

                cell.classList.add(
                    "o"
                );
            }


            cell.disabled =
                Boolean(
                    value
                );
        }
    );
}


// ======================================================
// STATUS
// ======================================================

function updateStatus() {

    if (winner) {
        return;
    }


    if (!currentTurn) {

        status.textContent =
            "⏳ Ожидаем игрока...";

        return;
    }


    if (currentTurn === myPlayer) {

        status.textContent =
            "🔥 ТВОЙ ХОД";

        status.style.color =
            "#ffffff";

    } else {

        status.textContent =
            "⏳ ХОД СОПЕРНИКА";

        status.style.color =
            "#9999aa";
    }
}


// ======================================================
// MOVE
// ======================================================

cells.forEach(
    cell => {

        cell.addEventListener(
            "click",
            () => {

                if (!socket) {
                    return;
                }


                if (
                    socket.readyState !==
                    WebSocket.OPEN
                ) {
                    return;
                }


                if (winner) {
                    return;
                }


                if (
                    currentTurn !==
                    myPlayer
                ) {
                    return;
                }


                const index =
                    Number(
                        cell.dataset.index
                    );


                if (board[index]) {
                    return;
                }


                socket.send(
                    JSON.stringify({

                        action: "move",

                        index: index

                    })
                );
            }
        );
    }
);


// ======================================================
// CREATE ROOM
// ======================================================

async function createRoom() {

    try {

        const response =
            await fetch(
                "/create-room"
            );

        const data =
            await response.json();

        return data.room;

    } catch (error) {

        console.error(error);

        return null;
    }
}


// ======================================================
// PLAY WITH FRIEND
// ======================================================

friendButton.addEventListener(
    "click",
    async () => {

        friendButton.disabled =
            true;

        const room =
            await createRoom();

        friendButton.disabled =
            false;


        if (!room) {

            alert(
                "Не удалось создать комнату"
            );

            return;
        }


        connect(room);
    }
);


// ======================================================
// INVITE FRIEND
// ======================================================

inviteButton.addEventListener(
    "click",
    async () => {

        if (!botUsername) {

            await loadConfig();
        }


        if (!botUsername) {

            alert(
                "Не удалось получить Telegram username бота"
            );

            return;
        }


        const invite =
            `https://t.me/${botUsername}?start=game_${roomId}`;


        const text =
            "🎮 Заходи в XO Arena! " +
            "Сыграем онлайн 👇";


        const shareUrl =
            "https://t.me/share/url" +
            "?url=" +
            encodeURIComponent(invite) +
            "&text=" +
            encodeURIComponent(text);


        if (tg?.openTelegramLink) {

            tg.openTelegramLink(
                shareUrl
            );

        } else {

            window.open(
                shareUrl,
                "_blank"
            );
        }
    }
);


// ======================================================
// RANDOM MATCHMAKING
// ======================================================

randomButton.addEventListener(
    "click",
    async () => {

        if (searching) {
            return;
        }


        searching = true;


        menu.classList.add(
            "hidden"
        );

        search.classList.remove(
            "hidden"
        );


        const room =
            await createRoom();


        if (!room) {

            searching = false;

            search.classList.add(
                "hidden"
            );

            menu.classList.remove(
                "hidden"
            );

            return;
        }


        // Для первой версии
        // используем комнату ожидания.

        // Чтобы два игрока автоматически
        // нашли друг друга, создаём
        // одинаковый matchmaking room.

        const matchRoom =
            "MATCHMAKING";


        connect(matchRoom);
    }
);


// ======================================================
// CANCEL SEARCH
// ======================================================

cancelSearch.addEventListener(
    "click",
    () => {

        searching = false;

        search.classList.add(
            "hidden"
        );

        menu.classList.remove(
            "hidden"
        );
    }
);


// ======================================================
// NEW GAME
// ======================================================

newGame.addEventListener(
    "click",
    () => {

        if (!socket) {
            return;
        }


        if (
            socket.readyState !==
            WebSocket.OPEN
        ) {
            return;
        }


        socket.send(
            JSON.stringify({
                action: "reset"
            })
        );


        result.classList.add(
            "hidden"
        );
    }
);


// ======================================================
// BACK
// ======================================================

backButton.addEventListener(
    "click",
    () => {

        if (socket) {

            socket.close();

            socket = null;
        }


        roomPanel.classList.add(
            "hidden"
        );

        menu.classList.remove(
            "hidden"
        );


        result.classList.add(
            "hidden"
        );
    }
);


// ======================================================
// START
// ======================================================

async function start() {

    await loadConfig();


    const existingRoom =
        getRoomFromURL();


    if (existingRoom) {

        connect(existingRoom);

    } else {

        menu.classList.remove(
            "hidden"
        );
    }
}


start();
