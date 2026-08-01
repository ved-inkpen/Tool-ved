from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from database import ads_col, ad_sets_col, users_col, reviews_col, versions_col, agencies_col
from auth import get_current_user, require_roles
from models import (
    ScriptReviewDecision, BulkScriptReviewDecision, AgencyAssignInput,
    EditorUploadInput, EditorSubmitInput, FinalReviewDecision, FileRef
)
from utils import clean_doc, new_id, now_iso, state_entry, normalize_ad
from notifications import notify, notify_role
from routes.ad_set_routes import assign_agency_to_set

router = APIRouter(prefix='/api/workflow', tags=['workflow'])


async def _recompute_ad_set_status(ad_set_id: str):
    """Recompute ad set status based on its ads.
    - completed: all ads approved
    - draft: all ads draft
    - in_progress: mix or in production
    - pending_script_review: any ads pending script review, none in later stages
    """
    statuses = await ads_col.distinct('status', {'ad_set_id': ad_set_id})
    if not statuses:
        return
    if all(s == 'approved' for s in statuses):
        new_status = 'completed'
    elif all(s == 'draft' for s in statuses):
        new_status = 'draft'
    elif any(s in ('pending_script_review', 'script_rejected') for s in statuses) and not any(
        s in ('assigned_agency', 'assigned_editor', 'pending_final_review', 'final_rejected', 'approved') for s in statuses
    ):
        new_status = 'pending_script_review'
    else:
        new_status = 'in_progress'
    await ad_sets_col.update_one({'id': ad_set_id}, {'$set': {'status': new_status, 'updated_at': now_iso()}})


# ---------- Script Review (WF2) ----------
@router.post('/script-review/ads/{ad_id}')
async def script_review_ad(ad_id: str, decision: ScriptReviewDecision, user: dict = Depends(require_roles('script_reviewer', 'admin'))):
    ad = await ads_col.find_one({'id': ad_id}, {'_id': 0})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    if ad['status'] != 'pending_script_review':
        raise HTTPException(status_code=400, detail=f"Ad not in pending_script_review status (current: {ad['status']})")
    if ad['type'] != 'script':
        raise HTTPException(status_code=400, detail='Not a script-type ad')

    now = now_iso()
    if decision.action == 'approve':
        ad_set = await ad_sets_col.find_one({'id': ad['ad_set_id']})
        if not ad_set:
            raise HTTPException(status_code=404, detail='Ad set not found')
        # Agency is a property of the ad set. A decision may carry one to set it
        # (or change it) for the whole set, otherwise the set's agency is used.
        if decision.agency_id and decision.agency_id != ad_set.get('assigned_agency_id'):
            await assign_agency_to_set(ad_set, decision.agency_id, user)
            ad_set['assigned_agency_id'] = decision.agency_id
        agency_id = ad_set.get('assigned_agency_id')
        if not agency_id:
            raise HTTPException(status_code=400, detail='Assign this ad set to an agency before approving')
        await ads_col.update_one({'id': ad_id}, {'$set': {
            'status': 'assigned_agency',
            'assigned_agency_id': agency_id,
            'latest_review_comment': decision.comments or None,
            'updated_at': now,
        }, '$push': {'state_history': state_entry('assigned_agency', user, {'agency_id': agency_id})}})
        # Notify agency admins
        await notify_role('agency_admin', 'New ad assigned to your agency', f"Ad '{ad['name']}' from Ad Set {ad['ad_set_code']} is ready to produce", f"/agency", agency_id=agency_id)
        review_action = 'approve'
    else:
        await ads_col.update_one({'id': ad_id}, {'$set': {
            'status': 'script_rejected',
            'latest_review_comment': decision.comments or 'Rejected',
            'updated_at': now,
        }, '$push': {'state_history': state_entry('script_rejected', user)}})
        # Notify creator
        await notify(ad['created_by'], 'Script needs revision', f"Your script for '{ad['name']}' was rejected. Please review comments.", f"/creator")
        review_action = 'reject'

    await reviews_col.insert_one({
        'id': new_id(),
        'ad_id': ad_id,
        'stage': 'script',
        'action': review_action,
        'reviewer_id': user['id'],
        'reviewer_name': user.get('name'),
        'comments': decision.comments or '',
        'created_at': now,
    })
    await _recompute_ad_set_status(ad['ad_set_id'])
    return {'ok': True}


@router.post('/script-review/bulk')
async def script_review_bulk(payload: BulkScriptReviewDecision, user: dict = Depends(require_roles('script_reviewer', 'admin'))):
    results = []
    for ad_id in payload.ad_ids:
        try:
            await script_review_ad(ad_id, ScriptReviewDecision(action=payload.action, comments=payload.comments, agency_id=payload.agency_id), user)
            results.append({'ad_id': ad_id, 'ok': True})
        except HTTPException as e:
            results.append({'ad_id': ad_id, 'ok': False, 'error': e.detail})
    return {'results': results}


# ---------- Agency Assignment (WF3) ----------
@router.post('/agency/assign')
async def agency_assign(payload: AgencyAssignInput, user: dict = Depends(require_roles('agency_admin', 'admin'))):
    if not payload.ad_ids:
        raise HTTPException(status_code=400, detail='No ads specified')
    editor = await users_col.find_one({'id': payload.editor_id}, {'_id': 0, 'password_hash': 0})
    if not editor or editor.get('role') != 'video_editor':
        raise HTTPException(status_code=404, detail='Editor not found or invalid role')
    if user['role'] == 'agency_admin' and editor.get('agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail='Editor is not in your agency')

    now = now_iso()
    assigned = []
    for ad_id in payload.ad_ids:
        ad = await ads_col.find_one({'id': ad_id})
        if not ad:
            continue
        # agency scoping
        if user['role'] == 'agency_admin' and ad.get('assigned_agency_id') != user.get('agency_id'):
            continue
        if ad['status'] not in ('assigned_agency', 'assigned_editor'):
            continue  # skip ads not ready for assignment
        await ads_col.update_one({'id': ad_id}, {'$set': {
            'status': 'assigned_editor',
            'assigned_editor_id': payload.editor_id,
            'updated_at': now,
        }, '$push': {'state_history': state_entry('assigned_editor', user, {'editor_id': payload.editor_id})}})
        assigned.append(ad_id)

    # Notify editor
    if assigned:
        await notify(payload.editor_id, 'New ads assigned to you', f"You have been assigned {len(assigned)} ad(s) to produce", f"/editor")

    return {'assigned_count': len(assigned), 'assigned_ad_ids': assigned}


# ---------- Editor Upload & Submit (WF4) ----------
async def _editor_ad_or_error(ad_id: str, user: dict):
    """Fetch an ad the given editor is allowed to work on, in an uploadable state."""
    ad = await ads_col.find_one({'id': ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    if user['role'] != 'admin' and ad.get('assigned_editor_id') != user['id']:
        raise HTTPException(status_code=403, detail='Not your ad')
    if ad['status'] not in ('assigned_editor', 'final_rejected'):
        raise HTTPException(status_code=400, detail=f"Cannot upload for ad in status '{ad['status']}'")
    return ad


@router.post('/editor/ads/{ad_id}/upload')
async def editor_upload(ad_id: str, payload: EditorUploadInput, user: dict = Depends(require_roles('video_editor', 'admin'))):
    """Attach media to the ad WITHOUT sending it to final review.

    The editor stages the file here and submits it separately, so an upload is
    never an accidental submission. Re-uploading replaces the staged file.
    """
    ad = await _editor_ad_or_error(ad_id, user)
    now = now_iso()
    await ads_col.update_one({'id': ad_id}, {'$set': {
        'draft_media_file': payload.media_file.model_dump(),
        'draft_media_uploaded_at': now,
        'updated_at': now,
    }})
    return {'ok': True, 'draft_media_file': payload.media_file.model_dump()}


@router.delete('/editor/ads/{ad_id}/upload')
async def editor_discard_upload(ad_id: str, user: dict = Depends(require_roles('video_editor', 'admin'))):
    """Discard staged media that hasn't been submitted yet."""
    ad = await _editor_ad_or_error(ad_id, user)
    if not ad.get('draft_media_file'):
        raise HTTPException(status_code=400, detail='Nothing to discard')
    await ads_col.update_one({'id': ad_id}, {'$unset': {'draft_media_file': '', 'draft_media_uploaded_at': ''}, '$set': {'updated_at': now_iso()}})
    return {'ok': True}


@router.post('/editor/ads/{ad_id}/submit')
async def editor_submit(ad_id: str, payload: EditorSubmitInput = EditorSubmitInput(), user: dict = Depends(require_roles('video_editor', 'admin'))):
    """Send the editor's uploaded media to final review.

    Uses the staged upload, or a media_file passed inline for callers that want
    to upload and submit in one step.
    """
    ad = await _editor_ad_or_error(ad_id, user)
    media_file = payload.media_file.model_dump() if payload and payload.media_file else ad.get('draft_media_file')
    if not media_file:
        raise HTTPException(status_code=400, detail='Upload media before submitting for final review')

    now = now_iso()
    new_version = int(ad.get('current_version') or 0) + 1
    version_doc = {
        'id': new_id(),
        'ad_id': ad_id,
        'version_number': new_version,
        'media_file': media_file,
        'uploaded_by': user['id'],
        'uploaded_by_name': user.get('name'),
        'created_at': now,
    }
    await versions_col.insert_one(version_doc)
    await ads_col.update_one({'id': ad_id}, {
        '$set': {
            'media_file': media_file,
            'current_version': new_version,
            'status': 'pending_final_review',
            'latest_review_comment': None,
            'updated_at': now,
        },
        '$unset': {'draft_media_file': '', 'draft_media_uploaded_at': ''},
        '$push': {'state_history': state_entry('pending_final_review', user, {'version': new_version})},
    })
    # Notify final reviewers
    await notify_role('final_reviewer', 'New media for final review', f"Ad '{ad['name']}' submitted for final review", f"/final-review")
    await _recompute_ad_set_status(ad['ad_set_id'])
    return {'ok': True, 'version': new_version}


# ---------- Final Review (WF5) ----------
@router.post('/final-review/ads/{ad_id}')
async def final_review(ad_id: str, decision: FinalReviewDecision, user: dict = Depends(require_roles('final_reviewer', 'admin'))):
    ad = await ads_col.find_one({'id': ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail='Ad not found')
    if ad['status'] != 'pending_final_review':
        raise HTTPException(status_code=400, detail=f"Ad not pending final review (current: {ad['status']})")
    now = now_iso()
    if decision.action == 'approve':
        approved_fields = {'status': 'approved', 'latest_review_comment': decision.comments or None, 'updated_at': now}
        # the ad poster needs these alongside the final asset
        if decision.custom_listing_link is not None:
            approved_fields['custom_listing_link'] = decision.custom_listing_link.strip()
        if decision.deeplink is not None:
            approved_fields['deeplink'] = decision.deeplink.strip()
        await ads_col.update_one({'id': ad_id}, {'$set': approved_fields, '$push': {'state_history': state_entry('approved', user)}})
        await notify(ad['created_by'], 'Ad approved', f"Your ad '{ad['name']}' has been approved and is ready for download", f"/downloads")
        if ad.get('assigned_editor_id'):
            await notify(ad['assigned_editor_id'], 'Ad approved', f"Your work on '{ad['name']}' has been approved", f"/editor")
    else:
        # If it's a media_ready ad, rejection returns to creator; else to editor
        if ad['type'] == 'media_ready':
            await ads_col.update_one({'id': ad_id}, {'$set': {'status': 'script_rejected', 'latest_review_comment': decision.comments or 'Rejected', 'updated_at': now}, '$push': {'state_history': state_entry('script_rejected', user)}})
            await notify(ad['created_by'], 'Ad needs revision', f"Your ad '{ad['name']}' was rejected. Please review comments.", f"/creator")
        else:
            await ads_col.update_one({'id': ad_id}, {'$set': {'status': 'final_rejected', 'latest_review_comment': decision.comments or 'Rejected', 'updated_at': now}, '$push': {'state_history': state_entry('final_rejected', user)}})
            if ad.get('assigned_editor_id'):
                await notify(ad['assigned_editor_id'], 'Ad rejected - revision needed', f"Ad '{ad['name']}' needs a new version", f"/editor")

    await reviews_col.insert_one({
        'id': new_id(),
        'ad_id': ad_id,
        'stage': 'final',
        'action': decision.action,
        'reviewer_id': user['id'],
        'reviewer_name': user.get('name'),
        'comments': decision.comments or '',
        'created_at': now,
    })
    await _recompute_ad_set_status(ad['ad_set_id'])
    return {'ok': True}


# ---------- Queues ----------
@router.get('/queues/script-review')
async def script_review_queue(user: dict = Depends(require_roles('script_reviewer', 'admin'))):
    ads = await ads_col.find({'status': 'pending_script_review'}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    ads = [normalize_ad(a) for a in ads]
    ad_set_ids = list({a['ad_set_id'] for a in ads})
    ad_sets = await ad_sets_col.find({'id': {'$in': ad_set_ids}}, {'_id': 0}).to_list(1000)
    return {'ads': ads, 'ad_sets': ad_sets}


@router.get('/queues/agency')
async def agency_queue(user: dict = Depends(require_roles('agency_admin', 'admin'))):
    query = {'status': {'$in': ['assigned_agency', 'assigned_editor', 'pending_final_review', 'final_rejected', 'approved']}}
    if user['role'] == 'agency_admin':
        query['assigned_agency_id'] = user.get('agency_id')
    ads = await ads_col.find(query, {'_id': 0}).sort('updated_at', -1).to_list(1000)
    ads = [normalize_ad(a) for a in ads]
    ad_set_ids = list({a['ad_set_id'] for a in ads})
    ad_sets = await ad_sets_col.find({'id': {'$in': ad_set_ids}}, {'_id': 0}).to_list(1000)
    # editors in this agency
    editor_query = {'role': 'video_editor', 'active': True}
    if user['role'] == 'agency_admin':
        editor_query['agency_id'] = user.get('agency_id')
    editors = await users_col.find(editor_query, {'_id': 0, 'password_hash': 0}).to_list(1000)
    return {'ads': ads, 'ad_sets': ad_sets, 'editors': editors}


@router.get('/queues/editor')
async def editor_queue(user: dict = Depends(require_roles('video_editor', 'admin'))):
    q = {'assigned_editor_id': user['id']} if user['role'] == 'video_editor' else {'assigned_editor_id': {'$ne': None}}
    ads = await ads_col.find(q, {'_id': 0}).sort('updated_at', -1).to_list(1000)
    ads = [normalize_ad(a) for a in ads]
    ad_set_ids = list({a['ad_set_id'] for a in ads})
    ad_sets = await ad_sets_col.find({'id': {'$in': ad_set_ids}}, {'_id': 0}).to_list(1000)
    return {'ads': ads, 'ad_sets': ad_sets}


@router.get('/queues/final-review')
async def final_review_queue(user: dict = Depends(require_roles('final_reviewer', 'admin'))):
    ads = await ads_col.find({'status': 'pending_final_review'}, {'_id': 0}).sort('updated_at', 1).to_list(1000)
    ads = [normalize_ad(a) for a in ads]
    ad_set_ids = list({a['ad_set_id'] for a in ads})
    ad_sets = await ad_sets_col.find({'id': {'$in': ad_set_ids}}, {'_id': 0}).to_list(1000)
    return {'ads': ads, 'ad_sets': ad_sets}


@router.get('/queues/downloads')
async def downloads_queue(user: dict = Depends(get_current_user)):
    ads = await ads_col.find({'status': 'approved'}, {'_id': 0}).sort('updated_at', -1).to_list(1000)
    ads = [normalize_ad(a) for a in ads]
    ad_set_ids = list({a['ad_set_id'] for a in ads})
    ad_sets = await ad_sets_col.find({'id': {'$in': ad_set_ids}}, {'_id': 0}).to_list(1000)
    return {'ads': ads, 'ad_sets': ad_sets}
