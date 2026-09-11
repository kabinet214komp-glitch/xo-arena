import os
import asyncio
import secrets
from typing import Dict

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

import uvicorn


# =========================================================
# CONFIG
# =========================================================

TOKEN = os.getenv("BOT_TOKEN")

WEBAPP_URL = "https://xo-arena-qoyp.onrender.com"

if not TOKEN:
    raise RuntimeError("BOT_TOKEN не найден в Render Environment Variables")


# =========================================================
# TELEGRAM
# =========================================================

bot = Bot(TOKEN)
dp = Dispatcher()


# =========================================================
# GAME ROOMS
# =========================================================

rooms: Dict[str, dict] = {}


def create_room():
    room_id = secrets.token_urlsafe(5)

    rooms[room_id] = {
        "board": [""] * 9,
        "players": {},
        "turn": "X",
        "winner": None,
    }

    return room_id


def check_winner(board):

    combinations = [
        (0, 1, 2),
        (3, 4, 5),
        (6, 7, 8),
        (0, 3, 6),
        (1, 4, 7),
        (2, 5, 8),
        (0, 4, 8),
        (2, 4, 6),
    ]

    for a, b, c in combinations:

        if (
            board[a]
            and board[a] == board[b]
            and board[a] == board[c]
        ):
            return board[a]

    if all(board):
        return "DRAW"

    return None


# =========================================================
# START COMMAND
# =========================================================

@dp.message(CommandStart())
async def start(message: Message):

    builder = InlineKeyboardBuilder()

    builder.button(
        text="🎮 ОТКРЫТЬ XO ARENA",
        web_app=WebAppInfo(
            url=WEBAPP_URL
        )
    )

    await message.answer(
        "🔥 <b>XO ARENA</b>\n\n"
        "🎮 Онлайн крестики-нолики\n"
        "👥 Играй с другом\n"
        "⚡ Ходы в реальном времени\n"
        "🌀 Максимум 3 фигуры\n\n"
        "Готов к игре? 👇",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(title="XO Arena")


# =========================================================
# WEBSOCKET
# =========================================================

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str
):

    await websocket.accept()

    # -----------------------------------------------------
    # ROOM
    # -----------------------------------------------------

    if room_id not in rooms:
        rooms[room_id] = {
            "board": [""] * 9,
            "players": {},
            "turn": "X",
            "winner": None,
        }

    room = rooms[room_id]

    # -----------------------------------------------------
    # PLAYER
    # -----------------------------------------------------

    if "X" not in room["players"]:
        player = "X"

    elif "O" not in room["players"]:
        player = "O"

    else:
        await websocket.send_json({
            "type": "error",
            "message": "Комната уже заполнена"
        })

        await websocket.close()

        return

    room["players"][player] = websocket

    # -----------------------------------------------------
    # SEND PLAYER INFO
    # -----------------------------------------------------

    await websocket.send_json({
        "type": "connected",
        "player": player,
        "board": room["board"],
        "turn": room["turn"],
        "winner": room["winner"],
        "players": len(room["players"])
    })

    # -----------------------------------------------------
    # BROADCAST
    # -----------------------------------------------------

    async def broadcast(data):

        disconnected = []

        for symbol, ws in room["players"].items():

            try:
                await ws.send_json(data)

            except Exception:
                disconnected.append(symbol)

        for symbol in disconnected:
            room["players"].pop(symbol, None)

    # -----------------------------------------------------
    # GAME LOOP
    # -----------------------------------------------------

    try:

        while True:

            data = await websocket.receive_json()

            action = data.get("action")

            # =============================================
            # MOVE
            # =============================================

            if action == "move":

                index = data.get("index")

                # Проверка номера клетки
                if not isinstance(index, int):
                    continue

                if index < 0 or index > 8:
                    continue

                # Не ходить после победы
                if room["winner"]:
                    continue

                # Ход только своего игрока
                if room["turn"] != player:
                    continue

                # Клетка занята
                if room["board"][index]:
                    continue

                # Ставим символ
                room["board"][index] = player

                # Проверяем победу
                winner = check_winner(
                    room["board"]
                )

                room["winner"] = winner

                # Передаём всем
                await broadcast({
                    "type": "state",
                    "board": room["board"],
                    "turn": (
                        None
                        if winner
                        else (
                            "O"
                            if player == "X"
                            else "X"
                        )
                    ),
                    "winner": winner,
                    "players": len(room["players"])
                })

                # Меняем ход
                if not winner:

                    room["turn"] = (
                        "O"
                        if player == "X"
                        else "X"
                    )

            # =============================================
            # RESET
            # =============================================

            elif action == "reset":

                room["board"] = [""] * 9
                room["turn"] = "X"
                room["winner"] = None

                await broadcast({
                    "type": "state",
                    "board": room["board"],
                    "turn": "X",
                    "winner": None,
                    "players": len(room["players"])
                })

    except WebSocketDisconnect:

        room["players"].pop(
            player,
            None
        )


# =========================================================
# WEB APP
# =========================================================

app.mount(
    "/",
    StaticFiles(
        directory="webapp",
        html=True
    ),
    name="webapp"
)


# =========================================================
# BOT
# =========================================================

async def run_bot():

    print("🤖 Telegram Bot запущен")

    await dp.start_polling(bot)


# =========================================================
# WEB SERVER
# =========================================================

async def run_web():

    port = int(
        os.environ.get(
            "PORT",
            "8000"
        )
    )

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

    server = uvicorn.Server(config)

    print(
        f"🌐 Web server запущен на порту {port}"
    )

    await server.serve()


# =========================================================
# MAIN
# =========================================================

async def main():

    await asyncio.gather(
        run_bot(),
        run_web()
    )


if __name__ == "__main__":

    asyncio.run(main())
