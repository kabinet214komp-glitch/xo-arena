const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
}


// =====================================================
// ELEMENTS
// =====================================================

const cells = document.querySelectorAll(".cell");

const status = document.getElementById("status");

const connection =
    document.getElementById("connection");

const playerText =
    document.getElementById("playerText");

const roomText =
    document.getElementById("roomText");

const result =
    document.getElementById("result");

const resultText =
    document.getElementById("resultText");

const resultIcon =
    document.getElementById("resultIcon");

const newGame =
    document.getElementById("newGame");

const xPlayers =
    document.getElementById("xPlayers");

const oPlayers =
    document.getElementById("oPlayers");


// =====================================================
// ROOM
// =====================================================

// Пока используем room из URL:
//
// https://site.com/?room=ABC123
//
// Если комнаты нет — создаём её.

const params =
    new URLSearchParams(
        window.location.search
    );

let roomId =
    params.get("room");


// Создаём комнату, если её нет

if (!roomId) {

    roomId =
        Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

    const newUrl =
        `${window.location.origin}/?room=${roomId}`;

    window.history.replaceState(
        {},
        "",
        newUrl
    );
}


roomText.textContent =
    `Комната: #${roomId}`;


// =====================================================
// STATE
// =====================================================

let socket = null;

let myPlayer = null;

let board = [];

let currentTurn = null;

let winner = null;


// =====================================================
// WEBSOCKET URL
// =====================================================

function getWebSocketURL() {

    const protocol =
        window.location.protocol === "https:"
            ? "wss:"
            : "ws:";

    return (
        protocol +
        "//" +
        window.location.host +
        "/ws/" +
        roomId
    );
}


// =====================================================
// CONNECT
// =====================================================

function connect() {

    connection.textContent =
        "🟡 Подключение...";

    socket =
        new WebSocket(
            getWebSocketURL()
        );


    socket.onopen = () => {

        connection.textContent =
            "🟢 Онлайн";

        connection.style.color =
            "#4ade80";
    };


    socket.onclose = () => {

        connection.textContent =
            "🔴 Отключено";

        connection.style.color =
            "#ff5555";

        status.textContent =
            "Соединение потеряно";
    };


    socket.onerror = () => {

        connection.textContent =
            "🔴 Ошибка";
    };


    socket.onmessage = event => {

        const data =
            JSON.parse(event.data);

        handleMessage(data);
    };
}


// =====================================================
// SERVER MESSAGE
// =====================================================

function handleMessage(data) {

    // -----------------------------------------------
    // CONNECTED
    // -----------------------------------------------

    if (data.type === "connected") {

        myPlayer =
            data.player;

        board =
            data.board || [];

        currentTurn =
            data.turn;

        winner =
            data.winner;

        updatePlayers(
            data.players
        );

        playerText.textContent =
            myPlayer === "X"
                ? "❌ Ты играешь за X"
                : "⭕ Ты играешь за O";

        render();

        updateStatus();

        return;
    }


    // -----------------------------------------------
    // STATE
    // -----------------------------------------------

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

        if (winner) {

            showResult(
                winner
            );
        }

        return;
    }


    // -----------------------------------------------
    // ERROR
    // -----------------------------------------------

    if (data.type === "error") {

        status.textContent =
            data.message;

    }

}


// =====================================================
// PLAYERS
// =====================================================

function updatePlayers(count) {

    count =
        Number(count || 0);

    if (count >= 1) {
        xPlayers.textContent = "1";
    } else {
        xPlayers.textContent = "0";
    }

    if (count >= 2) {
        oPlayers.textContent = "1";
    } else {
        oPlayers.textContent = "0";
    }
}


// =====================================================
// BOARD
// =====================================================

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


// =====================================================
// STATUS
// =====================================================

function updateStatus() {

    if (winner) {
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


// =====================================================
// MOVE
// =====================================================

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

                if (
                    board[index]
                ) {
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


// =====================================================
// RESULT
// =====================================================

function showResult(winnerValue) {

    result.classList.remove(
        "hidden"
    );


    if (
        winnerValue ===
        "DRAW"
    ) {

        resultIcon.textContent =
            "🤝";

        resultText.textContent =
            "Ничья!";

        return;
    }


    if (
        winnerValue ===
        myPlayer
    ) {

        resultIcon.textContent =
            "🏆";

        resultText.textContent =
            "ПОБЕДА! 🔥";

    } else {

        resultIcon.textContent =
            "😢";

        resultText.textContent =
            "Ты проиграл";
    }
}


// =====================================================
// NEW GAME
// =====================================================

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


// =====================================================
// START
// =====================================================

connect();
