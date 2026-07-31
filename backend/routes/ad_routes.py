from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from database import ads_col, ad_sets_col, users_col, reviews_col, versions_col, agencies_col
from auth import get_current_user, require_roles
from models import AdInput, FileRef
from utils import clean_doc, new_id, now_iso, gen_code, state_entry, normalize_ad
from notifications import notify, notify_role

router = APIRouter(prefix='/api/ads', tags=['ads'])


async def _get_ad_or_404(ad_id: str):
    ad = await ads_col.find_one({'id': ad_id}, {'_id': 0})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    return ad


async def _get_ad_set_or_404(ad_set_id: str):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id}, {'_id': 0})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    return ad_set


@router.get('/{ad_id}')
async def get_ad(ad_id: str, user: dict = Depends(get_current_user)):
    ad = await _get_ad_or_404(ad_id)
    role = user['role']
    # Access checks
    if role == 'creator' and ad['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if role == 'agency_admin' and ad.get('assigned_agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail='Forbidden')
    if role == 'video_editor' and ad.get('assigned_editor_id') != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')

    # attach reviews & versions & names
    reviews = await reviews_col.find({'ad_id': ad_id}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    versions = await versions_col.find({'ad_id': ad_id}, {'_id': 0}).sort('version_number', -1).to_list(1000)
    editor = None
    if ad.get('assigned_editor_id'):
        editor = await users_col.find_one({'id': ad['assigned_editor_id']}, {'_id': 0, 'password_hash': 0})
    agency = None
    if ad.get('assigned_agency_id'):
        agency = await agencies_col.find_one({'id': ad['assigned_agency_id']}, {'_id': 0})
    # the parent set, so every role can see which campaign an ad belongs to
    ad_set = await ad_sets_col.find_one({'id': ad['ad_set_id']}, {'_id': 0})
    return {
        'ad': normalize_ad(ad),
        'ad_set': ad_set,
        'reviews': reviews,
        'versions': versions,
        'assigned_editor': editor,
        'assigned_agency': agency,
    }


@router.patch('/{ad_id}')
async def update_ad(ad_id: str, payload: dict, user: dict = Depends(get_current_user)):
    """Only creators can edit ads in draft or script_rejected state."""
    ad = await _get_ad_or_404(ad_id)
    if user['role'] != 'admin' and ad['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if ad['status'] not in ('draft', 'script_rejected'):
        raise HTTPException(status_code=400, detail=f"Cannot edit ad in status '{ad['status']}'")

    allowed_fields = {
        'name', 'script', 'visual_guidelines', 'reference_links',
        'reference_media', 'media_file', 'headline', 'primary_text',
        'headlines', 'primary_texts',
    }
    update = {'updated_at': now_iso()}
    for k, v in payload.items():
        if k in allowed_fields:
            update[k] = v
    # Keep singular fields in sync when arrays are edited
    if 'headlines' in update and isinstance(update['headlines'], list):
        update['headlines'] = [h for h in update['headlines'] if h and str(h).strip()][:5]
        update['headline'] = update['headlines'][0] if update['headlines'] else ''
    if 'primary_texts' in update and isinstance(update['primary_texts'], list):
        update['primary_texts'] = [t for t in update['primary_texts'] if t and str(t).strip()][:5]
        update['primary_text'] = update['primary_texts'][0] if update['primary_texts'] else ''

    # if it was script_rejected and edited, reset to draft so creator can resubmit
    if ad['status'] == 'script_rejected':
        update['status'] = 'draft'
        update['latest_review_comment'] = None

    await ads_col.update_one({'id': ad_id}, {'$set': update})

    # If any ad in the set gets edited back to draft, also reset ad set status
    ad_set = await ad_sets_col.find_one({'id': ad['ad_set_id']})
    if ad_set and ad_set['status'] in ('pending_script_review',):
        # if all ads are now draft, mark set as draft
        remaining = await ads_col.count_documents({'ad_set_id': ad['ad_set_id'], 'status': {'$ne': 'draft'}})
        if remaining == 0:
            await ad_sets_col.update_one({'id': ad['ad_set_id']}, {'$set': {'status': 'draft', 'updated_at': now_iso()}})

    return await ads_col.find_one({'id': ad_id}, {'_id': 0})


@router.post('/{ad_id}/resubmit')
async def resubmit_ad(ad_id: str, user: dict = Depends(get_current_user)):
    """Creator resubmits an ad that was script_rejected."""
    ad = await _get_ad_or_404(ad_id)
    if user['role'] != 'admin' and ad['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if ad['status'] not in ('draft', 'script_rejected'):
        raise HTTPException(status_code=400, detail="Only draft or script_rejected ads can be resubmitted")
    ad_set = await _get_ad_set_or_404(ad['ad_set_id'])
    new_status = 'pending_script_review' if ad_set['type'] == 'script' else 'pending_final_review'
    await ads_col.update_one({'id': ad_id}, {'$set': {'status': new_status, 'updated_at': now_iso(), 'latest_review_comment': None}, '$push': {'state_history': state_entry(new_status, user, {'reason': 'resubmit'})}})
    if ad_set['status'] == 'draft':
        await ad_sets_col.update_one({'id': ad_set['id']}, {'$set': {'status': 'pending_script_review' if ad_set['type'] == 'script' else 'in_progress', 'updated_at': now_iso()}})
    # Notify appropriate reviewer
    if new_status == 'pending_script_review':
        await notify_role('script_reviewer', 'Script resubmitted', f"Ad '{ad['name']}' has been resubmitted for review", f"/script-review")
    else:
        await notify_role('final_reviewer', 'Media submitted', f"Ad '{ad['name']}' submitted for final review", f"/final-review")
    return {'ok': True}
