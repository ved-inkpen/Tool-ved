from fastapi import APIRouter, HTTPException, Depends
from typing import List
from database import users_col, agencies_col, ads_col
from auth import require_roles, hash_password
from models import UserCreate, UserUpdate, AgencyCreate, AgencyEditorCreate, AgencyEditorUpdate
from utils import clean_doc, new_id, now_iso

router = APIRouter(prefix='/api/admin', tags=['admin'])

ADMIN = require_roles('admin')

VALID_ROLES = {
    'admin', 'creator', 'script_reviewer',
    'agency_admin', 'video_editor', 'final_reviewer'
}


# ---------- Agencies ----------
@router.post('/agencies')
async def create_agency(payload: AgencyCreate, _admin=Depends(ADMIN)):
    existing = await agencies_col.find_one({'name': payload.name})
    if existing:
        raise HTTPException(status_code=400, detail='Agency name already exists')
    doc = {
        'id': new_id(),
        'name': payload.name,
        'description': payload.description or '',
        'created_at': now_iso(),
    }
    await agencies_col.insert_one(doc)
    return clean_doc(doc)


@router.get('/agencies')
async def list_agencies(_admin=Depends(ADMIN)):
    docs = await agencies_col.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return docs


@router.delete('/agencies/{agency_id}')
async def delete_agency(agency_id: str, _admin=Depends(ADMIN)):
    # cannot delete if users are attached
    used = await users_col.find_one({'agency_id': agency_id})
    if used:
        raise HTTPException(status_code=400, detail='Agency has users assigned. Reassign or deactivate them first.')
    res = await agencies_col.delete_one({'id': agency_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Agency not found')
    return {'ok': True}


# ---------- Users ----------
@router.post('/users')
async def create_user(payload: UserCreate, _admin=Depends(ADMIN)):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail='Invalid role')
    email = payload.email.lower()
    existing = await users_col.find_one({'email': email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already exists')
    # If role requires agency, validate
    agency_required = payload.role in ('agency_admin', 'video_editor')
    if agency_required and not payload.agency_id:
        raise HTTPException(status_code=400, detail='Agency is required for agency_admin and video_editor roles')
    if payload.agency_id:
        agency = await agencies_col.find_one({'id': payload.agency_id})
        if not agency:
            raise HTTPException(status_code=400, detail='Agency not found')
    doc = {
        'id': new_id(),
        'email': email,
        'name': payload.name,
        'role': payload.role,
        'agency_id': payload.agency_id if agency_required else None,
        'active': True,
        'password_hash': hash_password(payload.password),
        'created_at': now_iso(),
    }
    await users_col.insert_one(doc)
    doc.pop('password_hash', None)
    return clean_doc(doc)


@router.get('/users')
async def list_users(_admin=Depends(ADMIN)):
    docs = await users_col.find({}, {'_id': 0, 'password_hash': 0}).sort('created_at', -1).to_list(1000)
    return docs


@router.patch('/users/{user_id}')
async def update_user(user_id: str, payload: UserUpdate, _admin=Depends(ADMIN)):
    update = {}
    if payload.name is not None:
        update['name'] = payload.name
    if payload.role is not None:
        if payload.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail='Invalid role')
        update['role'] = payload.role
    if payload.agency_id is not None:
        update['agency_id'] = payload.agency_id or None
    if payload.active is not None:
        update['active'] = payload.active
    if payload.password is not None:
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail='Password too short')
        update['password_hash'] = hash_password(payload.password)
    if not update:
        raise HTTPException(status_code=400, detail='No fields to update')
    res = await users_col.update_one({'id': user_id}, {'$set': update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    updated = await users_col.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    return updated


@router.delete('/users/{user_id}')
async def delete_user(user_id: str, _admin=Depends(ADMIN)):
    # soft delete via deactivation
    res = await users_col.update_one({'id': user_id}, {'$set': {'active': False}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    return {'ok': True}


# ---------- Public/Directory endpoints (available to non-admin roles) ----------
from fastapi import Depends as _Dep
from auth import get_current_user as _cu

directory_router = APIRouter(prefix='/api', tags=['directory'])


@directory_router.get('/agencies')
async def public_agencies(_user: dict = _Dep(_cu)):
    docs = await agencies_col.find({}, {'_id': 0}).sort('name', 1).to_list(1000)
    return docs


@directory_router.get('/users')
async def public_users(role: str = None, agency_id: str = None, _user: dict = _Dep(_cu)):
    query = {'active': True}
    if role:
        query['role'] = role
    if agency_id:
        query['agency_id'] = agency_id
    # agency people only ever see their own agency's roster
    if _user['role'] in ('agency_admin', 'video_editor'):
        query['agency_id'] = _user.get('agency_id')
    docs = await users_col.find(query, {'_id': 0, 'password_hash': 0}).sort('name', 1).to_list(1000)
    return docs


# ---------- Agency-scoped editor management ----------
agency_router = APIRouter(prefix='/api/agency', tags=['agency'])

AGENCY_ADMIN = require_roles('agency_admin', 'admin')

# statuses where an editor still owes work, so removing them would orphan ads
IN_FLIGHT = ('assigned_editor', 'final_rejected', 'pending_final_review')


async def _agency_scope(user: dict, agency_id: str = None) -> str:
    """The agency an agency_admin may act on. Admins may target any agency."""
    if user['role'] == 'admin':
        target = agency_id or user.get('agency_id')
        if not target:
            raise HTTPException(status_code=400, detail='agency_id is required for admins')
        return target
    scope = user.get('agency_id')
    if not scope:
        raise HTTPException(status_code=400, detail='Your account is not attached to an agency')
    if agency_id and agency_id != scope:
        raise HTTPException(status_code=403, detail='You can only manage your own agency')
    return scope


async def _editor_in_agency(editor_id: str, scope: str) -> dict:
    editor = await users_col.find_one({'id': editor_id}, {'_id': 0, 'password_hash': 0})
    if not editor or editor.get('role') != 'video_editor':
        raise HTTPException(status_code=404, detail='Editor not found')
    if editor.get('agency_id') != scope:
        raise HTTPException(status_code=403, detail='That editor belongs to another agency')
    return editor


@agency_router.get('/editors')
async def list_agency_editors(agency_id: str = None, include_inactive: bool = False, user: dict = Depends(AGENCY_ADMIN)):
    """Video editors belonging to the caller's agency, with their current workload."""
    scope = await _agency_scope(user, agency_id)
    query = {'role': 'video_editor', 'agency_id': scope}
    if not include_inactive:
        query['active'] = True
    editors = await users_col.find(query, {'_id': 0, 'password_hash': 0}).sort('name', 1).to_list(1000)
    for e in editors:
        e['in_flight_ads'] = await ads_col.count_documents({'assigned_editor_id': e['id'], 'status': {'$in': IN_FLIGHT}})
        e['total_ads'] = await ads_col.count_documents({'assigned_editor_id': e['id']})
    return editors


@agency_router.post('/editors')
async def create_agency_editor(payload: AgencyEditorCreate, agency_id: str = None, user: dict = Depends(AGENCY_ADMIN)):
    """Add a video editor to the caller's agency."""
    scope = await _agency_scope(user, agency_id)
    email = payload.email.lower()
    if await users_col.find_one({'email': email}):
        raise HTTPException(status_code=400, detail='Email already exists')
    doc = {
        'id': new_id(),
        'email': email,
        'name': payload.name,
        'role': 'video_editor',
        'agency_id': scope,
        'active': True,
        'password_hash': hash_password(payload.password),
        'created_at': now_iso(),
    }
    await users_col.insert_one(doc)
    doc.pop('password_hash', None)
    return clean_doc(doc)


@agency_router.patch('/editors/{editor_id}')
async def update_agency_editor(editor_id: str, payload: AgencyEditorUpdate, agency_id: str = None, user: dict = Depends(AGENCY_ADMIN)):
    scope = await _agency_scope(user, agency_id)
    await _editor_in_agency(editor_id, scope)
    update = {}
    if payload.name is not None:
        update['name'] = payload.name
    if payload.active is not None:
        update['active'] = payload.active
    if payload.password is not None:
        if len(payload.password) < 6:
            raise HTTPException(status_code=400, detail='Password too short')
        update['password_hash'] = hash_password(payload.password)
    if not update:
        raise HTTPException(status_code=400, detail='No fields to update')
    await users_col.update_one({'id': editor_id}, {'$set': update})
    return await users_col.find_one({'id': editor_id}, {'_id': 0, 'password_hash': 0})


@agency_router.delete('/editors/{editor_id}')
async def delete_agency_editor(editor_id: str, agency_id: str = None, user: dict = Depends(AGENCY_ADMIN)):
    """Remove an editor. Refuses while they still have ads to produce."""
    scope = await _agency_scope(user, agency_id)
    editor = await _editor_in_agency(editor_id, scope)
    in_flight = await ads_col.count_documents({'assigned_editor_id': editor_id, 'status': {'$in': IN_FLIGHT}})
    if in_flight:
        raise HTTPException(
            status_code=400,
            detail=f"{editor['name']} still has {in_flight} ad(s) in production. Reassign them to another editor first.",
        )
    # keep the record if they have history, so past ads still resolve a name
    if await ads_col.count_documents({'assigned_editor_id': editor_id}):
        await users_col.update_one({'id': editor_id}, {'$set': {'active': False}})
        return {'ok': True, 'removed': 'deactivated'}
    await users_col.delete_one({'id': editor_id})
    return {'ok': True, 'removed': 'deleted'}
