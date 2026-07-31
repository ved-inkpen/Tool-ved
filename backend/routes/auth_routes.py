from fastapi import APIRouter, HTTPException, Depends
from auth import get_current_user, create_token, verify_password, hash_password
from database import users_col
from models import LoginIn, UserPublic
from utils import clean_doc

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
