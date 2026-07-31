from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import ad_sets_col, ads_col, users_col, agencies_col
from auth import get_current_user, require_roles
from models import AdSetCreate
from utils import clean_doc, new_id, now_iso, gen_code, state_entry, normalize_ad
from notifications import notify_role

router = APIRouter(prefix='/api/ad-sets', tags=['ad-sets'])


@router.post('')
async def create_ad_set(payload: AdSetCreate, user: dict = Depends(require_roles('creator', 'admin'))):
    if payload.type not in ('script', 'media_ready'):
        raise HTTPException(status_code=400, detail='Invalid type')
    if not payload.ads or len(payload.ads) == 0:
        raise HTTPException(status_code=400, detail='At least one ad is required')

    ad_set_id = new_id()
    ad_set_code = gen_code('AS')
    now = now_iso()
    ad_set_status = 'draft'

    ad_docs = []
    for ad_input in payload.ads:
        ad_status = 'draft'
        # Basic validation depending on type
        if payload.type == 'media_ready':
            if not ad_input.media_file:
                raise HTTPException(status_code=400, detail=f"Media file is required for media-ready ad '{ad_input.name}'")
        # Normalize headlines/primary_texts: prefer arrays; if empty and legacy single field provided, upgrade to array
        headlines = [h for h in (ad_input.headlines or []) if h and str(h).strip()][:5]
        if not headlines and (ad_input.headline or '').strip():
            headlines = [ad_input.headline.strip()]
        primary_texts = [t for t in (ad_input.primary_texts or []) if t and str(t).strip()][:5]
        if not primary_texts and (ad_input.primary_text or '').strip():
            primary_texts = [ad_input.primary_text.strip()]
        ad_doc = {
            'id': new_id(),
            'ad_code': gen_code('AD'),
            'ad_set_id': ad_set_id,
            'ad_set_code': ad_set_code,
            'name': ad_input.name,
            'type': payload.type,
            'script': ad_input.script or '',
            'visual_guidelines': ad_input.visual_guidelines or '',
            'reference_links': ad_input.reference_links or [],
            'reference_media': [m.model_dump() if hasattr(m, 'model_dump') else m for m in (ad_input.reference_media or [])],
            'media_file': ad_input.media_file.model_dump() if ad_input.media_file else None,
            'headlines': headlines,
            'primary_texts': primary_texts,
            # keep legacy fields synced for backward compat
            'headline': headlines[0] if headlines else '',
            'primary_text': primary_texts[0] if primary_texts else '',
            'status': ad_status,
            'assigned_agency_id': None,
            'assigned_editor_id': None,
            'current_version': 0,
            'latest_review_comment': None,
            'created_by': user['id'],
            'created_at': now,
            'updated_at': now,
            'state_history': [state_entry('draft', user)],
        }
        ad_docs.append(ad_doc)

    ad_set_doc = {
        'id': ad_set_id,
        'ad_set_code': ad_set_code,
        'name': payload.name,
        'type': payload.type,
        'status': ad_set_status,
        'created_by': user['id'],
        'created_by_name': user.get('name'),
        'assigned_agency_id': None,
        'created_at': now,
        'updated_at': now,
    }
    await ad_sets_col.insert_one(ad_set_doc)
    if ad_docs:
        await ads_col.insert_many(ad_docs)
    return {
        'ad_set': clean_doc(ad_set_doc),
        'ads': [clean_doc(a) for a in ad_docs],
    }


@router.post('/{ad_set_id}/submit')
async def submit_ad_set(ad_set_id: str, user: dict = Depends(get_current_user)):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    if ad_set['created_by'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Not your ad set')
    if ad_set['status'] != 'draft':
        raise HTTPException(status_code=400, detail=f"Cannot submit an ad set in status '{ad_set['status']}'")

    now = now_iso()
    if ad_set['type'] == 'script':
        new_ad_set_status = 'pending_script_review'
        new_ad_status = 'pending_script_review'
        # notify script_reviewer role
        await notify_role('script_reviewer', 'New scripts to review', f"Ad Set '{ad_set['name']}' is ready for script review", f"/script-review/{ad_set_id}")
    else:
        new_ad_set_status = 'in_progress'
        new_ad_status = 'pending_final_review'
        await notify_role('final_reviewer', 'New media ready for review', f"Media-ready Ad Set '{ad_set['name']}' submitted for final review", f"/final-review")

    await ad_sets_col.update_one({'id': ad_set_id}, {'$set': {'status': new_ad_set_status, 'updated_at': now}})
    await ads_col.update_many({'ad_set_id': ad_set_id, 'status': 'draft'}, {'$set': {'status': new_ad_status, 'updated_at': now}, '$push': {'state_history': state_entry(new_ad_status, user)}})
    return {'ok': True}


@router.get('')
async def list_ad_sets(status: Optional[str] = None, type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query['status'] = status
    if type:
        query['type'] = type

    role = user['role']
    if role == 'creator':
        query['created_by'] = user['id']
    elif role == 'script_reviewer':
        # sees ad sets pending script review + ones they've acted on
        pass  # can be filtered client-side; keep all for now
    elif role == 'agency_admin':
        # only their agency
        query['assigned_agency_id'] = user.get('agency_id')
    elif role == 'video_editor':
        # only ad sets that have ads assigned to this editor
        editor_ad_sets = await ads_col.distinct('ad_set_id', {'assigned_editor_id': user['id']})
        query['id'] = {'$in': editor_ad_sets}
    # final_reviewer + admin see all

    docs = await ad_sets_col.find(query, {'_id': 0}).sort('created_at', -1).to_list(1000)
    # attach counts
    for d in docs:
        counts = await ads_col.aggregate([
            {'$match': {'ad_set_id': d['id']}},
            {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
        ]).to_list(20)
        d['ad_counts'] = {c['_id']: c['count'] for c in counts}
        d['total_ads'] = sum(c['count'] for c in counts)
    return docs


@router.get('/{ad_set_id}')
async def get_ad_set(ad_set_id: str, user: dict = Depends(get_current_user)):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id}, {'_id': 0})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    # Access rules
    role = user['role']
    if role == 'creator' and ad_set['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if role == 'agency_admin' and ad_set.get('assigned_agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail='Forbidden')
    if role == 'video_editor':
        # Must have at least one ad assigned to this editor
        assigned = await ads_col.find_one({'ad_set_id': ad_set_id, 'assigned_editor_id': user['id']})
        if not assigned:
            raise HTTPException(status_code=403, detail='Forbidden')

    ads = await ads_col.find({'ad_set_id': ad_set_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    # For video_editor, only their ads
    if role == 'video_editor':
        ads = [a for a in ads if a.get('assigned_editor_id') == user['id']]
    ads = [normalize_ad(a) for a in ads]
    # Attach agency name
    agency_name = None
    if ad_set.get('assigned_agency_id'):
        ag = await agencies_col.find_one({'id': ad_set['assigned_agency_id']}, {'_id': 0})
        agency_name = ag['name'] if ag else None
    ad_set['assigned_agency_name'] = agency_name
    return {'ad_set': ad_set, 'ads': ads}


@router.patch('/{ad_set_id}')
async def update_ad_set(ad_set_id: str, payload: dict, user: dict = Depends(get_current_user)):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    if ad_set['created_by'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Forbidden')
    if ad_set['status'] not in ('draft',):
        raise HTTPException(status_code=400, detail='Only draft ad sets can be edited')
    update = {'updated_at': now_iso()}
    if 'name' in payload:
        update['name'] = payload['name']
    await ad_sets_col.update_one({'id': ad_set_id}, {'$set': update})
    return {'ok': True}


@router.delete('/{ad_set_id}')
async def delete_ad_set(ad_set_id: str, user: dict = Depends(get_current_user)):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    if user['role'] != 'admin' and ad_set['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if ad_set['status'] != 'draft' and user['role'] != 'admin':
        raise HTTPException(status_code=400, detail='Only draft ad sets can be deleted')
    await ads_col.delete_many({'ad_set_id': ad_set_id})
    await ad_sets_col.delete_one({'id': ad_set_id})
    return {'ok': True}
