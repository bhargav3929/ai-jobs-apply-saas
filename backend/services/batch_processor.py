import asyncio
from core.firebase import db

class BatchProcessor:
    """
    Process large datasets in batches to avoid memory issues
    """
    
    @staticmethod
    async def process_posts_in_batches(posts: list, process_func, batch_size: int = 10, delay_between_batches: float = 2.0):
        """
        Process scraped posts in rate-limited batches.
        batch_size=10 and delay=2s keeps us under Groq's RPM limits.
        """

        results = []
        total_batches = (len(posts) + batch_size - 1) // batch_size

        for i in range(0, len(posts), batch_size):
            batch = posts[i:i + batch_size]
            batch_num = i // batch_size + 1

            # Process batch in parallel
            tasks = [process_func(post) for post in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions
            valid_results = [r for r in batch_results if not isinstance(r, Exception)]
            results.extend(valid_results)

            print(f"Processed batch {batch_num}/{total_batches}")

            # Delay between batches to respect rate limits
            if i + batch_size < len(posts):
                await asyncio.sleep(delay_between_batches)

        return results
    
    @staticmethod
    def batch_firestore_writes(documents: list, collection: str, batch_size: int = 500):
        """
        Write to Firestore in batches (max 500 per batch)
        """
        if not db:
            return 0
            
        total_written = 0
        
        for i in range(0, len(documents), batch_size):
            batch = db.batch()
            chunk = documents[i:i + batch_size]
            
            for doc in chunk:
                # Assuming doc has 'jobId' or 'id' logic
                key = doc.get("jobId") or doc.get("id") or doc.get("uid")
                if key:
                    doc_ref = db.collection(collection).document(key)
                    batch.set(doc_ref, doc)
            
            batch.commit()
            total_written += len(chunk)
            
            print(f"Written {total_written}/{len(documents)} documents")
        
        return total_written
