import os
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from fastapi.responses import FileResponse, StreamingResponse, Response
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


CHUNK = 256 * 1024


def _parse_range(header: str, size: int):
    """Parse a single-range `Range: bytes=…` header.

    Returns (start, end) inclusive, 'unsatisfiable', or None when there is no
    usable range and the whole file should be sent.
    """
    if not header:
        return None
    header = header.strip()
    if not header.startswith('bytes='):
        return None
    spec = header[len('bytes='):].split(',')[0].strip()
    if '-' not in spec:
        return None
    first, _, last = spec.partition('-')
    try:
        if first == '':
            # suffix form: the final N bytes
            n = int(last)
            if n <= 0:
                return None
            start, end = max(0, size - n), size - 1
        else:
            start = int(first)
            end = int(last) if last else size - 1
    except ValueError:
        return None
    if start >= size:
        return 'unsatisfiable'
    end = min(end, size - 1)
    if end < start:
        return None
    return start, end


def _iter_slice(path, start: int, length: int):
    with open(path, 'rb') as f:
        f.seek(start)
        remaining = length
        while remaining > 0:
            data = f.read(min(CHUNK, remaining))
            if not data:
                break
            remaining -= len(data)
            yield data


@router.get('/{file_id}')
async def get_file(file_id: str, request: Request):
    """Serve media inline with byte-range support.

    Video seeking depends on this: without 206 responses the browser cannot jump
    to an offset, so the scrub bar does nothing. Note this must NOT set
    Content-Disposition: attachment — that belongs on /download.
    """
    # NOTE: no auth here so <video>/<img> tags with token-less src work. Files are
    # served by opaque UUIDs; still an MVP-level access control.
    doc = await files_col.find_one({'file_id': file_id}, {'_id': 0})
    if not doc:
        raise HTTPException(status_code=404, detail='File not found')
    path = UPLOAD_DIR / doc['stored_name']
    if not path.exists():
        raise HTTPException(status_code=404, detail='File missing on disk')

    size = path.stat().st_size
    media_type = doc.get('content_type', 'application/octet-stream')
    rng = _parse_range(request.headers.get('range'), size)

    if rng == 'unsatisfiable':
        return Response(status_code=416, headers={'Accept-Ranges': 'bytes', 'Content-Range': f'bytes */{size}'})

    if rng:
        start, end = rng
        length = end - start + 1
        return StreamingResponse(
            _iter_slice(path, start, length),
            status_code=206,
            media_type=media_type,
            headers={
                'Accept-Ranges': 'bytes',
                'Content-Range': f'bytes {start}-{end}/{size}',
                'Content-Length': str(length),
            },
        )

    return StreamingResponse(
        _iter_slice(path, 0, size),
        media_type=media_type,
        headers={'Accept-Ranges': 'bytes', 'Content-Length': str(size)},
    )


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
