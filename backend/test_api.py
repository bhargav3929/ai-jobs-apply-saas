import httpx
import time
import os

BASE_URL = "http://127.0.0.1:8001"
API_URL = f"{BASE_URL}/api"

def print_pass(message):
    print(f"✅ PASS: {message}")

def print_fail(message, error=None):
    print(f"❌ FAIL: {message}")
    if error:
        print(f"   Error: {error}")

def test_health():
    print("\n--- Testing Health Check ---")
    try:
        r = httpx.get(f"{BASE_URL}/health")
        if r.status_code == 200:
            print_pass("Server is healthy")
        else:
            print_fail(f"Health check failed with {r.status_code}")
    except Exception as e:
        print_fail("Could not connect to server", e)

def test_dashboard():
    print("\n--- Testing Dashboard Endpoints ---")
    try:
        # Stats
        r = httpx.get(f"{API_URL}/dashboard/stats?user_id=test_user")
        if r.status_code == 200:
            data = r.json()
            if "total_applications" in data:
                print_pass("Dashboard stats fetched")
                print(f"   Data: {data}")
            else:
                print_fail("Invalid stats response structure")
        else:
            print_fail(f"Stats endpoint failed with {r.status_code}")

        # Recent Activity
        r = httpx.get(f"{API_URL}/dashboard/recent-activity?user_id=test_user")
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list):
                print_pass("Recent activity fetched")
                print(f"   Count: {len(data)} items")
            else:
                print_fail("Invalid activity response structure")
        else:
            print_fail(f"Activity endpoint failed with {r.status_code}")

    except Exception as e:
        print_fail("Dashboard tests failed", e)

def test_resume_parser():
    print("\n--- Testing Resume Parser ---")
    # We need a dummy file
    filename = "dummy_resume.pdf"
    if not os.path.exists(filename):
        with open(filename, "wb") as f:
            f.write(b"%PDF-1.4 empty pdf content")
    
    try:
        files = {'file': (filename, open(filename, 'rb'), 'application/pdf')}
        r = httpx.post(f"{API_URL}/onboarding/parse-resume", files=files)
        
        if r.status_code == 200:
            data = r.json()
            # Since functionality is mocked for dummy_resume.pdf in our code
            if "extracted_skills" in data:
                print_pass("Resume parsed successfully (Mock/Real)")
                print(f"   Skills: {data.get('extracted_skills')}")
            else:
                print_fail("Resume response missing skills", data)
        else:
            print_fail(f"Resume parser failed with {r.status_code}", r.text)
            
    except Exception as e:
        print_fail("Resume parser test failed", e)

def test_job_scraper():
    print("\n--- Testing Job Scraper ---")
    task_id = None
    
    # 1. Start Scrape
    try:
        r = httpx.post(f"{API_URL}/tasks/start-scrape?keywords=Python&location=Remote")
        if r.status_code == 200:
            data = r.json()
            task_id = data.get("task_id")
            print_pass(f"Scrape task started. ID: {task_id}")
        else:
            print_fail(f"Start scrape failed with {r.status_code}")
            return
            
    except Exception as e:
        print_fail("Start scrape test failed", e)
        return

    # 2. Poll Status
    print("   Polling for completion...", end="", flush=True)
    for _ in range(10):
        time.sleep(1)
        print(".", end="", flush=True)
        try:
            r = httpx.get(f"{API_URL}/tasks/status/{task_id}")
            if r.status_code == 200:
                data = r.json()
                if data["status"] == "completed":
                    print(" Done!")
                    print_pass("Scrape task completed")
                    print(f"   Jobs found: {len(data.get('jobs', []))}")
                    return
                elif data["status"] == "failed":
                    print(" Failed!")
                    print_fail("Scrape task reported failure", data.get("error"))
                    return
        except Exception as e:
            print_fail("Polling check failed", e)
            return

    print_fail("Scrape task timed out")

if __name__ == "__main__":
    test_health()
    test_dashboard()
    test_resume_parser()
    test_job_scraper()
