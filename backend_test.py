"""Backend API Test for Marketing Studio Tool
Tests all critical API endpoints with seeded credentials.
"""
import requests
import sys
import io

BASE_URL = 'https://marketing-studio-52.preview.emergentagent.com/api'

class APITester:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tokens = {}
        self.test_data = {}

    def test(self, name, method, path, expected_status, token=None, **kwargs):
        """Run a single API test"""
        url = f"{BASE_URL}{path}"
        headers = kwargs.pop('headers', {})
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        self.tests_run += 1
        try:
            if method == 'GET':
                r = requests.get(url, headers=headers, timeout=30, **kwargs)
            elif method == 'POST':
                r = requests.post(url, headers=headers, timeout=30, **kwargs)
            elif method == 'PATCH':
                r = requests.patch(url, headers=headers, timeout=30, **kwargs)
            elif method == 'DELETE':
                r = requests.delete(url, headers=headers, timeout=30, **kwargs)
            
            success = r.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - {r.status_code}")
                return True, r.json() if r.text else {}
            else:
                print(f"❌ {name} - Expected {expected_status}, got {r.status_code}: {r.text[:200]}")
                return False, {}
        except Exception as e:
            print(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def login(self, email, password, role):
        """Login and store token"""
        success, data = self.test(
            f"Login {role}",
            'POST',
            '/auth/login',
            200,
            json={'email': email, 'password': password}
        )
        if success and 'token' in data:
            self.tokens[role] = data['token']
            return True
        return False

    def run_all_tests(self):
        print("=" * 60)
        print("MARKETING STUDIO BACKEND API TESTS")
        print("=" * 60)
        
        # 1. Health check
        print("\n[1] Health Check")
        self.test("Health endpoint", 'GET', '/health', 200)
        
        # 2. Login all roles
        print("\n[2] Authentication Tests")
        credentials = [
            ('admin@marketing.studio', 'Admin@12345', 'admin'),
            ('creator@marketing.studio', 'Creator@123', 'creator'),
            ('reviewer@marketing.studio', 'Reviewer@123', 'script_reviewer'),
            ('agency-admin@pixel.studio', 'Agency@123', 'agency_admin'),
            ('editor@pixel.studio', 'Editor@123', 'video_editor'),
            ('final@marketing.studio', 'Final@123', 'final_reviewer'),
        ]
        
        for email, password, role in credentials:
            if not self.login(email, password, role):
                print(f"⚠️  Login failed for {role}, stopping tests")
                return False
        
        # Get /auth/me for each role
        for role, token in self.tokens.items():
            self.test(f"Get current user ({role})", 'GET', '/auth/me', 200, token=token)
        
        # 3. Admin endpoints
        print("\n[3] Admin Endpoints")
        admin_token = self.tokens['admin']
        
        # List agencies
        success, agencies_data = self.test("List agencies", 'GET', '/admin/agencies', 200, token=admin_token)
        if success and agencies_data:
            self.test_data['agencies'] = agencies_data
            print(f"   Found {len(agencies_data)} agencies")
        
        # List users
        success, users_data = self.test("List users", 'GET', '/admin/users', 200, token=admin_token)
        if success and users_data:
            print(f"   Found {len(users_data)} users")
        
        # Get agencies list (public)
        self.test("Get agencies directory", 'GET', '/agencies', 200, token=self.tokens['creator'])
        
        # Get users list (public)
        self.test("Get users directory", 'GET', '/users', 200, token=self.tokens['creator'])
        
        # 4. Upload endpoints
        print("\n[4] Upload Endpoints")
        creator_token = self.tokens['creator']
        
        # Upload a test file
        files = {'file': ('test.png', io.BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100), 'image/png')}
        success, upload_data = self.test("Upload file", 'POST', '/uploads', 200, token=creator_token, files=files)
        if success and 'file_id' in upload_data:
            self.test_data['file_id'] = upload_data['file_id']
            print(f"   Uploaded file: {upload_data['file_id']}")
            
            # Retrieve uploaded file
            self.test("Retrieve uploaded file", 'GET', f"/uploads/{upload_data['file_id']}", 200)
        
        # 5. Ad Set endpoints
        print("\n[5] Ad Set Endpoints")
        
        # Create ad set
        ad_set_payload = {
            'name': 'Test Ad Set',
            'type': 'script',
            'ads': [
                {
                    'name': 'Test Ad 1',
                    'script': 'Test script content',
                    'visual_guidelines': 'Test guidelines',
                    'reference_links': ['https://example.com'],
                    'reference_media': [],
                    'headline': 'Test Headline',
                    'primary_text': 'Test primary text',
                }
            ]
        }
        success, ad_set_data = self.test("Create ad set", 'POST', '/ad-sets', 200, token=creator_token, json=ad_set_payload)
        if success and 'ad_set' in ad_set_data:
            ad_set_id = ad_set_data['ad_set']['id']
            ad_id = ad_set_data['ads'][0]['id']
            self.test_data['ad_set_id'] = ad_set_id
            self.test_data['ad_id'] = ad_id
            print(f"   Created ad set: {ad_set_id}")
            
            # Get ad set by ID
            self.test("Get ad set by ID", 'GET', f'/ad-sets/{ad_set_id}', 200, token=creator_token)
            
            # List ad sets
            self.test("List ad sets", 'GET', '/ad-sets', 200, token=creator_token)
            
            # Update ad set
            self.test("Update ad set", 'PATCH', f'/ad-sets/{ad_set_id}', 200, token=creator_token, json={'name': 'Updated Test Ad Set'})
            
            # Submit ad set
            self.test("Submit ad set", 'POST', f'/ad-sets/{ad_set_id}/submit', 200, token=creator_token)
        
        # 6. Ad endpoints
        print("\n[6] Ad Endpoints")
        if 'ad_id' in self.test_data:
            ad_id = self.test_data['ad_id']
            
            # Get ad by ID
            self.test("Get ad by ID", 'GET', f'/ads/{ad_id}', 200, token=creator_token)
            
            # Update ad
            self.test("Update ad", 'PATCH', f'/ads/{ad_id}', 200, token=creator_token, json={'script': 'Updated script'})
        
        # 7. Workflow endpoints - Script Review
        print("\n[7] Workflow Endpoints - Script Review")
        reviewer_token = self.tokens['script_reviewer']
        
        # Get script review queue
        success, queue_data = self.test("Get script review queue", 'GET', '/workflow/queues/script-review', 200, token=reviewer_token)
        if success and queue_data.get('ads'):
            print(f"   Script review queue has {len(queue_data['ads'])} ads")
            
            # Try to approve/reject an ad (if any in queue)
            if len(queue_data['ads']) > 0:
                test_ad_id = queue_data['ads'][0]['id']
                
                # Get agencies for assignment
                if 'agencies' in self.test_data and len(self.test_data['agencies']) > 0:
                    agency_id = self.test_data['agencies'][0]['id']
                    
                    # Approve and assign to agency
                    self.test(
                        "Script review - approve and assign",
                        'POST',
                        f'/workflow/script-review/ads/{test_ad_id}',
                        200,
                        token=reviewer_token,
                        json={'action': 'approve', 'agency_id': agency_id, 'comments': 'Looks good'}
                    )
        
        # 8. Workflow endpoints - Agency
        print("\n[8] Workflow Endpoints - Agency")
        agency_admin_token = self.tokens['agency_admin']
        
        # Get agency queue
        success, agency_queue = self.test("Get agency queue", 'GET', '/workflow/queues/agency', 200, token=agency_admin_token)
        if success and agency_queue.get('ads'):
            print(f"   Agency queue has {len(agency_queue['ads'])} ads")
        
        # 9. Workflow endpoints - Editor
        print("\n[9] Workflow Endpoints - Editor")
        editor_token = self.tokens['video_editor']
        
        # Get editor queue
        success, editor_queue = self.test("Get editor queue", 'GET', '/workflow/queues/editor', 200, token=editor_token)
        if success and editor_queue.get('ads'):
            print(f"   Editor queue has {len(editor_queue['ads'])} ads")
        
        # 10. Workflow endpoints - Final Review
        print("\n[10] Workflow Endpoints - Final Review")
        final_token = self.tokens['final_reviewer']
        
        # Get final review queue
        success, final_queue = self.test("Get final review queue", 'GET', '/workflow/queues/final-review', 200, token=final_token)
        if success and final_queue.get('ads'):
            print(f"   Final review queue has {len(final_queue['ads'])} ads")
        
        # 11. Downloads queue
        print("\n[11] Downloads Queue")
        success, downloads = self.test("Get downloads queue", 'GET', '/workflow/queues/downloads', 200, token=creator_token)
        if success and downloads.get('ads'):
            print(f"   Downloads queue has {len(downloads['ads'])} approved ads")
        
        # 12. Notifications
        print("\n[12] Notifications")
        success, notifs = self.test("Get notifications", 'GET', '/notifications', 200, token=creator_token)
        if success:
            print(f"   Creator has {notifs.get('unread', 0)} unread notifications")
        
        # Mark all as read
        self.test("Mark all notifications as read", 'POST', '/notifications/read-all', 200, token=creator_token)
        
        return True

def main():
    tester = APITester()
    tester.run_all_tests()
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    print("=" * 60)
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All backend API tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
