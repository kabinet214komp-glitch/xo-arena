import os
import asyncio

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import uvicorn


# =========================================================
# CONFIG
# =========================================================

TOKEN = os.getenv("BOT_TOKEN")

WEBAPP_URL = "https://xo-arena-qoyp.onrender.com"


if not TOKEN:
    raise RuntimeError(
        "BOT_TOKEN не найден! "
        "Добавь BOT_TOKEN в Environment Variables Render."
    )


# =========================================================
# TELEGRAM BOT
# =========================================================

bot = Bot(TOKEN)

dp = Dispatcher()


# =========================================================
# /START
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

        "Добро пожаловать в арену! ⚡\n\n"

        "🎮 <b>3×3 поле</b>\n"
        "❌ X против ⭕ O\n"
        "🌀 Максимум 3 фигуры\n"
        "✨ Красивые анимации\n"
        "🏆 Три в ряд = победа\n\n"

        "Готов к игре? 👇",

        reply_markup=builder.as_markup(),

        parse_mode="HTML"
    )


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="XO Arena"
)


# =========================================================
# WEBAPP
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
# TELEGRAM BOT
# =========================================================

async def run_bot():

    print("🤖 Telegram Bot запускается...")

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

    print("")
    print("================================")
    print("       🎮 XO ARENA")
    print("================================")
    print("🤖 Telegram Bot")
    print("🌐 Mini App")
    print("🚀 Сервер запускается...")
    print("")

    await asyncio.gather(
        run_bot(),
        run_web()
    )


# =========================================================
# START
# =========================================================

if __name__ == "__main__":

    asyncio.run(main())
