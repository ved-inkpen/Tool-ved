import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from database import files_col, UPLOAD_DIR
from auth import get_current_user
from utils import new_id, now_iso, clean_doc

router = APIRouter(prefix='/api/uploads', tags=['uploads'])

MAX_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post('')
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    file_id = new_id()
    ext = ''
    if file.filename and '.' in file.filename:
        ext = '.' + file.filename.rsplit('.', 1)[-1].lower()
    stored_name = f"{file_id}{ext}"
    dest = UPLOAD_DIR / stored_name
    size = 0
    with open(dest, 'wb') as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_SIZE:
                f.close()
                try:
                    os.remove(dest)
                except Exception:
                    pass
                raise HTTPException(status_code=413, detail='File too large (max 500MB)')
            f.write(chunk)
    doc = {
        'file_id': file_id,
        'filename': file.filename or stored_name,
        'content_type': file.content_type or 'application/octet-stream',
        'size': size,
        'stored_name': stored_name,
        'uploaded_by': user['id'],
        'created_at': now_iso(),
    }
    await files_col.insert_one(doc)
    return {
        'file_id': file_id,
        'filename': doc['filename'],
        'content_type': doc['content_type'],
        'size': size,
        'url': f"/api/uploads/{file_id}",
    }


@router.get('/{file_id}')
async def get_file(file_id: str):
    # NOTE: no auth here so <video>/<img> tags with token-less src work. Files are
    # served by opaque UUIDs; still an MVP-level access control.
    doc = await files_col.find_one({'file_id': file_id}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail='File not found')
    path = UPLOAD_DIR / doc['stored_name']
    if not path.exists():
        raise HTTPException(status_code=404, detail='File missing on disk')
    return FileResponse(str(path), media_type=doc.get('content_type', 'application/octet-stream'), filename=doc.get('filename'))


@router.get('/{file_id}/download')
async def download_file(file_id: str):
    doc = await files_col.find_one({'file_id': file_id}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail='File not found')
    path = UPLOAD_DIR / doc['stored_name']
    if not path.exists():
        raise HTTPException(status_code=404, detail='File missing on disk')
    return FileResponse(
        str(path),
        media_type='application/octet-stream',
        filename=doc.get('filename'),
        headers={'Content-Disposition': f'attachment; filename="{doc.get("filename")}"'}
    )
