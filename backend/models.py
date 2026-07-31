from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Literal, Any
from datetime import datetime, timezone
import uuid


def _now():
    return datetime.now(timezone.utc).isoformat()


def _id():
    return str(uuid.uuid4())


ROLES = Literal[
    'admin',
    'creator',
    'script_reviewer',
    'agency_admin',
    'video_editor',
    'final_reviewer',
]

AD_STATUS = Literal[
    'draft',
    'pending_script_review',
    'script_rejected',
    'assigned_agency',      # agency assigned but no editor yet
    'assigned_editor',      # editor assigned, not uploaded
    'pending_final_review', # editor uploaded, waiting for final review
    'final_rejected',       # needs new version
    'approved',
]

AD_SET_STATUS = Literal[
    'draft',
    'pending_script_review',
    'in_progress',   # after script review approval / media_ready
    'completed',     # all ads approved
]

AD_TYPE = Literal['script', 'media_ready']


# ---------- User ----------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    email: str
    name: str
    role: str
    agency_id: Optional[str] = None
    active: bool = True
    created_at: str


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)
    role: str
    agency_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    agency_id: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class AgencyEditorCreate(BaseModel):
    """Agency admins add editors to their own agency; role/agency are implied."""
    email: EmailStr
    name: str
    password: str = Field(min_length=6)


class AgencyEditorUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


# ---------- Agency ----------
class AgencyCreate(BaseModel):
    name: str
    description: Optional[str] = ''


class Agency(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    name: str
    description: str = ''
    created_at: str


# ---------- Reference Media / File ----------
class FileRef(BaseModel):
    file_id: str
    filename: str
    content_type: str
    size: int
    url: str


# ---------- Ad ----------
class AdInput(BaseModel):
    name: str
    script: Optional[str] = ''
    visual_guidelines: Optional[str] = ''
    reference_links: List[str] = []
    reference_media: List[FileRef] = []
    media_file: Optional[FileRef] = None  # for media_ready path
    headlines: List[str] = Field(default_factory=list, max_length=5)
    primary_texts: List[str] = Field(default_factory=list, max_length=5)
    # mark this ad's copy as the set's default, prefilled into ads added later
    common_copy: bool = False
    # legacy single fields (backward compat)
    headline: Optional[str] = ''
    primary_text: Optional[str] = ''


class Ad(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    ad_code: str
    ad_set_id: str
    ad_set_code: str
    name: str
    type: str  # script or media_ready
    script: str = ''
    visual_guidelines: str = ''
    reference_links: List[str] = []
    reference_media: List[FileRef] = []
    media_file: Optional[FileRef] = None
    # editor's uploaded media that has not been submitted for final review yet
    draft_media_file: Optional[FileRef] = None
    headlines: List[str] = []
    primary_texts: List[str] = []
    # legacy single fields (backward compat) — mirror the first array entry
    headline: str = ''
    primary_text: str = ''
    status: str
    assigned_agency_id: Optional[str] = None
    assigned_editor_id: Optional[str] = None
    current_version: int = 0
    latest_review_comment: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str


class AdSetCreate(BaseModel):
    name: str
    type: AD_TYPE
    ads: List[AdInput]


class AdSet(BaseModel):
    model_config = ConfigDict(extra='ignore')
    id: str
    ad_set_code: str
    name: str
    type: str
    status: str
    created_by: str
    created_by_name: Optional[str] = None
    assigned_agency_id: Optional[str] = None
    # the ad whose copy seeds new ads in this set
    common_copy_ad_id: Optional[str] = None
    created_at: str
    updated_at: str


# ---------- Workflow Actions ----------
class ScriptReviewDecision(BaseModel):
    action: Literal['approve', 'reject']
    comments: Optional[str] = ''
    agency_id: Optional[str] = None  # required if approve


class BulkScriptReviewDecision(BaseModel):
    ad_ids: List[str]
    action: Literal['approve', 'reject']
    comments: Optional[str] = ''
    agency_id: Optional[str] = None


class AgencySetAssignInput(BaseModel):
    """Agency is chosen for a whole ad set, not per ad."""
    agency_id: str


class AgencyAssignInput(BaseModel):
    ad_ids: List[str]  # can be all ads in a set for bulk assign
    editor_id: str


class EditorUploadInput(BaseModel):
    media_file: FileRef


class EditorSubmitInput(BaseModel):
    """Submit uses the previously staged upload unless media_file is supplied."""
    media_file: Optional[FileRef] = None


class FinalReviewDecision(BaseModel):
    action: Literal['approve', 'reject']
    comments: Optional[str] = ''


# ---------- Review / Version records ----------
class ReviewRecord(BaseModel):
    id: str
    ad_id: str
    stage: str  # 'script' | 'final'
    action: str  # 'approve' | 'reject'
    reviewer_id: str
    reviewer_name: Optional[str] = None
    comments: str = ''
    created_at: str


class VersionRecord(BaseModel):
    id: str
    ad_id: str
    version_number: int
    media_file: FileRef
    uploaded_by: str
    uploaded_by_name: Optional[str] = None
    created_at: str


# ---------- Notification ----------
class Notification(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: str
