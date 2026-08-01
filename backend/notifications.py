from typing import List, Optional
from database import notifications_col, users_col
from utils import new_id, now_iso


async def notify(user_id: str, title: str, message: str, link: Optional[str] = None, **extra):
    """Create a notification.

    `extra` attaches structured fields (kind, ad_id, agency_name, …) so richer
    views can render a notification without re-joining other collections.
    """
    doc = {
        'id': new_id(),
        'user_id': user_id,
        'title': title,
        'message': message,
        'link': link,
        'read': False,
        'created_at': now_iso(),
        **extra,
    }
    await notifications_col.insert_one(doc)
    return doc


async def notify_role(role: str, title: str, message: str, link: Optional[str] = None, agency_id: Optional[str] = None, **extra):
    query = {'role': role, 'active': True}
    if agency_id is not None:
        query['agency_id'] = agency_id
    users = users_col.find(query, {'_id': 0, 'id': 1})
    async for u in users:
        await notify(u['id'], title, message, link, **extra)
