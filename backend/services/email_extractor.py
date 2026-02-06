from openai import AsyncOpenAI
import asyncio
import re
from core.settings import GROQ_API_KEY

class EmailExtractor:
    """
    Extract email addresses from job posts using AI
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
    
    async def extract_email(self, post_text: str) -> str:
        """
        Extract email using AI (same as your Information Extractor)
        """
        
        # First, try regex pattern (faster, cheaper)
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, post_text)
        
        if emails:
            # Return first valid email
            return emails[0]
        
        # If no regex match, use AI with retry on rate limits
        for attempt in range(3):
            try:
                response = await self.client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[
                        {
                            "role": "system",
                            "content": "Extract the primary email address for job applications. Return ONLY the email, nothing else. If no email found, return 'NONE'."
                        },
                        {
                            "role": "user",
                            "content": post_text
                        }
                    ],
                    temperature=0.1,
                    max_tokens=50
                )

                email = response.choices[0].message.content.strip()

                # Validate
                if "@" in email and "." in email and "NONE" not in email.upper():
                    return email
                return ""
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    wait = (attempt + 1) * 2
                    print(f"Rate limited (email), retrying in {wait}s (attempt {attempt+1}/3)")
                    await asyncio.sleep(wait)
                else:
                    print(f"Error in email extraction: {e}")
                    return ""

        return ""
