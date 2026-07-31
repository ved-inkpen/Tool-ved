from fastapi import APIRouter, Depends, HTTPException
from database import notifications_col
from auth import get_current_user
from utils import now_iso

router = APIRouter(prefix='/api/notifications', tags=['notifications'])


@router.get('')
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await notifications_col.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).limit(100).to_list(100)
    unread = await notifications_col.count_documents({'user_id': user['id'], 'read': False})
    return {'notifications': docs, 'unread': unread}


@router.post('/{notification_id}/read')
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    res = await notifications_col.update_one({'id': notification_id, 'user_id': user['id']}, {'$set': {'read': True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Notification not found')
    return {'ok': True}


@router.post('/read-all')
async def mark_all_read(user: dict = Depends(get_current_user)):
    await notifications_col.update_many({'user_id': user['id'], 'read': False}, {'$set': {'read': True}})
    return {'ok': True}
