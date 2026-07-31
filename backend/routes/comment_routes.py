from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import ads_col, ad_sets_col, users_col, comments_col
from auth import get_current_user
from utils import new_id, now_iso, clean_doc
from notifications import notify

router = APIRouter(prefix='/api/ads', tags=['comments'])


async def _can_access_ad(ad: dict, user: dict) -> bool:
    role = user.get('role')
    if role == 'admin':
        return True
    if role == 'creator':
        return ad.get('created_by') == user.get('id')
    if role == 'script_reviewer':
        return True  # can see all script-review-relevant ads
    if role == 'agency_admin':
        return ad.get('assigned_agency_id') and ad.get('assigned_agency_id') == user.get('agency_id')
    if role == 'video_editor':
        return ad.get('assigned_editor_id') == user.get('id')
    if role == 'final_reviewer':
        return True
    return False


async def _notify_participants(ad: dict, actor: dict, comment_text: str):
    """Notify creator, editor, and agency admin of new comment (except actor themselves)."""
    receivers = set()
    if ad.get('created_by') and ad['created_by'] != actor['id']:
        receivers.add(ad['created_by'])
    if ad.get('assigned_editor_id') and ad['assigned_editor_id'] != actor['id']:
        receivers.add(ad['assigned_editor_id'])
    # Notify agency admin of that agency (if agency assigned)
    if ad.get('assigned_agency_id'):
        async for admin in users_col.find({'agency_id': ad['assigned_agency_id'], 'role': 'agency_admin', 'active': True}, {'_id': 0, 'id': 1}):
            if admin['id'] != actor['id']:
                receivers.add(admin['id'])
    preview = comment_text[:80] + ('…' if len(comment_text) > 80 else '')
    for uid in receivers:
        await notify(uid, f"New comment on '{ad.get('name')}'", f"{actor.get('name')}: {preview}", f"/ad-sets/{ad['ad_set_id']}")


@router.get('/{ad_id}/comments')
async def list_comments(ad_id: str, user: dict = Depends(get_current_user)):
    ad = await ads_col.find_one({'id': ad_id}, {'_id': 0})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    if not await _can_access_ad(ad, user):
        raise HTTPException(status_code=403, detail='Forbidden')
    docs = await comments_col.find({'ad_id': ad_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return docs


@router.post('/{ad_id}/comments')
async def create_comment(ad_id: str, payload: dict, user: dict = Depends(get_current_user)):
    text = (payload or {}).get('text', '').strip()
    parent_id = (payload or {}).get('parent_id')
    if not text:
        raise HTTPException(status_code=400, detail='Comment text is required')
    if len(text) > 4000:
        raise HTTPException(status_code=400, detail='Comment too long (max 4000 chars)')
    ad = await ads_col.find_one({'id': ad_id}, {'_id': 0})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    if not await _can_access_ad(ad, user):
        raise HTTPException(status_code=403, detail='Forbidden')
    if parent_id:
        parent = await comments_col.find_one({'id': parent_id, 'ad_id': ad_id})
        if not parent:
            raise HTTPException(status_code=400, detail='Parent comment not found')
    doc = {
        'id': new_id(),
        'ad_id': ad_id,
        'ad_set_id': ad.get('ad_set_id'),
        'author_id': user['id'],
        'author_name': user.get('name'),
        'author_role': user.get('role'),
        'text': text,
        'parent_id': parent_id,
        'created_at': now_iso(),
    }
    await comments_col.insert_one(doc)
    # notify participants
    try:
        await _notify_participants(ad, user, text)
    except Exception:
        pass
    return clean_doc(doc)


@router.delete('/{ad_id}/comments/{comment_id}')
async def delete_comment(ad_id: str, comment_id: str, user: dict = Depends(get_current_user)):
    c = await comments_col.find_one({'id': comment_id, 'ad_id': ad_id})
    if not c:
        raise HTTPException(status_code=404, detail='Comment not found')
    if user['role'] != 'admin' and c['author_id'] != user['id']:
        raise HTTPException(status_code=403, detail='Only the author or admin can delete')
    await comments_col.delete_one({'id': comment_id})
    return {'ok': True}
