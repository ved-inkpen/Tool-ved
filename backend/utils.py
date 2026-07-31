from datetime import datetime, timezone
import uuid
from typing import Any, Optional


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def clean_doc(doc: dict) -> dict:
    """Remove Mongo _id and coerce datetime/other unserializable fields to strings."""
    if doc is None:
        return doc
    doc = dict(doc)
    doc.pop('_id', None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def gen_code(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6].upper()}"


def state_entry(status: str, actor: Optional[dict] = None, meta: Optional[dict] = None) -> dict:
    """Build a state transition entry for an ad's state_history array."""
    e = {'status': status, 'at': now_iso()}
    if actor:
        e['actor_id'] = actor.get('id')
        e['actor_name'] = actor.get('name')
    if meta:
        e['meta'] = meta
    return e


def parse_iso(s: str) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace('Z', '+00:00'))
    except Exception:
        return None


def seconds_between(a: str, b: str) -> Optional[float]:
    da = parse_iso(a); db = parse_iso(b)
    if not da or not db:
        return None
    return (db - da).total_seconds()


def humanize_seconds(sec: Optional[float]) -> str:
    if sec is None:
        return '—'
    sec = max(0, float(sec))
    if sec < 60:
        return f"{int(sec)}s"
    if sec < 3600:
        return f"{int(sec // 60)}m"
    if sec < 86400:
        h = sec // 3600
        m = (sec % 3600) // 60
        return f"{int(h)}h {int(m)}m" if m else f"{int(h)}h"
    d = sec // 86400
    h = (sec % 86400) // 3600
    return f"{int(d)}d {int(h)}h" if h else f"{int(d)}d"


def normalize_ad(ad: dict) -> dict:
    """Ensure ad has headlines[] and primary_texts[] arrays; upgrade legacy fields."""
    if ad is None:
        return ad
    if 'headlines' not in ad or ad.get('headlines') is None:
        legacy = ad.get('headline') or ''
        ad['headlines'] = [legacy] if legacy else []
    if 'primary_texts' not in ad or ad.get('primary_texts') is None:
        legacy = ad.get('primary_text') or ''
        ad['primary_texts'] = [legacy] if legacy else []
    # keep legacy singular fields for downstream consumers
    if not ad.get('headline') and ad.get('headlines'):
        ad['headline'] = ad['headlines'][0]
    if not ad.get('primary_text') and ad.get('primary_texts'):
        ad['primary_text'] = ad['primary_texts'][0]
    return ad

