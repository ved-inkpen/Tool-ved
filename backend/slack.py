"""Per-user Slack delivery via incoming webhooks.

Slack is a mirror of the in-app notification, never a replacement: every failure
here is swallowed so a dead webhook can never break the workflow that triggered
it. The last outcome is recorded on the user so the UI can show it.
"""
import asyncio
import logging
import os

import requests

from database import users_col
from utils import now_iso

logger = logging.getLogger('marketing_studio.slack')

# Overridable so tests can point at a local receiver, and so Slack-compatible
# endpoints (Mattermost and friends) can be used instead.
WEBHOOK_PREFIX = os.environ.get('SLACK_WEBHOOK_PREFIX', 'https://hooks.slack.com/')
TIMEOUT = 6


def app_base_url() -> str:
    """Absolute base for links, since Slack cannot follow a relative path."""
    return os.environ.get('APP_BASE_URL', 'http://localhost:3000').rstrip('/')


def is_valid_webhook(url: str) -> bool:
    return bool(url) and url.strip().startswith(WEBHOOK_PREFIX)


def mask(url: str) -> str:
    """Show enough to recognise the hook without exposing a usable secret."""
    if not url:
        return ''
    tail = url.rstrip('/').split('/')[-1]
    return f"{WEBHOOK_PREFIX}…/{tail[:4]}••••" if tail else f'{WEBHOOK_PREFIX}…'


def build_payload(title: str, message: str, link: str = None) -> dict:
    text = f"*{title}*\n{message}"
    if link:
        url = link if link.startswith('http') else f"{app_base_url()}{link}"
        text += f"\n<{url}|Open in Marco>"
    return {'text': text}


def _post(url: str, payload: dict):
    return requests.post(url, json=payload, timeout=TIMEOUT)


async def send(url: str, payload: dict):
    """POST to Slack off the event loop. Returns (ok, detail)."""
    try:
        # requests is sync; keep it off the loop so a slow hook cannot stall us
        resp = await asyncio.to_thread(_post, url, payload)
    except Exception as e:
        return False, f'{type(e).__name__}: {e}'
    if resp.status_code == 200:
        return True, 'ok'
    return False, f'Slack returned {resp.status_code}: {resp.text[:200]}'


async def deliver(user_id: str, title: str, message: str, link: str = None):
    """Mirror a notification to the user's Slack, if they have one connected."""
    user = await users_col.find_one({'id': user_id}, {'_id': 0, 'slack_webhook_url': 1})
    url = (user or {}).get('slack_webhook_url')
    if not is_valid_webhook(url):
        return
    ok, detail = await send(url, build_payload(title, message, link))
    if ok:
        await users_col.update_one({'id': user_id}, {'$set': {
            'slack_last_delivery_at': now_iso(), 'slack_last_error': None}})
    else:
        logger.warning('Slack delivery failed for %s: %s', user_id, detail)
        await users_col.update_one({'id': user_id}, {'$set': {
            'slack_last_error': detail, 'slack_last_error_at': now_iso()}})
