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
    raise RuntimeError("BOT_TOKEN не найден")


bot = Bot(TOKEN)
dp = Dispatcher()

app = FastAPI(title="XO Arena")


# =========================================================
# ROOMS
# =========================================================

rooms: Dict[str, dict] = {}

matchmaking = []


# =========================================================
# CREATE ROOM
# =========================================================

def create_room():

    room_id = secrets.token_urlsafe(5).upper()

    rooms[room_id] = {
        "board": [""] * 9,
        "players": {},
        "positions": {
            "X": [],
            "O": []
        },
        "turn": "X",
        "winner": None
    }

    return room_id


# =========================================================
# WINNER
# =========================================================

def check_winner(board):

    lines = [
        (0, 1, 2),
        (3, 4, 5),
        (6, 7, 8),

        (0, 3, 6),
        (1, 4, 7),
        (2, 5, 8),

        (0, 4, 8),
        (2, 4, 6)
    ]

    for a, b, c in lines:

        if (
            board[a]
            and board[a] == board[b]
            and board[a] == board[c]
        ):
            return board[a]

    return None


# =========================================================
# SEND ROOM STATE
# =========================================================

async def send_state(room):

    players_count = len(room["players"])

    data = {
        "type": "state",
        "board": room["board"],
        "turn": room["turn"],
        "winner": room["winner"],
        "players": players_count
    }

    disconnected = []

    for symbol, ws in room["players"].items():

        try:
            await ws.send_json(data)

        except Exception:
            disconnected.append(symbol)

    for symbol in disconnected:
        room["players"].pop(symbol, None)


# =========================================================
# START
# =========================================================

@dp.message(CommandStart())
async def start(message: Message):

    args = message.text.split(maxsplit=1)

    room_id = None

    if len(args) > 1:

        value = args[1]

        if value.startswith("game_"):
            room_id = value[5:]


    builder = InlineKeyboardBuilder()

    if room_id and room_id in rooms:

        url = (
            f"{WEBAPP_URL}"
            f"?room={room_id}"
        )

        text = "🎮 ВОЙТИ В ИГРУ"

    else:

        url = WEBAPP_URL

        text = "🎮 ОТКРЫТЬ XO ARENA"


    builder.button(
        text=text,
        web_app=WebAppInfo(
            url=url
        )
    )


    await message.answer(

        "🔥 <b>XO ARENA</b>\n\n"

        "🎮 Онлайн крестики-нолики\n"
        "👥 Играй с другом\n"
        "⚡ Быстрый поиск соперника\n"
        "🌀 Максимум 3 фигуры\n\n"

        "Выбери игру 👇",

        reply_markup=builder.as_markup(),

        parse_mode="HTML"
    )


# =========================================================
# CONFIG API
# =========================================================

@app.get("/config")
async def config():

    me = await bot.get_me()

    return {
        "username": me.username
    }


# =========================================================
# CREATE ROOM API
# =========================================================

@app.get("/create-room")
async def create_room_api():

    room_id = create_room()

    return {
        "room": room_id
    }


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
    # CREATE ROOM
    # -----------------------------------------------------

    if room_id not in rooms:
        create_room()

        # create_room создал другой ID,
        # поэтому создаём конкретно нужную комнату

        rooms[room_id] = {
            "board": [""] * 9,
            "players": {},
            "positions": {
                "X": [],
                "O": []
            },
            "turn": "X",
            "winner": None
        }


    room = rooms[room_id]


    # -----------------------------------------------------
    # FIND PLAYER
    # -----------------------------------------------------

    if "X" not in room["players"]:

        player = "X"

    elif "O" not in room["players"]:

        player = "O"

    else:

        await websocket.send_json({
            "type": "error",
            "message": "Комната заполнена"
        })

        await websocket.close()

        return


    room["players"][player] = websocket


    # -----------------------------------------------------
    # CONNECTED
    # -----------------------------------------------------

    await websocket.send_json({

        "type": "connected",

        "player": player,

        "board": room["board"],

        "turn": room["turn"],

        "winner": room["winner"],

        "players": len(room["players"])

    })


    await send_state(room)


    # -----------------------------------------------------
    # GAME LOOP
    # -----------------------------------------------------

    try:

        while True:

            data = await websocket.receive_json()

            action = data.get("action")


            # =================================================
            # MOVE
            # =================================================

            if action == "move":

                index = data.get("index")


                if not isinstance(index, int):
                    continue


                if index < 0 or index > 8:
                    continue


                if room["winner"]:
                    continue


                if room["turn"] != player:
                    continue


                if room["board"][index]:
                    continue


                # ------------------------------------------------
                # PLACE SYMBOL
                # ------------------------------------------------

                room["board"][index] = player

                room["positions"][player].append(index)


                # ------------------------------------------------
                # MAX 3 FIGURES
                # ------------------------------------------------

                if len(room["positions"][player]) > 3:

                    oldest = room["positions"][player].pop(0)

                    # Не удаляем новую фигуру,
                    # если каким-то образом индекс совпал

                    if oldest != index:
                        room["board"][oldest] = ""


                # ------------------------------------------------
                # CHECK WIN
                # ------------------------------------------------

                winner = check_winner(
                    room["board"]
                )

                room["winner"] = winner


                # ------------------------------------------------
                # NEXT TURN
                # ------------------------------------------------

                if not winner:

                    if player == "X":
                        room["turn"] = "O"
                    else:
                        room["turn"] = "X"


                await send_state(room)


            # =================================================
            # RESET
            # =================================================

            elif action == "reset":

                room["board"] = [""] * 9

                room["positions"] = {
                    "X": [],
                    "O": []
                }

                room["turn"] = "X"

                room["winner"] = None

                await send_state(room)


    except WebSocketDisconnect:

        room["players"].pop(
            player,
            None
        )


# =========================================================
# STATIC WEBAPP
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
