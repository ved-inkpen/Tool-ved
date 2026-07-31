import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ.get('DB_NAME', 'marketing_studio')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_col = db.users
agencies_col = db.agencies
ad_sets_col = db.ad_sets
ads_col = db.ads
reviews_col = db.ad_reviews
versions_col = db.ad_versions
notifications_col = db.notifications
files_col = db.files

# Upload directory
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)


async def ensure_indexes():
    await users_col.create_index('email', unique=True)
    await ad_sets_col.create_index('ad_set_code', unique=True)
    await ads_col.create_index('ad_code', unique=True)
    await ads_col.create_index('ad_set_id')
    await notifications_col.create_index('user_id')
    await reviews_col.create_index('ad_id')
    await versions_col.create_index('ad_id')
