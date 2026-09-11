```python
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

@dp.message(CommandSt
```
