import asyncio
import json
import re
from openai import AsyncOpenAI
from core.settings import GROQ_API_KEY
from data.job_categories import CATEGORY_KEYWORDS


class JobClassifier:
    """
    Hybrid job classifier: keyword scoring + AI classification + cross-validation.

    Strategy:
    1. Score post text against keyword dictionaries per category
    2. If keyword match is high-confidence (clear winner), use it directly
    3. If ambiguous, call AI with the keyword scores as hints
    4. Cross-validate AI output against keyword scores to catch misclassifications
    """

    CATEGORIES = [
        "Software Developer",
        "AI/ML Engineer",
        "Marketing",
        "Customer Support",
        "Sales",
        "Design",
        "Data Analyst",
        "Other"
    ]

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

    def _keyword_score(self, text: str) -> dict:
        """
        Score text against each category's keyword lists.
        Returns {category: score} where score is weighted sum.
        Strong keyword match = 3 points, weak = 1 point, negative = -2 points.
        """
        text_lower = text.lower()
        scores = {}

        for category, keywords in CATEGORY_KEYWORDS.items():
            score = 0
            strong = keywords.get("strong_keywords", [])
            weak = keywords.get("weak_keywords", [])
            negative = keywords.get("negative_keywords", [])

            strong_matches = 0
            for kw in strong:
                if kw in text_lower:
                    score += 3
                    strong_matches += 1

            weak_matches = 0
            for kw in weak:
                if kw in text_lower:
                    score += 1
                    weak_matches += 1

            for kw in negative:
                if kw in text_lower:
                    score -= 2

            scores[category] = {
                "total": score,
                "strong_matches": strong_matches,
                "weak_matches": weak_matches,
            }

        return scores

    def _get_keyword_winner(self, scores: dict) -> tuple:
        """
        Determine if keyword scoring gives a confident result.
        Returns (category, confidence) where confidence is 'high', 'medium', or 'low'.
        """
        ranked = sorted(scores.items(), key=lambda x: x[1]["total"], reverse=True)

        if not ranked or ranked[0][1]["total"] <= 0:
            return None, "low"

        top_cat, top_info = ranked[0]
        top_score = top_info["total"]
        second_score = ranked[1][1]["total"] if len(ranked) > 1 else 0

        # High confidence: strong keyword match AND clear lead
        if top_info["strong_matches"] >= 1 and top_score >= second_score + 3:
            return top_cat, "high"

        # Medium confidence: decent lead but no strong match
        if top_score >= 4 and top_score >= second_score + 2:
            return top_cat, "medium"

        return top_cat, "low"

    async def extract_job_info(self, post_text: str, author_occupation: str = "") -> dict:
        """
        Extract job title, company, and category from a LinkedIn post.
        Uses hybrid keyword + AI approach for maximum accuracy.
        """
        full_text = f"{post_text}\n{author_occupation}".strip()

        # Step 1: Keyword scoring
        scores = self._keyword_score(full_text)
        kw_winner, confidence = self._get_keyword_winner(scores)

        # Step 2: Always call AI for title/company extraction + classification
        # But provide keyword context as hints when confidence is not high
        ai_result = await self._ai_extract(post_text, author_occupation, scores, kw_winner, confidence)

        if not ai_result:
            # AI failed entirely — fall back to keywords only
            return {
                "title": self._extract_title_fallback(post_text),
                "company": "Unknown",
                "category": kw_winner if kw_winner else "Other",
            }

        # Step 3: Cross-validation
        final_category = self._cross_validate(
            ai_category=ai_result.get("category", "Other"),
            kw_winner=kw_winner,
            kw_confidence=confidence,
            scores=scores,
        )

        ai_result["category"] = final_category
        return ai_result

    async def _ai_extract(self, post_text: str, author_occupation: str,
                           scores: dict, kw_winner: str, kw_confidence: str) -> dict | None:
        """
        Call AI to extract title, company, and category.
        Provides keyword analysis as context for better accuracy.
        """
        # Build keyword context string for the AI
        top_scores = sorted(scores.items(), key=lambda x: x[1]["total"], reverse=True)[:3]
        keyword_hint = ""
        if kw_confidence in ("high", "medium"):
            keyword_hint = (
                f"\n\nKEYWORD ANALYSIS (use as supporting evidence):\n"
                f"Top keyword matches: "
                + ", ".join(f"{cat} (score: {info['total']}, strong: {info['strong_matches']})"
                           for cat, info in top_scores if info["total"] > 0)
            )

        system_prompt = (
            "You are an expert job classifier. Analyze a LinkedIn hiring post and extract:\n"
            "1. **title**: The exact job role being hired (NOT the author's title/headline)\n"
            "2. **company**: The company name hiring (or \"Unknown\")\n"
            "3. **category**: Classify into EXACTLY one of these categories:\n\n"

            "Categories (read the FULL post, especially skills/requirements section):\n\n"

            "- **Software Developer**: Any role involving programming, coding, software building. "
            "Includes: web dev, mobile dev, fullstack, frontend, backend, DevOps, QA/testing, "
            "system admin, cloud engineer. Key signals: programming languages (Python, Java, JS, etc.), "
            "frameworks (React, Django, Spring), tools (Docker, K8s, Git), or terms like 'build', 'deploy', 'code'.\n\n"

            "- **AI/ML Engineer**: Roles focused on AI, machine learning, data science, NLP, LLMs, "
            "computer vision. Key signals: TensorFlow, PyTorch, model training, fine-tuning, "
            "prompt engineering, RAG, embeddings, neural networks.\n\n"

            "- **Marketing**: Digital marketing, SEO, SEM, content writing, copywriting, "
            "social media management, growth/performance marketing, email marketing.\n\n"

            "- **Customer Support**: Customer support, customer success, helpdesk, tech support.\n\n"

            "- **Sales**: Sales roles, business development (BDE/BDM/SDR), account management.\n\n"

            "- **Design**: UI/UX, product design, graphic design, motion design, visual design.\n\n"

            "- **Data Analyst**: Data analysis, business analysis, BI, SQL-focused reporting roles. "
            "NOT data science or ML (those go to AI/ML Engineer).\n\n"

            "- **Other**: ONLY if the role truly doesn't fit any above (HR, legal, finance, etc.). "
            "When in doubt between two categories, pick the best match — never default to Other.\n\n"

            "CRITICAL RULES:\n"
            "- Read the ENTIRE post including skills, requirements, and tech stack sections\n"
            "- A post mentioning 'Python' for web dev is Software Developer, NOT AI/ML\n"
            "- A post mentioning 'Python' for ML/data science IS AI/ML Engineer\n"
            "- Context matters: 'Python + Django + REST API' = Software Developer\n"
            "- Context matters: 'Python + PyTorch + model training' = AI/ML Engineer\n"
            "- The author's LinkedIn headline is NOT the job being hired for\n"
            f"{keyword_hint}\n\n"

            'Return ONLY valid JSON: {"title": "...", "company": "...", "category": "..."}'
        )

        for attempt in range(3):
            try:
                response = await self.client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Post text:\n{post_text[:3000]}\n\nAuthor occupation: {author_occupation}"}
                    ],
                    temperature=0.0,
                    max_tokens=300,
                )

                raw = response.choices[0].message.content.strip()

                # Strip markdown code fences if present
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

                # Handle potential JSON wrapped in other text
                json_match = re.search(r'\{[^{}]*"title"[^{}]*"category"[^{}]*\}', raw, re.DOTALL)
                if json_match:
                    raw = json_match.group()

                result = json.loads(raw)

                # Validate category
                if result.get("category") not in self.CATEGORIES:
                    result["category"] = "Other"

                return result

            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    wait = (attempt + 1) * 2
                    print(f"Rate limited (classifier), retrying in {wait}s (attempt {attempt+1}/3)")
                    await asyncio.sleep(wait)
                else:
                    print(f"AI job extraction failed: {e}")
                    return None

        return None

    def _cross_validate(self, ai_category: str, kw_winner: str,
                         kw_confidence: str, scores: dict) -> str:
        """
        Cross-validate AI classification against keyword scores.
        Resolves disagreements based on confidence levels.
        """
        # If AI and keywords agree, use that
        if ai_category == kw_winner:
            return ai_category

        # If keywords have no opinion, trust AI
        if kw_winner is None or kw_confidence == "low":
            return ai_category

        # AI says "Other" but keywords found a match — trust keywords
        if ai_category == "Other" and kw_winner and kw_confidence in ("high", "medium"):
            return kw_winner

        # Keywords high confidence but AI disagrees — trust keywords
        if kw_confidence == "high":
            # Exception: AI picked a more specific sub-category that keywords missed
            # e.g., keywords say "Software Developer" but AI says "AI/ML Engineer"
            # Check if AI category also has decent keyword score
            ai_cat_score = scores.get(ai_category, {}).get("total", 0)
            if ai_cat_score > 0:
                # AI has some keyword support too — trust AI (more nuanced)
                return ai_category
            return kw_winner

        # Medium keyword confidence, AI disagrees — trust AI (it reads context better)
        return ai_category

    def _extract_title_fallback(self, post_text: str) -> str:
        """Extract a rough job title from the first line as fallback."""
        first_line = post_text.strip().split('\n')[0]
        # Remove common LinkedIn fluff
        for prefix in ["🚀", "📢", "📣", "🔥", "💼", "⚡", "We're hiring", "We are hiring",
                       "Hiring", "Urgent hiring", "Immediate hiring", "Looking for"]:
            first_line = first_line.replace(prefix, "").strip()
        return first_line[:100] if first_line else "Unknown Role"

    async def classify(self, post_text: str) -> str:
        """Classify job post into one category (legacy method)."""
        result = await self.extract_job_info(post_text)
        return result.get("category", "Other")
