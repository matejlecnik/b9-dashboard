#!/usr/bin/env python3
"""
Telegram bot for adding Instagram creators to Supabase.
This version uses environment variables for configuration.
"""
import os
import sys
import asyncio
from typing import Dict, Any
import ssl
import certifi
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fix the timezone issue BEFORE importing telegram
# This prevents APScheduler from crashing on PythonAnywhere
os.environ['TZ'] = 'UTC'

# Monkey-patch tzlocal to return UTC to avoid timezone detection issues
import tzlocal
import pytz
tzlocal.get_localzone = lambda: pytz.UTC
tzlocal.get_localzone_name = lambda: 'UTC'

# Now safe to import telegram modules
import requests
from supabase import create_client
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from telegram.request import HTTPXRequest

# ======================
# CONFIGURATION FROM ENV
# ======================
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "instagram-looter2.p.rapidapi.com")

# Optional: set to True if you see SSL errors and just want to test quickly
INSECURE_TLS = os.getenv("INSECURE_TLS", "false").lower() == "true"

# Validate configuration
if not all([TELEGRAM_BOT_TOKEN, SUPABASE_URL, SUPABASE_KEY, RAPIDAPI_KEY]):
    raise RuntimeError("Missing required environment variables. Please check .env file.")

# Initialize Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_niches() -> list:
    try:
        # Updated table name: niche_groups -> instagram_niche_groups
        res = supabase.table("instagram_niche_groups").select("id,label").order("label").execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching niches: {e}")
        return []


def create_niche_keyboard() -> InlineKeyboardMarkup:
    rows = fetch_niches()
    btns = [[InlineKeyboardButton(text=r["label"], callback_data=f"niche:{r['id']}")] for r in rows]
    return InlineKeyboardMarkup(btns)


def fetch_instagram_profile(username: str) -> Dict[str, Any]:
    url = f"https://{RAPIDAPI_HOST}/profile"
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "accept": "application/json",
        "user-agent": "Mozilla/5.0",
    }
    r = requests.get(url, headers=headers, params={"username": username}, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data or not data.get("id"):
        raise ValueError("Profile not found or missing id")
    return data


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "👋 Welcome to the Instagram Creator Bot!\n\n"
        "Send an Instagram username (without @) to add it to the database."
    )


async def handle_username(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    username = update.message.text.strip().lstrip("@")
    if not username:
        return
    context.user_data["pending_username"] = username
    context.user_data["profile_task"] = asyncio.create_task(
        asyncio.to_thread(fetch_instagram_profile, username)
    )
    await update.message.reply_text(
        f"Username: @{username}\nSelect a niche:", reply_markup=create_niche_keyboard()
    )


async def on_niche(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    if not q:
        return
    await q.answer()
    data = q.data or ""
    if not data.startswith("niche:"):
        return
    niche_id = data.split(":", 1)[1]
    username = context.user_data.get("pending_username")
    if not username:
        await q.edit_message_text("No username pending. Send a username first.")
        return

    await q.edit_message_text(f"⏳ Adding @{username} to database...")
    try:
        task = context.user_data.get("profile_task")
        profile = await task if task else await asyncio.to_thread(fetch_instagram_profile, username)

        # Updated table name: creators -> instagram_creators
        row = {
            "ig_user_id": str(profile.get("id")),  # Ensure it's a string
            "username": profile.get("username", username),
            "full_name": profile.get("full_name"),
            "fbid": profile.get("fbid"),
            "eimu_id": profile.get("eimu_id"),
            "biography": profile.get("biography"),
            "external_url": profile.get("external_url"),
            "profile_pic_url": profile.get("profile_pic_url"),
            "profile_pic_url_hd": profile.get("profile_pic_url_hd"),
            "category_name": profile.get("category_name"),
            "is_business_account": profile.get("is_business_account"),
            "is_professional_account": profile.get("is_professional_account"),
            "is_private": profile.get("is_private"),
            "is_verified": profile.get("is_verified"),
            "followers": (profile.get("edge_followed_by") or {}).get("count"),
            "following": (profile.get("edge_follow") or {}).get("count"),
            "posts_count": (profile.get("edge_owner_to_timeline_media") or {}).get("count"),
            "highlight_reel_count": profile.get("highlight_reel_count"),
            "has_clips": profile.get("has_clips"),
            "has_guides": profile.get("has_guides"),
            "has_channel": profile.get("has_channel"),
            "has_onboarded_to_text_post_app": profile.get("has_onboarded_to_text_post_app"),
            "show_account_transparency_details": profile.get("show_account_transparency_details"),
            "show_text_post_app_badge": profile.get("show_text_post_app_badge"),
            "bio_links": profile.get("bio_links") or [],
            "raw_profile_json": profile,
            "niche_group_id": niche_id,
        }

        # Updated table name in upsert
        supabase.table("instagram_creators").upsert(row, on_conflict="username").execute()

        # Get niche name for display
        niches = fetch_niches()
        niche_name = next((n["label"] for n in niches if n["id"] == niche_id), niche_id)

        success_msg = (
            f"✅ Added @{row['username']} to {niche_name}!\n\n"
            f"📊 Stats:\n"
            f"• Followers: {row.get('followers', 'N/A'):,}\n"
            f"• Following: {row.get('following', 'N/A'):,}\n"
            f"• Posts: {row.get('posts_count', 'N/A'):,}\n\n"
            f"Send another username to add more creators!"
        )
        await q.edit_message_text(success_msg)
    except Exception as e:
        await q.edit_message_text(f"❌ Failed: {e}")
    finally:
        context.user_data.pop("pending_username", None)
        context.user_data.pop("profile_task", None)


def main():
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("Missing TELEGRAM_BOT_TOKEN")

    print("Starting Telegram bot...")
    print(f"Connected to Supabase: {SUPABASE_URL}")

    ssl_ctx = ssl.create_default_context(cafile=certifi.where())
    if INSECURE_TLS:
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        print("WARNING: INSECURE_TLS=True. SSL verification disabled.")

    request = HTTPXRequest(httpx_kwargs={"verify": ssl_ctx, "trust_env": False})

    # Build application - explicitly disable job_queue
    builder = Application.builder()
    builder.token(TELEGRAM_BOT_TOKEN)
    builder.request(request)

    # Try to disable job_queue if possible
    try:
        app = builder.job_queue(None).build()
    except:
        # If that doesn't work, just build normally
        app = builder.build()

    # Add handlers
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CallbackQueryHandler(on_niche))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_username))

    print("Bot is running! Press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()