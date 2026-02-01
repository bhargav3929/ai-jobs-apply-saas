from apify_client import ApifyClient
from typing import List, Dict
from core.settings import APIFY_API_TOKEN, APIFY_ACTOR_ID

# Search keywords mapped per job category
CATEGORY_KEYWORDS_MAP = {
    "Software Developer": [
        "hiring software developer",
        "hiring full stack developer",
        "hiring backend developer",
        "hiring frontend developer",
        "hiring software engineer",
        "hiring web developer",
    ],
    "AI/ML Engineer": ["hiring ai developer", "hiring ai engineer"],
    "Marketing": ["hiring digital marketer", "hiring sales representative"],
    "Customer Support": ["hiring customer support"],
    "Design": ["hiring ui ux designer"],
    "Data Analyst": ["hiring data analyst"],
}

class LinkedInScraper:
    """
    Handles all LinkedIn scraping operations via Apify
    """
    
    def __init__(self):
        self.client = ApifyClient(APIFY_API_TOKEN)
        self.actor_id = APIFY_ACTOR_ID
    
    async def scrape_jobs(self) -> List[Dict]:
        """
        Scrape LinkedIn jobs from last 24 hours
        Returns raw post data
        """
        
        # Define search keywords (testing mode: 5 URLs to stay under 50 posts)
        # TODO: Expand to full 15 keywords for production
        search_keywords = [
            # Software Development (2 keywords for more data)
            "hiring software developer",
            "hiring full stack developer",

            # AI/ML (2 keywords for more data)
            "hiring ai developer",
            "hiring ai engineer",

            # Marketing (1 keyword)
            "hiring digital marketer",
        ]
        
        # Build URLs
        search_urls = [
            f"https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords={keyword.replace(' ', '%20')}"
            for keyword in search_keywords
        ]
        
        # Run Apify actor
        run_input = {
            "deepScrape": True,
            "limitPerSource": 10,
            "rawData": False,
            "urls": search_urls
        }
        
        print(f"🔍 Starting Apify scraping with {len(search_urls)} URLs...")
        
        try:
            # Note: ApifyClient call is typically synchronous, but we can wrap it or assume it blocks.
            # Ideally run in executor if async needed, but for cron job sync is fine.
            run = self.client.actor(self.actor_id).call(run_input=run_input)
            
            if not run:
                 print("❌ Apify run failed to start")
                 return []

            dataset_id = run.get("defaultDatasetId")
            
            if not dataset_id:
                print("❌ No dataset ID returned")
                return []

            # Fetch results
            dataset_items = self.client.dataset(dataset_id).list_items().items
            
            print(f"✅ Scraped {len(dataset_items)} posts from LinkedIn")
            
            return dataset_items
        except Exception as e:
            print(f"❌ Scraping failed: {e}")
            return []

    async def scrape_jobs_with_limits(self, category_limits: Dict[str, int]) -> List[Dict]:
        """
        Scrape LinkedIn jobs with admin-specified per-category post limits.
        category_limits: e.g. {"Software Developer": 20, "AI/ML Engineer": 10}
        The limit is per keyword — e.g. 20 means 20 posts from EACH keyword URL.
        Software Developer with 6 keywords × 20 = up to 120 posts.
        """
        search_urls = []
        max_limit = 1

        for category, limit in category_limits.items():
            if limit <= 0:
                continue
            keywords = CATEGORY_KEYWORDS_MAP.get(category, [])
            if not keywords:
                continue
            max_limit = max(max_limit, limit)
            for keyword in keywords:
                search_urls.append(
                    f"https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords={keyword.replace(' ', '%20')}"
                )
            print(f"  📋 {category}: {len(keywords)} keywords × {limit} each = up to {len(keywords) * limit} posts")

        if not search_urls:
            print("⚠️ No URLs to scrape — all categories had 0 limit or no keywords")
            return []

        run_input = {
            "deepScrape": True,
            "limitPerSource": max_limit,
            "rawData": False,
            "urls": search_urls
        }

        print(f"🔍 Starting Apify scraping with {len(search_urls)} URLs (limitPerSource={max_limit})...")

        try:
            run = self.client.actor(self.actor_id).call(run_input=run_input)

            if not run:
                print("❌ Apify run failed to start")
                return []

            dataset_id = run.get("defaultDatasetId")
            if not dataset_id:
                print("❌ No dataset ID returned")
                return []

            dataset_items = self.client.dataset(dataset_id).list_items().items
            print(f"✅ Scraped {len(dataset_items)} posts from LinkedIn")
            return dataset_items
        except Exception as e:
            print(f"❌ Scraping failed: {e}")
            return []
