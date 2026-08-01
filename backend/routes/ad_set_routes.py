from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import ad_sets_col, ads_col, users_col, agencies_col, reviews_col
from auth import get_current_user, require_roles
from models import AdSetCreate, AdInput, AgencySetAssignInput
from utils import clean_doc, new_id, now_iso, gen_code, state_entry, normalize_ad
from notifications import notify_role

router = APIRouter(prefix='/api/ad-sets', tags=['ad-sets'])


def _build_ad_doc(ad_input, ad_set_id: str, ad_set_code: str, ad_type: str, status: str, user: dict, now: str) -> dict:
    """Turn an AdInput into a stored ad document."""
    if ad_type == 'media_ready' and not ad_input.media_file:
        raise HTTPException(status_code=400, detail=f"Media file is required for media-ready ad '{ad_input.name}'")
    # Normalize headlines/primary_texts: prefer arrays; if empty and legacy single field provided, upgrade to array
    headlines = [h for h in (ad_input.headlines or []) if h and str(h).strip()][:5]
    if not headlines and (ad_input.headline or '').strip():
        headlines = [ad_input.headline.strip()]
    primary_texts = [t for t in (ad_input.primary_texts or []) if t and str(t).strip()][:5]
    if not primary_texts and (ad_input.primary_text or '').strip():
        primary_texts = [ad_input.primary_text.strip()]
    return {
        'id': new_id(),
        'ad_code': gen_code('AD'),
        'ad_set_id': ad_set_id,
        'ad_set_code': ad_set_code,
        'name': ad_input.name,
        'type': ad_type,
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
        'status': status,
        'assigned_agency_id': None,
        'assigned_editor_id': None,
        'current_version': 0,
        'latest_review_comment': None,
        'created_by': user['id'],
        'created_at': now,
        'updated_at': now,
        'state_history': [state_entry(status, user)],
    }


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

    ad_docs = [
        _build_ad_doc(ad_input, ad_set_id, ad_set_code, payload.type, 'draft', user, now)
        for ad_input in payload.ads
    ]

    # last ad flagged as common wins — the UI only ever lets one be ticked
    common_ad_id = next(
        (doc['id'] for doc, inp in reversed(list(zip(ad_docs, payload.ads))) if inp.common_copy),
        None,
    )

    ad_set_doc = {
        'id': ad_set_id,
        'ad_set_code': ad_set_code,
        'name': payload.name,
        'type': payload.type,
        'status': ad_set_status,
        'created_by': user['id'],
        'created_by_name': user.get('name'),
        'assigned_agency_id': None,
        'common_copy_ad_id': common_ad_id,
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


async def assign_agency_to_set(ad_set: dict, agency_id: str, user: dict) -> dict:
    """Point a whole ad set at one agency.

    Agency selection belongs to the set, not the individual ad — every ad in the
    set is produced by the same agency. Ads keep a mirrored assigned_agency_id so
    agency-scoped queues and permission checks stay simple.
    """
    agency = await agencies_col.find_one({'id': agency_id}, {'_id': 0})
    if not agency:
        raise HTTPException(status_code=404, detail='Agency not found')

    current = ad_set.get('assigned_agency_id')
    if current and current != agency_id:
        # once an agency admin has handed ads to an editor, work may have started
        busy = await ads_col.find_one({'ad_set_id': ad_set['id'], 'assigned_editor_id': {'$ne': None}})
        if busy:
            raise HTTPException(
                status_code=400,
                detail='Cannot reassign: this agency has already assigned ads to an editor',
            )

    now = now_iso()
    await ad_sets_col.update_one({'id': ad_set['id']}, {'$set': {'assigned_agency_id': agency_id, 'updated_at': now}})
    await ads_col.update_many({'ad_set_id': ad_set['id']}, {'$set': {'assigned_agency_id': agency_id, 'updated_at': now}})

    if current != agency_id:
        await notify_role(
            'agency_admin',
            'New ad set assigned to your agency',
            f"Ad Set '{ad_set['name']}' ({ad_set['ad_set_code']}) was assigned to your agency",
            '/agency',
            agency_id=agency_id,
        )
    return agency


@router.post('/{ad_set_id}/assign-agency')
async def assign_agency(ad_set_id: str, payload: AgencySetAssignInput, user: dict = Depends(require_roles('script_reviewer', 'admin'))):
    """Script reviewer routes the whole ad set to one agency."""
    ad_set = await ad_sets_col.find_one({'id': ad_set_id})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    agency = await assign_agency_to_set(ad_set, payload.agency_id, user)
    return {'ok': True, 'assigned_agency': agency}


@router.post('/{ad_set_id}/ads')
async def add_ad_to_set(ad_set_id: str, payload: AdInput, submit: bool = False, user: dict = Depends(get_current_user)):
    """Append a new ad to an existing ad set.

    The ad lands in draft. If `submit` is set it goes straight into the same
    review stage its siblings entered when the set was submitted, so a late
    addition to an in-flight set isn't stranded.
    """
    ad_set = await ad_sets_col.find_one({'id': ad_set_id})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    if ad_set['created_by'] != user['id'] and user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Not your ad set')
    if ad_set['status'] == 'completed':
        raise HTTPException(status_code=400, detail='Cannot add ads to a completed ad set')

    now = now_iso()
    status = 'draft'
    if submit:
        status = 'pending_script_review' if ad_set['type'] == 'script' else 'pending_final_review'

    ad_doc = _build_ad_doc(payload, ad_set_id, ad_set['ad_set_code'], ad_set['type'], status, user, now)
    # agency lives on the set, so a late addition joins whichever agency it already has
    ad_doc['assigned_agency_id'] = ad_set.get('assigned_agency_id')
    await ads_col.insert_one(ad_doc)
    set_update = {'updated_at': now}
    if payload.common_copy:
        set_update['common_copy_ad_id'] = ad_doc['id']
    await ad_sets_col.update_one({'id': ad_set_id}, {'$set': set_update})

    if status == 'pending_script_review':
        await notify_role('script_reviewer', 'New script to review', f"Ad '{ad_doc['name']}' was added to Ad Set {ad_set['ad_set_code']}", f"/script-review/{ad_set_id}")
    elif status == 'pending_final_review':
        await notify_role('final_reviewer', 'New media for final review', f"Ad '{ad_doc['name']}' was added to Ad Set {ad_set['ad_set_code']}", '/final-review')
        # a submitted media-ready ad moves a draft set into production
        if ad_set['status'] == 'draft':
            await ad_sets_col.update_one({'id': ad_set_id}, {'$set': {'status': 'in_progress', 'updated_at': now}})

    return {'ad': clean_doc(ad_doc)}


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
    # attach each ad's most recent review so callers can show who decided and when
    if ads:
        revs = await reviews_col.find(
            {'ad_id': {'$in': [a['id'] for a in ads]}}, {'_id': 0}
        ).sort('created_at', -1).to_list(5000)
        latest = {}
        for r in revs:
            latest.setdefault(r['ad_id'], r)
        for a in ads:
            a['latest_review'] = latest.get(a['id'])
    # Attach agency name
    agency_name = None
    if ad_set.get('assigned_agency_id'):
        ag = await agencies_col.find_one({'id': ad_set['assigned_agency_id']}, {'_id': 0})
        agency_name = ag['name'] if ag else None
    ad_set['assigned_agency_name'] = agency_name
    # resolve the set's common copy so new ads can be seeded from it
    common = None
    src_id = ad_set.get('common_copy_ad_id')
    if src_id:
        src = next((a for a in ads if a['id'] == src_id), None)
        if src is None:
            src = normalize_ad(await ads_col.find_one({'id': src_id}, {'_id': 0}))
        if src:
            common = {
                'ad_id': src['id'],
                'ad_name': src.get('name'),
                'headlines': src.get('headlines') or [],
                'primary_texts': src.get('primary_texts') or [],
            }
        else:
            # source ad was deleted — drop the dangling pointer
            await ad_sets_col.update_one({'id': ad_set_id}, {'$set': {'common_copy_ad_id': None}})
            ad_set['common_copy_ad_id'] = None
    ad_set['common_copy'] = common
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
