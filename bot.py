import os
import asyncio

from dotenv import load_dotenv

from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart
from aiogram.types import Message, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

import uvicorn


# ==========================================
# CONFIG
# ==========================================

load_dotenv()

TOKEN = os.getenv("BOT_TOKEN")

if not TOKEN:
    raise RuntimeError("BOT_TOKEN не найден в .env")


# ==========================================
# TELEGRAM BOT
# ==========================================

bot = Bot(TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message):

    builder = InlineKeyboardBuilder()

    builder.button(
        text="🎮 ОТКРЫТЬ XO ARENA",
        web_app=WebAppInfo(
            url=os.getenv(
                "WEBAPP_URL",
                "https://YOUR-RENDER-URL.onrender.com"
            )
        )
    )

    await message.answer(
        "🔥 <b>XO ARENA</b>\n\n"
        "Добро пожаловать в арену!\n\n"
        "❌ 3×3 поле\n"
        "⭕ Красивые анимации\n"
        "⚡ Быстрые ходы\n"
        "🌀 Максимум 3 фигуры\n"
        "🏆 Три в ряд = победа\n\n"
        "Готов? 👇",
        reply_markup=builder.as_markup(),
        parse_mode="HTML"
    )


# ==========================================
# FASTAPI
# ==========================================

app = FastAPI(title="XO Arena")

app.mount(
    "/",
    StaticFiles(
        directory="webapp",
        html=True
    ),
    name="webapp"
)


# ==========================================
# BOT
# ==========================================

async def run_bot():

    print("🤖 Telegram Bot запущен")

    await dp.start_polling(bot)


# ==========================================
# WEB SERVER
# ==========================================

async def run_web():

    port = int(
        os.environ.get(
            "PORT",
            8000
        )
    )

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )

    server = uvicorn.Server(config)

    await server.serve()


# ==========================================
# MAIN
# ==========================================

async def main():

    await asyncio.gather(
        run_bot(),
        run_web()
    )


if __name__ == "__main__":
    asyncio.run(main())