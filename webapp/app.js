const tg = window.Telegram?.WebApp;

if (tg) {
    tg.ready();
    tg.expand();

    tg.setHeaderColor("#080b16");
    tg.setBackgroundColor("#080b16");
}


// ==========================================
// GAME
// ==========================================

const boardElement =
    document.getElementById("board");

const cells =
    document.querySelectorAll(".cell");

const statusElement =
    document.getElementById("status");

const restartButton =
    document.getElementById("restart");

const playAgainButton =
    document.getElementById("playAgain");

const winScreen =
    document.getElementById("winScreen");

const winTitle =
    document.getElementById("winTitle");

const winText =
    document.getElementById("winText");

const pieceCount =
    document.getElementById("pieceCount");

const scoreElement =
    document.getElementById("score");


// ==========================================
// PLAYER
// ==========================================

let playerName = "Player";

if (tg?.initDataUnsafe?.user) {

    const user =
        tg.initDataUnsafe.user;

    playerName =
        user.first_name ||
        user.username ||
        "Player";

    document.getElementById(
        "playerName"
    ).textContent = playerName;

    if (user.photo_url) {

        const avatar =
            document.getElementById("avatar");

        avatar.style.backgroundImage =
            `url("${user.photo_url}")`;

        avatar.style.backgroundSize =
            "cover";

        avatar.textContent = "";
    }
}


// ==========================================
// GAME STATE
// ==========================================

let board = Array(9).fill("");

let currentPlayer = "X";

let gameOver = false;

let moves = {
    X: [],
    O: []
};

let score = 0;


// ==========================================
// WIN COMBINATIONS
// ==========================================

const winPatterns = [

    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],

    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],

    [0, 4, 8],
    [2, 4, 6]

];


// ==========================================
// CLICK
// ==========================================

cells.forEach(cell => {

    cell.addEventListener(
        "click",
        () => {

            const index =
                Number(
                    cell.dataset.index
                );

            makeMove(index);

        }
    );

});


// ==========================================
// MOVE
// ==========================================

function makeMove(index) {

    if (gameOver) return;

    if (board[index] !== "") return;


    const player =
        currentPlayer;


    // поставить фигуру

    board[index] =
        player;

    moves[player].push(index);


    // визуально

    render();


    vibrate();


    // ======================================
    // CHECK WIN
    // ======================================

    const winningCells =
        checkWinner(player);


    if (winningCells) {

        gameOver = true;

        winningCells.forEach(
            index => {

                cells[index]
                    .classList
                    .add("winner");

            }
        );

        setTimeout(
            () => showWin(player),
            550
        );

        return;
    }


    // ======================================
    // REMOVE OLD PIECE
    // ======================================

    if (moves[player].length > 3) {

        const oldIndex =
            moves[player].shift();

        removePiece(oldIndex);

    }


    // next player

    currentPlayer =
        player === "X"
            ? "O"
            : "X";


    updateStatus();

}


// ==========================================
// REMOVE PIECE ANIMATION
// ==========================================

function removePiece(index) {

    const cell =
        cells[index];

    cell.classList.add(
        "removing"
    );


    setTimeout(() => {

        board[index] = "";

        cell.classList.remove(
            "removing"
        );

        render();

    }, 350);

}


// ==========================================
// RENDER
// ==========================================

function render() {

    cells.forEach(
        (cell, index) => {

            cell.classList.remove(
                "x",
                "o"
            );

            if (board[index] === "X") {

                cell.classList.add("x");

            }

            if (board[index] === "O") {

                cell.classList.add("o");

            }

        }
    );


    pieceCount.textContent =
        `${moves.X.length} / 3`;

}


// ==========================================
// WIN CHECK
// ==========================================

function checkWinner(player) {

    for (
        const pattern
        of winPatterns
    ) {

        const [
            a,
            b,
            c
        ] = pattern;


        if (
            board[a] === player &&
            board[b] === player &&
            board[c] === player
        ) {

            return pattern;

        }

    }

    return null;
}


// ==========================================
// STATUS
// ==========================================

function updateStatus() {

    if (currentPlayer === "X") {

        statusElement.textContent =
            "Твой ход ⚡";

    } else {

        statusElement.textContent =
            "⭕ Ход противника";

    }

}


// ==========================================
// WIN
// ==========================================

function showWin(player) {

    score++;

    scoreElement.textContent =
        score;


    winTitle.textContent =
        player === "X"
            ? "ПОБЕДА! 🎉"
            : "ПОБЕДА O! 🎉";


    winText.textContent =
        player === "X"
            ? "Три в ряд! Красиво сыграно."
            : "O собрал три в ряд!";


    winScreen.classList.remove(
        "hidden"
    );


    celebration();

}


// ==========================================
// NEW GAME
// ==========================================

function newGame() {

    board =
        Array(9).fill("");

    currentPlayer =
        "X";

    gameOver =
        false;

    moves = {
        X: [],
        O: []
    };


    cells.forEach(
        cell => {

            cell.classList.remove(
                "x",
                "o",
                "winner",
                "removing"
            );

        }
    );


    winScreen.classList.add(
        "hidden"
    );


    updateStatus();

    render();

}


restartButton.addEventListener(
    "click",
    newGame
);


playAgainButton.addEventListener(
    "click",
    newGame
);


// ==========================================
// TELEGRAM VIBRATION
// ==========================================

function vibrate() {

    if (
        tg &&
        tg.HapticFeedback
    ) {

        tg.HapticFeedback
            .impactOccurred(
                "light"
            );

    }

}


// ==========================================
// SIMPLE CONFETTI
// ==========================================

function celebration() {

    for (
        let i = 0;
        i < 30;
        i++
    ) {

        const piece =
            document.createElement(
                "div"
            );

        piece.style.position =
            "fixed";

        piece.style.width =
            "7px";

        piece.style.height =
            "7px";

        piece.style.borderRadius =
            "2px";

        piece.style.left =
            Math.random() * 100 + "%";

        piece.style.top =
            "-10px";

        piece.style.zIndex =
            "999";

        piece.style.background =
            [
                "#ff4d7d",
                "#35d6ff",
                "#6c63ff",
                "#ffd166",
                "#ffffff"
            ][
                Math.floor(
                    Math.random() * 5
                )
            ];


        document.body.appendChild(
            piece
        );


        const animation =
            piece.animate(
                [
                    {
                        transform:
                            "translateY(0) rotate(0)",
                        opacity: 1
                    },

                    {
                        transform:
                            `translateY(${window.innerHeight + 50}px)
                             rotate(${Math.random() * 720}deg)`,
                        opacity: 0
                    }
                ],
                {
                    duration:
                        1000 +
                        Math.random() * 1200,

                    easing:
                        "cubic-bezier(.2,.7,.3,1)"
                }
            );


        animation.onfinish =
            () => piece.remove();

    }

}


// ==========================================
// INIT
// ==========================================

updateStatus();

render();
