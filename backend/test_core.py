"""End-to-end test for Marco core workflows.

Covers:
- Login for all roles
- Admin: create agency & user
- Creator: create script-only ad set (2 ads with reference media), submit
- Creator: create media-ready ad set, submit -> skips script review
- Script Reviewer: reject 1 ad (with comments), approve+assign 1 ad
- Creator: edit rejected ad and resubmit
- Script Reviewer: approve+assign the resubmitted ad
- Agency Admin (Pixel Studio): sees only their agency, assigns to editor
- Agency Admin cross-agency isolation check
- Editor: sees assigned ads, uploads video, submits (via workflow endpoint)
- Final Reviewer: rejects 1 with comments
- Editor: uploads new version -> submits
- Final Reviewer: approves
- Downloads: approved ads visible
- Notifications: creator/editor received notifications
"""
import os
import sys
import time
import io
import requests

BASE = os.environ.get('TEST_BASE', 'http://localhost:8001')


def http(method, path, token=None, **kwargs):
    headers = kwargs.pop('headers', {})
    if token:
        headers['Authorization'] = f'Bearer {token}'
    r = requests.request(method, f'{BASE}{path}', headers=headers, timeout=30, **kwargs)
    return r


def must_ok(r, label):
    if r.status_code >= 400:
        print(f"[FAIL] {label} -> {r.status_code}: {r.text}")
        sys.exit(1)
    return r.json() if r.text else {}


def login(email, password):
    r = http('POST', '/api/auth/login', json={'email': email, 'password': password})
    data = must_ok(r, f'login {email}')
    return data['token'], data['user']


def upload(token, filename, content, content_type='image/png'):
    files = {'file': (filename, io.BytesIO(content), content_type)}
    r = http('POST', '/api/uploads', token=token, files=files)
    return must_ok(r, f'upload {filename}')


def main():
    print('== Marco E2E Test ==')

    # 1. Login all roles
    tokens = {}
    for email, pw in [
        ('admin@marketing.studio', 'Admin@12345'),
        ('creator@marketing.studio', 'Creator@123'),
        ('reviewer@marketing.studio', 'Reviewer@123'),
        ('agency-admin@pixel.studio', 'Agency@123'),
        ('editor@pixel.studio', 'Editor@123'),
        ('final@marketing.studio', 'Final@123'),
    ]:
        t, u = login(email, pw)
        tokens[u['role']] = {'token': t, 'user': u}
        print(f"  login OK: {email} ({u['role']})")

    admin = tokens['admin']
    creator = tokens['creator']
    reviewer = tokens['script_reviewer']
    agency_admin = tokens['agency_admin']
    editor = tokens['video_editor']
    final = tokens['final_reviewer']

    # 2. Admin creates agency + user
    ags = must_ok(http('GET', '/api/admin/agencies', token=admin['token']), 'list agencies')
    print(f"  agencies: {[a['name'] for a in ags]}")
    pixel_id = next(a['id'] for a in ags if a['name'] == 'Pixel Studio')
    motion_id = next(a['id'] for a in ags if a['name'] == 'Motion Labs')

    # Create an editor in Motion Labs
    body = {
        'email': f'editor-motion-{int(time.time())}@motion.labs',
        'name': 'Mona Motion',
        'password': 'Motion@123',
        'role': 'video_editor',
        'agency_id': motion_id,
    }
    motion_editor = must_ok(http('POST', '/api/admin/users', token=admin['token'], json=body), 'create motion editor')
    print(f"  admin created editor: {motion_editor['email']}")

    # 3. Creator uploads 2 reference media files
    ref1 = upload(creator['token'], 'ref1.png', b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
    ref2 = upload(creator['token'], 'ref2.png', b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)
    print(f"  uploaded reference media: {ref1['file_id']}, {ref2['file_id']}")

    # 4. Create script-only ad set with 2 ads
    script_ad_set = must_ok(http('POST', '/api/ad-sets', token=creator['token'], json={
        'name': 'Summer Campaign 2026',
        'type': 'script',
        'ads': [
            {
                'name': 'Beach Ad',
                'script': 'A sunny day at the beach with our product.',
                'visual_guidelines': 'Warm colors, beach setting',
                'reference_links': ['https://example.com/inspo1'],
                'reference_media': [{'file_id': ref1['file_id'], 'filename': ref1['filename'], 'content_type': ref1['content_type'], 'size': ref1['size'], 'url': ref1['url']}],
                'headline': 'Summer Vibes',
                'primary_text': 'Get ready for the sunshine.',
            },
            {
                'name': 'Pool Ad',
                'script': 'Poolside relaxation with our brand.',
                'visual_guidelines': 'Cool blues, poolside',
                'reference_links': ['https://example.com/inspo2'],
                'reference_media': [{'file_id': ref2['file_id'], 'filename': ref2['filename'], 'content_type': ref2['content_type'], 'size': ref2['size'], 'url': ref2['url']}],
                'headline': 'Chill Season',
                'primary_text': 'Dive into summer.',
            },
        ]
    }), 'create script ad set')
    ad_set_id = script_ad_set['ad_set']['id']
    ad_ids = [a['id'] for a in script_ad_set['ads']]
    print(f"  created script ad set: {script_ad_set['ad_set']['ad_set_code']} with {len(ad_ids)} ads")

    # Submit ad set (moves ads to pending_script_review)
    must_ok(http('POST', f'/api/ad-sets/{ad_set_id}/submit', token=creator['token']), 'submit script ad set')

    # 5. Create media-ready ad set
    media_upload = upload(creator['token'], 'demo.mp4', b'FAKEMP4BYTES' * 100, 'video/mp4')
    media_ad_set = must_ok(http('POST', '/api/ad-sets', token=creator['token'], json={
        'name': 'Quick Media Campaign',
        'type': 'media_ready',
        'ads': [
            {
                'name': 'Ready Ad 1',
                'script': 'Existing script text',
                'media_file': {'file_id': media_upload['file_id'], 'filename': media_upload['filename'], 'content_type': media_upload['content_type'], 'size': media_upload['size'], 'url': media_upload['url']},
                'headline': 'Ready Headline',
                'primary_text': 'Ready primary text.',
            }
        ]
    }), 'create media-ready ad set')
    media_ad_set_id = media_ad_set['ad_set']['id']
    media_ad_id = media_ad_set['ads'][0]['id']
    must_ok(http('POST', f'/api/ad-sets/{media_ad_set_id}/submit', token=creator['token']), 'submit media-ready ad set')

    # Verify media-ready ad went straight to pending_final_review
    media_ad = must_ok(http('GET', f'/api/ads/{media_ad_id}', token=creator['token']), 'get media ad')
    assert media_ad['ad']['status'] == 'pending_final_review', f"Expected pending_final_review, got {media_ad['ad']['status']}"
    print(f"  media-ready ad correctly went to pending_final_review, skipping script review")

    # 6. Script Reviewer sees queue
    queue = must_ok(http('GET', '/api/workflow/queues/script-review', token=reviewer['token']), 'script review queue')
    print(f"  script review queue: {len(queue['ads'])} ads")
    assert len(queue['ads']) == 2

    # Reject first ad, approve second and assign to Pixel Studio
    must_ok(http('POST', f'/api/workflow/script-review/ads/{ad_ids[0]}', token=reviewer['token'], json={
        'action': 'reject',
        'comments': 'Please make the script more energetic.',
    }), 'reject ad 1')
    must_ok(http('POST', f'/api/workflow/script-review/ads/{ad_ids[1]}', token=reviewer['token'], json={
        'action': 'approve',
        'comments': 'Looks great!',
        'agency_id': pixel_id,
    }), 'approve+assign ad 2')

    # Check ad 1 status is script_rejected with comment
    ad1_detail = must_ok(http('GET', f'/api/ads/{ad_ids[0]}', token=creator['token']), 'get ad 1')
    assert ad1_detail['ad']['status'] == 'script_rejected', ad1_detail['ad']['status']
    assert 'energetic' in (ad1_detail['ad']['latest_review_comment'] or '')
    print(f"  ad 1 correctly rejected with comments visible to creator")

    # 7. Creator edits and resubmits rejected ad
    must_ok(http('PATCH', f'/api/ads/{ad_ids[0]}', token=creator['token'], json={
        'script': 'A high-energy sunny day at the beach.',
    }), 'edit rejected ad')
    must_ok(http('POST', f'/api/ads/{ad_ids[0]}/resubmit', token=creator['token']), 'resubmit ad')

    # Script Reviewer approves it
    must_ok(http('POST', f'/api/workflow/script-review/ads/{ad_ids[0]}', token=reviewer['token'], json={
        'action': 'approve',
        'agency_id': pixel_id,
    }), 'approve resubmitted ad')

    # 8. Agency Admin (Pixel) sees their queue
    agency_queue = must_ok(http('GET', '/api/workflow/queues/agency', token=agency_admin['token']), 'agency queue')
    print(f"  agency admin sees {len(agency_queue['ads'])} ads, {len(agency_queue['editors'])} editors")
    assert all(a['assigned_agency_id'] == pixel_id for a in agency_queue['ads']), 'Agency isolation violated!'
    # All ads should be in Pixel Studio
    for a in agency_queue['ads']:
        assert a['assigned_agency_id'] == pixel_id, f"cross-agency leak: {a['assigned_agency_id']}"

    # Assign all pending ads to Pixel editor
    editor_id = editor['user']['id']
    pending_ads = [a['id'] for a in agency_queue['ads'] if a['status'] == 'assigned_agency']
    assert len(pending_ads) >= 2, f"Expected 2 ads for pixel agency to assign, got {len(pending_ads)}"
    res = must_ok(http('POST', '/api/workflow/agency/assign', token=agency_admin['token'], json={
        'ad_ids': pending_ads,
        'editor_id': editor_id,
    }), 'assign to editor')
    print(f"  assigned {res['assigned_count']} ads to editor")

    # Try to assign motion labs editor -> should fail (403)
    r = http('POST', '/api/workflow/agency/assign', token=agency_admin['token'], json={
        'ad_ids': pending_ads[:1],
        'editor_id': motion_editor['id'],
    })
    assert r.status_code == 403, f"Cross-agency assignment should be forbidden, got {r.status_code}"
    print(f"  cross-agency editor assignment correctly rejected (403)")

    # 9. Editor sees queue
    editor_queue = must_ok(http('GET', '/api/workflow/queues/editor', token=editor['token']), 'editor queue')
    editor_ad_ids = [a['id'] for a in editor_queue['ads']]
    print(f"  editor sees {len(editor_ad_ids)} ads")
    assert len(editor_ad_ids) >= 2

    # Upload video for both ads — upload stages the media, it must NOT submit
    video1 = upload(editor['token'], 'v1.mp4', b'FAKEMP4' * 200, 'video/mp4')
    v1_ref = {'file_id': video1['file_id'], 'filename': video1['filename'], 'content_type': video1['content_type'], 'size': video1['size'], 'url': video1['url']}
    for aid in editor_ad_ids:
        must_ok(http('POST', f'/api/workflow/editor/ads/{aid}/upload', token=editor['token'], json={
            'media_file': v1_ref,
        }), f'editor upload ad {aid}')
    print(f"  editor uploaded video for {len(editor_ad_ids)} ads")

    # Uploading alone must not push anything to the final reviewer
    staged = must_ok(http('GET', '/api/workflow/queues/final-review', token=final['token']), 'final review queue after upload only')
    for aid in editor_ad_ids:
        assert aid not in [a['id'] for a in staged['ads']], f'ad {aid} reached final review on upload alone'
    staged_ad = must_ok(http('GET', f'/api/ads/{editor_ad_ids[0]}', token=editor['token']), 'staged ad detail')
    assert staged_ad['ad'].get('draft_media_file'), 'staged upload not persisted on the ad'
    assert staged_ad['ad']['status'] == 'assigned_editor', 'upload should not change ad status'
    assert len(staged_ad['versions']) == 0, 'staged upload should not create a version'
    print('  upload staged without submitting ✓')

    # Editor explicitly submits
    for aid in editor_ad_ids:
        must_ok(http('POST', f'/api/workflow/editor/ads/{aid}/submit', token=editor['token'], json={}), f'editor submit ad {aid}')
    print(f"  editor submitted {len(editor_ad_ids)} ads for final review")

    # 10. Final Reviewer queue - should contain submitted ads + media-ready ad
    fr_queue = must_ok(http('GET', '/api/workflow/queues/final-review', token=final['token']), 'final review queue')
    fr_ad_ids = [a['id'] for a in fr_queue['ads']]
    print(f"  final review queue has {len(fr_ad_ids)} ads")
    assert media_ad_id in fr_ad_ids, 'media-ready ad missing from final review'
    for aid in editor_ad_ids:
        assert aid in fr_ad_ids, f'editor-uploaded ad {aid} missing from final review'

    # Reject one ad, approve rest
    reject_ad = editor_ad_ids[0]
    must_ok(http('POST', f'/api/workflow/final-review/ads/{reject_ad}', token=final['token'], json={
        'action': 'reject',
        'comments': 'The colors do not match brand guidelines.',
    }), 'reject final')
    for aid in editor_ad_ids[1:] + [media_ad_id]:
        must_ok(http('POST', f'/api/workflow/final-review/ads/{aid}', token=final['token'], json={
            'action': 'approve',
        }), f'approve final {aid}')

    # 11. Editor re-uploads new version for rejected ad
    video2 = upload(editor['token'], 'v2.mp4', b'FAKEMP4V2' * 200, 'video/mp4')
    must_ok(http('POST', f'/api/workflow/editor/ads/{reject_ad}/upload', token=editor['token'], json={
        'media_file': {'file_id': video2['file_id'], 'filename': video2['filename'], 'content_type': video2['content_type'], 'size': video2['size'], 'url': video2['url']},
    }), 'editor re-upload')
    must_ok(http('POST', f'/api/workflow/editor/ads/{reject_ad}/submit', token=editor['token'], json={}), 'editor re-submit')

    # Check versions history
    ad_detail = must_ok(http('GET', f'/api/ads/{reject_ad}', token=editor['token']), 'get ad with versions')
    print(f"  ad has {len(ad_detail['versions'])} versions")
    assert len(ad_detail['versions']) == 2, f"Expected 2 versions, got {len(ad_detail['versions'])}"

    # Final reviewer approves v2
    must_ok(http('POST', f'/api/workflow/final-review/ads/{reject_ad}', token=final['token'], json={
        'action': 'approve',
    }), 'approve v2')

    # 12. Downloads queue - all approved ads
    downloads = must_ok(http('GET', '/api/workflow/queues/downloads', token=creator['token']), 'downloads')
    approved_ids = [a['id'] for a in downloads['ads']]
    print(f"  downloads queue has {len(approved_ids)} approved ads")
    # all 3 (2 editor ads + 1 media-ready) should be approved
    assert len(approved_ids) >= 3, f"Expected >=3 approved, got {len(approved_ids)}"

    # 13. Notifications - creator should have some
    notifs = must_ok(http('GET', '/api/notifications', token=creator['token']), 'creator notifications')
    print(f"  creator has {notifs['unread']} unread notifications ({len(notifs['notifications'])} total)")
    assert notifs['unread'] > 0, 'Creator should have unread notifications'

    editor_notifs = must_ok(http('GET', '/api/notifications', token=editor['token']), 'editor notifications')
    print(f"  editor has {editor_notifs['unread']} unread notifications")
    assert editor_notifs['unread'] > 0

    # 14. File retrieval works
    r = http('GET', f'/api/uploads/{ref1["file_id"]}')
    assert r.status_code == 200 and len(r.content) > 0, f"File not retrievable: {r.status_code}"
    print(f"  files retrievable via /api/uploads/{{file_id}}")

    # 15. Multi-agency isolation on GET /api/ad-sets
    aa_ad_sets = must_ok(http('GET', '/api/ad-sets', token=agency_admin['token']), 'agency ad sets')
    for a in aa_ad_sets:
        if a.get('assigned_agency_id'):
            assert a['assigned_agency_id'] == pixel_id, 'Agency isolation violated in ad sets list'
    print(f"  agency admin only sees their own ad sets ({len(aa_ad_sets)} total)")

    print('\n[SUCCESS] All E2E tests passed!')


if __name__ == '__main__':
    main()
