from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, create_token, verify_password, hash_password
from database import users_col
from models import LoginIn, UserPublic
from utils import clean_doc, now_iso

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login')
async def login(payload: LoginIn):
    user = await users_col.find_one({'email': payload.email.lower()})
    if not user or not user.get('active', True):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    token = create_token(user['id'], user['role'])
    return {
        'token': token,
        'user': clean_doc({k: v for k, v in user.items() if k != 'password_hash'}),
    }


@router.get('/me')
async def me(user: dict = Depends(get_current_user)):
    return clean_doc(user)


@router.post('/change-password')
async def change_password(body: dict, user: dict = Depends(get_current_user)):
    old_pw = body.get('old_password')
    new_pw = body.get('new_password')
    if not old_pw or not new_pw or len(new_pw) < 6:
        raise HTTPException(status_code=400, detail='Invalid input')
    stored = await users_col.find_one({'id': user['id']})
    if not stored or not verify_password(old_pw, stored['password_hash']):
        raise HTTPException(status_code=401, detail='Old password is incorrect')
    await users_col.update_one({'id': user['id']}, {'$set': {'password_hash': hash_password(new_pw)}})
    return {'ok': True}


# ---------- Slack integration (per user) ----------
import slack as slack_mod
from models import SlackConnect

slack_router = APIRouter(prefix='/api/me/slack', tags=['slack'])


def _state(u: dict) -> dict:
    url = u.get('slack_webhook_url')
    return {
        'connected': slack_mod.is_valid_webhook(url),
        'webhook_masked': slack_mod.mask(url),
        'last_delivery_at': u.get('slack_last_delivery_at'),
        'last_error': u.get('slack_last_error'),
        'last_error_at': u.get('slack_last_error_at'),
    }


@slack_router.get('')
async def get_slack(user: dict = Depends(get_current_user)):
    fresh = await users_col.find_one({'id': user['id']}, {'_id': 0, 'password_hash': 0})
    return _state(fresh or {})


@slack_router.put('')
async def connect_slack(payload: SlackConnect, user: dict = Depends(get_current_user)):
    url = (payload.webhook_url or '').strip()
    if not slack_mod.is_valid_webhook(url):
        raise HTTPException(status_code=400, detail='That is not a Slack incoming webhook URL — it should start with https://hooks.slack.com/')
    await users_col.update_one({'id': user['id']}, {'$set': {
        'slack_webhook_url': url, 'slack_last_error': None, 'slack_last_error_at': None}})
    fresh = await users_col.find_one({'id': user['id']}, {'_id': 0, 'password_hash': 0})
    return _state(fresh)


@slack_router.delete('')
async def disconnect_slack(user: dict = Depends(get_current_user)):
    await users_col.update_one({'id': user['id']}, {'$unset': {
        'slack_webhook_url': '', 'slack_last_delivery_at': '', 'slack_last_error': '', 'slack_last_error_at': ''}})
    return {'ok': True}


@slack_router.post('/test')
async def test_slack(user: dict = Depends(get_current_user)):
    """Send a real message so the user can confirm it lands before relying on it."""
    fresh = await users_col.find_one({'id': user['id']}, {'_id': 0})
    url = (fresh or {}).get('slack_webhook_url')
    if not slack_mod.is_valid_webhook(url):
        raise HTTPException(status_code=400, detail='Connect a Slack webhook first')
    ok, detail = await slack_mod.send(url, slack_mod.build_payload(
        'Marco is connected',
        f"Hi {user.get('name')} — notifications for your account will arrive here.",
        '/',
    ))
    now = now_iso()
    if ok:
        await users_col.update_one({'id': user['id']}, {'$set': {'slack_last_delivery_at': now, 'slack_last_error': None}})
        return {'ok': True}
    await users_col.update_one({'id': user['id']}, {'$set': {'slack_last_error': detail, 'slack_last_error_at': now}})
    raise HTTPException(status_code=502, detail=detail)
