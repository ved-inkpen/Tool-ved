from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from database import ads_col, ad_sets_col, users_col, reviews_col, versions_col
from auth import get_current_user
from utils import seconds_between, humanize_seconds, parse_iso, now_iso

router = APIRouter(prefix='/api/analytics', tags=['analytics'])


STAGE_ORDER = [
    'draft', 'pending_script_review', 'script_rejected', 'assigned_agency',
    'assigned_editor', 'pending_final_review', 'final_rejected', 'approved'
]


def _build_history(ad: dict, reviews: List[dict], versions: List[dict]) -> List[dict]:
    """Reconstruct a best-effort state history from either the explicit
    state_history array (new ads) or from ad.created_at + reviews + versions."""
    if ad.get('state_history'):
        # sort by 'at'
        return sorted(ad['state_history'], key=lambda e: e.get('at', ''))

    # Fallback: reconstruct from timestamps
    events = []
    events.append({'status': 'draft', 'at': ad.get('created_at')})
    # submissions imply pending status - approximate with first review timestamp minus a delta
    for r in sorted(reviews, key=lambda x: x.get('created_at', '')):
        if r['stage'] == 'script':
            new_status = 'assigned_agency' if r['action'] == 'approve' else 'script_rejected'
        else:
            new_status = 'approved' if r['action'] == 'approve' else ('final_rejected' if ad['type'] != 'media_ready' else 'script_rejected')
        events.append({'status': new_status, 'at': r['created_at'], 'actor_id': r.get('reviewer_id'), 'actor_name': r.get('reviewer_name')})
    for v in sorted(versions, key=lambda x: x.get('created_at', '')):
        events.append({'status': 'pending_final_review', 'at': v['created_at']})
    events = [e for e in events if e.get('at')]
    return sorted(events, key=lambda e: e['at'])


def _stage_durations(history: List[dict], final_at: Optional[str]) -> dict:
    """Compute total seconds spent in each stage."""
    durations = {}
    for i, e in enumerate(history):
        end_at = history[i + 1]['at'] if i + 1 < len(history) else final_at
        if not end_at:
            continue
        sec = seconds_between(e['at'], end_at)
        if sec is None:
            continue
        durations[e['status']] = durations.get(e['status'], 0) + max(0, sec)
    return durations


def _first_transition(history: List[dict], from_status: str, to_statuses: List[str]):
    """Find the first transition from `from_status` to any of `to_statuses`, return seconds between."""
    for i, e in enumerate(history):
        if e['status'] == from_status:
            for j in range(i + 1, len(history)):
                if history[j]['status'] in to_statuses:
                    return seconds_between(e['at'], history[j]['at']), history[j].get('actor_name')
    return None, None


@router.get('/ad-sets/{ad_set_id}')
async def ad_set_analytics(ad_set_id: str, user: dict = Depends(get_current_user)):
    ad_set = await ad_sets_col.find_one({'id': ad_set_id}, {'_id': 0})
    if not ad_set:
        raise HTTPException(status_code=404, detail='Ad set not found')
    # Access: creator (own), admin, script reviewer, final reviewer see all; agency admin only own agency; editor only if assigned
    role = user['role']
    if role == 'creator' and ad_set['created_by'] != user['id']:
        raise HTTPException(status_code=403, detail='Forbidden')
    if role == 'agency_admin' and ad_set.get('assigned_agency_id') != user.get('agency_id'):
        raise HTTPException(status_code=403, detail='Forbidden')

    ads = await ads_col.find({'ad_set_id': ad_set_id}, {'_id': 0}).to_list(1000)
    per_ad = []
    total_stage = {}
    review_response_script = []
    review_response_final = []

    for ad in ads:
        reviews = await reviews_col.find({'ad_id': ad['id']}, {'_id': 0}).to_list(1000)
        versions = await versions_col.find({'ad_id': ad['id']}, {'_id': 0}).to_list(1000)
        history = _build_history(ad, reviews, versions)
        final_at = ad.get('updated_at') if ad['status'] in ('approved', 'completed') else now_iso()
        durations = _stage_durations(history, final_at)
        for k, v in durations.items():
            total_stage[k] = total_stage.get(k, 0) + v

        script_resp, script_reviewer = _first_transition(history, 'pending_script_review', ['assigned_agency', 'script_rejected'])
        final_resp, final_reviewer = _first_transition(history, 'pending_final_review', ['approved', 'final_rejected', 'script_rejected'])
        if script_resp is not None:
            review_response_script.append(script_resp)
        if final_resp is not None:
            review_response_final.append(final_resp)

        total_seconds = seconds_between(ad.get('created_at'), final_at)
        rejections = sum(1 for r in reviews if r['action'] == 'reject')

        per_ad.append({
            'ad_id': ad['id'],
            'ad_code': ad['ad_code'],
            'name': ad['name'],
            'status': ad['status'],
            'total_seconds': total_seconds,
            'total_human': humanize_seconds(total_seconds),
            'durations': {k: {'seconds': v, 'human': humanize_seconds(v)} for k, v in durations.items()},
            'rejections': rejections,
            'versions': len(versions),
            'script_response_seconds': script_resp,
            'script_response_human': humanize_seconds(script_resp) if script_resp is not None else None,
            'final_response_seconds': final_resp,
            'final_response_human': humanize_seconds(final_resp) if final_resp is not None else None,
        })

    def _avg(xs):
        return sum(xs) / len(xs) if xs else None

    summary = {
        'total_ads': len(ads),
        'stage_totals': {k: {'seconds': v, 'human': humanize_seconds(v)} for k, v in total_stage.items()},
        'avg_script_review_response_seconds': _avg(review_response_script),
        'avg_script_review_response_human': humanize_seconds(_avg(review_response_script)) if review_response_script else None,
        'avg_final_review_response_seconds': _avg(review_response_final),
        'avg_final_review_response_human': humanize_seconds(_avg(review_response_final)) if review_response_final else None,
        'approved_count': sum(1 for a in ads if a['status'] == 'approved'),
        'rejected_scripts': sum(1 for a in ads if a['status'] == 'script_rejected'),
        'rejected_final': sum(1 for a in ads if a['status'] == 'final_rejected'),
        'total_seconds': seconds_between(ad_set.get('created_at'), ad_set.get('updated_at')) if ad_set['status'] == 'completed' else seconds_between(ad_set.get('created_at'), now_iso()),
    }
    summary['total_human'] = humanize_seconds(summary['total_seconds'])

    return {
        'ad_set': ad_set,
        'summary': summary,
        'per_ad': per_ad,
    }
