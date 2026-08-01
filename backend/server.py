from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from database import ensure_indexes, users_col, agencies_col
from auth import hash_password
from utils import new_id, now_iso

from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router, directory_router, agency_router
from routes.upload_routes import router as upload_router
from routes.ad_set_routes import router as ad_set_router
from routes.ad_routes import router as ad_router
from routes.workflow_routes import router as workflow_router
from routes.notification_routes import router as notifications_router
from routes.comment_routes import router as comment_router
from routes.analytics_routes import router as analytics_router

app = FastAPI(title='Marketing Studio API', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
    # without this the browser hides the header, so downloads lose their filename
    expose_headers=['Content-Disposition'],
)


@app.get('/api/')
async def root():
    return {'app': 'Marketing Studio', 'status': 'ok'}


@app.get('/api/health')
async def health():
    return {'status': 'healthy'}


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(directory_router)
app.include_router(agency_router)
app.include_router(upload_router)
app.include_router(ad_set_router)
app.include_router(ad_router)
app.include_router(workflow_router)
app.include_router(notifications_router)
app.include_router(comment_router)
app.include_router(analytics_router)


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('marketing_studio')


DEFAULT_ADMIN_EMAIL = 'admin@marketing.studio'
DEFAULT_ADMIN_PASSWORD = 'Admin@12345'

# Testing bypass users - seeded on startup to help testing agent
SEED_USERS = [
    # (email, password, name, role, agency_ref)
    ('admin@marketing.studio', 'Admin@12345', 'Studio Admin', 'admin', None),
    ('creator@marketing.studio', 'Creator@123', 'Chris Creator', 'creator', None),
    ('reviewer@marketing.studio', 'Reviewer@123', 'Rachel Reviewer', 'script_reviewer', None),
    ('agency-admin@pixel.studio', 'Agency@123', 'Alex AgencyAdmin', 'agency_admin', 'Pixel Studio'),
    ('editor@pixel.studio', 'Editor@123', 'Eddie Editor', 'video_editor', 'Pixel Studio'),
    ('final@marketing.studio', 'Final@123', 'Fiona Finalist', 'final_reviewer', None),
    ('poster@marketing.studio', 'Poster@123', 'Pooja Poster', 'ad_poster', None),
]


@app.on_event('startup')
async def startup():
    await ensure_indexes()
    # Seed default admin & test users if missing
    now = now_iso()
    # Ensure Pixel Studio agency
    agency_map = {}
    default_agency_name = 'Pixel Studio'
    ag = await agencies_col.find_one({'name': default_agency_name})
    if not ag:
        ag_doc = {'id': new_id(), 'name': default_agency_name, 'description': 'Default seeded agency', 'created_at': now}
        await agencies_col.insert_one(ag_doc)
        ag = ag_doc
    agency_map[default_agency_name] = ag['id']
    # Add a second demo agency
    ag2_name = 'Motion Labs'
    ag2 = await agencies_col.find_one({'name': ag2_name})
    if not ag2:
        ag2_doc = {'id': new_id(), 'name': ag2_name, 'description': 'Second seeded agency', 'created_at': now}
        await agencies_col.insert_one(ag2_doc)
        ag2 = ag2_doc

    for email, password, name, role, agency_ref in SEED_USERS:
        exists = await users_col.find_one({'email': email})
        if exists:
            continue
        doc = {
            'id': new_id(),
            'email': email,
            'name': name,
            'role': role,
            'agency_id': agency_map.get(agency_ref) if agency_ref else None,
            'active': True,
            'password_hash': hash_password(password),
            'created_at': now,
        }
        await users_col.insert_one(doc)
        logger.info(f"Seeded user: {email} / {password} ({role})")


@app.on_event('shutdown')
async def shutdown():
    pass
