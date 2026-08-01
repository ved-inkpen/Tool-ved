from fastapi import APIRouter, Depends, HTTPException
from database import notifications_col
from auth import get_current_user
from utils import now_iso

router = APIRouter(prefix='/api/notifications', tags=['notifications'])


@router.get('')
async def list_notifications(kind: str = None, unread_only: bool = False, user: dict = Depends(get_current_user)):
    """Notifications for the caller. `kind` narrows to one type, e.g. the
    comment questions the admin dashboard lists."""
    query = {'user_id': user['id']}
    if kind:
        query['kind'] = kind
    if unread_only:
        query['read'] = False
    docs = await notifications_col.find(query, {'_id': 0}).sort('created_at', -1).limit(200).to_list(200)
    unread = await notifications_col.count_documents({**query, 'read': False})
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
