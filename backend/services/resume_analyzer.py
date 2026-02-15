import html
import json
import logging
import re
from openai import OpenAI
from core.settings import GROQ_API_KEY

logger = logging.getLogger("resume_analyzer")


class ResumeAnalyzer:
    """
    AI-powered resume analyzer using Groq API.
    Dynamically detects sections from the actual resume — no predefined list.
    """

    def __init__(self):
        self.client = OpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )

    def analyze(self, resume_text: str, job_category: str) -> dict:
        """Run comprehensive AI analysis on resume text."""
        logger.info(f"Analyzing resume (text length={len(resume_text)}, category={job_category})")

        system_prompt = """You are an elite resume analyst. Analyze this resume with surgical precision.

=== STRICT PRESERVATION RULES (NON-NEGOTIABLE) ===

These rules override EVERYTHING else. Violating any of them makes your output WRONG.

1. SECTION NAMES — Use the EXACT section heading as it appears in the resume.
   - If the resume says "TECHNICAL SUMMARY", the key MUST be "technical_summary" and displayName MUST be "TECHNICAL SUMMARY".
   - If the resume says "KEY PROJECTS", the key MUST be "key_projects" and displayName MUST be "KEY PROJECTS".
   - NEVER rename sections. "TECHNICAL SKILLS" must NOT become "SKILLS". "KEY PROJECTS" must NOT become "PROJECTS". "PROFESSIONAL EXPERIENCE" must NOT become "WORK EXPERIENCE" or "EXPERIENCE".
   - NEVER abbreviate, paraphrase, or "normalize" section names.

2. SECTION CONTENT — Copy the EXACT original text from each section, word-for-word.
   - The "content" field must contain the ORIGINAL text as it appears in the resume, NOT your interpretation or rewrite.
   - Do NOT rewrite, paraphrase, summarize, or "improve" the content.
   - Do NOT downgrade or upgrade the candidate's described experience level.
   - Do NOT drop bullet points, companies, projects, or any other content within a section.
   - If a section has 3 projects listed, ALL 3 must appear in the content. If it has 3 companies, ALL 3 must appear.

3. NEVER FABRICATE SECTIONS — Only include sections that have an explicit heading in the resume.
   - Do NOT create a "CONTACT" or "CONTACT INFORMATION" section — contact info belongs ONLY in the contactInfo JSON field.
   - Do NOT create "ADDITIONAL", "ADDITIONAL INFORMATION", "HOBBIES", "INTERESTS", or "REFERENCES" sections unless those headings actually exist in the resume.
   - If you cannot find an explicit heading for it in the resume text, it is NOT a section.

4. NEVER DROP SECTIONS — Every section heading in the resume MUST appear in your output.
   - If the resume has "PROFESSIONAL EXPERIENCE" with 3 companies, you MUST include the ENTIRE section with ALL companies.
   - Do NOT absorb one section's content into another section.
   - Do NOT skip sections because they seem less important.
   - Do NOT merge sections together (e.g., do NOT merge "EDUCATION" and "ACHIEVEMENTS" into one section if they have separate headings).

5. SECTION COUNT CHECK — Your output must have the SAME number of sections as the resume has section headings. If the resume has 5 section headings, your output must have exactly 5 sections (plus professional_summary if there is an untitled intro paragraph).

CRITICAL: Do NOT use predefined sections. Instead, identify every actual section that exists in this specific resume. Different resumes have different structures — a fresher may have no work experience but have projects and coursework. A senior may have no projects but have leadership and publications.

WARNING — PDF TEXT EXTRACTION:
The resume text below was extracted from a PDF. PDF extraction often SCRAMBLES the reading order — the candidate's name, contact info, and introductory summary may appear in the middle or end of the text instead of at the top. You MUST scan the ENTIRE text to find:
- The candidate's name (usually in ALL CAPS or title case, standalone line)
- Contact info: email (contains @), phone number (digits, may be 10+ digits for international), location/city
- An introductory paragraph (professional summary/objective) that may appear WITHOUT a section heading

Return ONLY valid JSON with this structure:
{
  "contactInfo": {
    "name": "Candidate's full name",
    "email": "email@example.com or null",
    "phone": "Full phone number with country code exactly as shown, e.g. +91 9876543210 or null",
    "location": "City, State or null",
    "linkedin": "Full LinkedIn URL or null",
    "github": "Full GitHub URL or null",
    "portfolio": "https://... or null",
    "otherLinks": ["any other URLs found in the resume"]
  },
  "sections": {
    "<exact_section_heading_lowercased_with_underscores>": {
      "displayName": "The EXACT section heading as written in the resume — do NOT rename, abbreviate, or paraphrase",
      "content": "The EXACT original text from this section, copied word-for-word from the resume. Do NOT rewrite, paraphrase, summarize, or drop any content.",
      "score": 0-100,
      "reasoning": "Specific explanation referencing what earned/lost points",
      "suggestions": [{"text": "specific actionable suggestion", "priority": "high|medium|low"}]
    }
  },
  "overallScore": 0-100,
  "atsScore": 0-100,
  "atsIssues": ["issue1", "issue2"],
  "keywordsFound": ["keyword1", "keyword2"],
  "keywordsMissing": ["keyword1", "keyword2"],
  "industryBenchmark": {
    "category": "the job category",
    "averageScore": 62,
    "percentile": 0-100,
    "topSkillsInDemand": ["skill1", "skill2", "skill3", "skill4", "skill5"]
  },
  "sectionOrder": ["section_key_1", "section_key_2", "...in order they appear in resume"],
  "strengthHighlights": ["strength1", "strength2", "strength3"],
  "criticalImprovements": ["improvement1", "improvement2"]
}

=== SECTION DETECTION RULES ===

1. Scan the ENTIRE text (not just top-to-bottom) because PDF extraction may scramble the order.
2. Use the EXACT heading from the resume as the key (lowercase, spaces replaced with underscores).
   - "TECHNICAL SUMMARY" → key: "technical_summary", displayName: "TECHNICAL SUMMARY"
   - "KEY PROJECTS" → key: "key_projects", displayName: "KEY PROJECTS"
   - "PROFESSIONAL EXPERIENCE" → key: "professional_experience", displayName: "PROFESSIONAL EXPERIENCE"
   - "EDUCATION & ACHIEVEMENTS" → key: "education_&_achievements", displayName: "EDUCATION & ACHIEVEMENTS"
   Do NOT simplify these names. Use them EXACTLY.
3. The "displayName" field must match the heading EXACTLY as written in the resume (including capitalization, ampersands, special characters).
4. Only include sections that actually exist with an explicit heading. Do NOT invent sections.
5. If the resume has no clear section headings, group content logically and name them descriptively.

=== SECTION ORDERING (VERY IMPORTANT) ===

Return sections in the EXACT order they appear in the resume. Do NOT reorder sections to match a "standard" resume order. The candidate intentionally chose their section order — a fresher may put Education before Experience, a designer may lead with Portfolio, etc. Preserve the candidate's intended structure.

Additionally, include a top-level field "sectionOrder" which is an array of the section keys in the order they appear in the resume. Example: ["professional_summary", "education", "projects", "technical_skills"]

=== UNTITLED CONTENT (VERY IMPORTANT) ===

Many resumes have an introductory paragraph (professional summary, objective statement, or career overview) that appears at the top of the resume WITHOUT any section heading. This is extremely common. You MUST:
- Look for any standalone paragraph that reads like a professional summary, career objective, or personal statement.
- If found, include it as a section with key "professional_summary" and displayName "Professional Summary".
- Do NOT skip it just because it lacks a heading — this paragraph is one of the most important parts of a resume.
- This is the ONLY case where you may create a section name that doesn't literally appear as a heading in the resume.

=== CONTACT INFORMATION (VERY IMPORTANT) ===

Scan the ENTIRE text — header, body, AND footer — for ALL contact information. Return EVERYTHING you find in the "contactInfo" JSON field ONLY (do NOT create a separate CONTACT section):
- Name: the candidate's full name
- Email: anything containing @ (e.g., name@email.com)
- Phone: the FULL phone number exactly as shown, INCLUDING country code (e.g., +91 9876543210). Do NOT strip the country code. Do NOT reformat the number.
- Location: city names, state/country references
- LinkedIn: any linkedin.com URL — include the FULL URL
- GitHub: any github.com URL — include the FULL URL
- Portfolio: any personal website, blog, or portfolio URL
- Other links: any other URLs (certifications, project demos, etc.)

Do NOT omit any contact detail found ANYWHERE in the text. If the resume has a phone number buried in the footer, it MUST appear in contactInfo.phone. If there's a LinkedIn URL in the header, it MUST appear in contactInfo.linkedin.

If email OR phone is present ANYWHERE in the text, do NOT list "Missing contact information" as an ATS issue or critical improvement. Only flag contact info as missing if you truly cannot find any email or phone number in the entire text.

=== SCORING RUBRIC (apply to EVERY section found) ===

Score each section 0-100 based on these universal criteria:

CONTENT QUALITY (0-40 points):
  +10 for substantial content (not too thin, not padding)
  +10 for specific details (names, numbers, dates, technologies)
  +10 for relevance to the target job category
  +10 for clear, professional language

IMPACT & EVIDENCE (0-30 points):
  +15 for quantified results (numbers, percentages, metrics, scale)
  +15 for demonstrated impact (what changed because of the candidate's work)

FORMATTING & STRUCTURE (0-30 points):
  +10 for logical organization within the section
  +10 for consistent formatting (dates aligned, bullets parallel)
  +10 for appropriate length (not too short, not bloated)

=== OVERALL SCORE ===
Weighted average of all sections found, where:
- Sections demonstrating direct job relevance (experience, skills) get 1.5x weight
- Supporting sections (education, certifications) get 1x weight
- Bonus sections (hobbies, references) get 0.5x weight

=== ATS SCORING (0-100) ===
+20 if standard section headers are used
+20 if no tables, graphics, or complex formatting detected
+20 if contact information (email, phone) is present
+15 if keyword density for the job category is adequate
+15 if no unusual characters or encoding issues
+10 if dates are in standard format

=== KEYWORD ANALYSIS ===
- keywordsFound: Skills, tools, frameworks ACTUALLY present that match the job category
- keywordsMissing: Important keywords for this job category NOT in the resume

IMPORTANT:
- Be honest and specific. Generic feedback is useless.
- Score based on what IS in the resume, not what SHOULD be there.
- A fresher with strong projects and no experience should NOT get 0 for missing experience — they simply don't have that section.
- Every suggestion must be actionable and specific to THIS resume.
- Content that uses strong action verbs (Engineered, Spearheaded, Led, Architected), quantified results with numbers, and demonstrates clear impact should receive HIGHER scores in the Impact & Evidence category.
- Professionally polished, concise, and metric-driven content should score 80-95+ in Content Quality. Do not under-score well-written content.

=== FINAL SELF-CHECK (DO THIS BEFORE RETURNING) ===

Before returning your JSON, verify:
1. Every section heading from the resume has a matching entry in "sections". Count them.
2. No section in your output has a name that doesn't appear as a heading in the resume (except "professional_summary" for untitled intro paragraphs).
3. No "contact", "additional", "hobbies", or "interests" section exists in your output unless those exact headings appear in the resume.
4. The "content" field of each section contains the actual text from the resume, not a summary or rewrite.
5. The displayName of each section matches the original heading exactly (case, punctuation, ampersands — all preserved).
6. The phone number in contactInfo includes the country code if one was present in the resume.
7. LinkedIn and GitHub URLs are included in contactInfo if they appear anywhere in the resume."""

        try:
            logger.info(f"Calling Groq API (model=openai/gpt-oss-120b, resume_text_len={len(resume_text[:8000])})")
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Resume text:\n{resume_text[:8000]}\n\nTarget job category: {job_category}"}
                ],
                temperature=0.0,
                max_tokens=8000,
                response_format={"type": "json_object"}
            )

            raw = response.choices[0].message.content
            logger.info(f"AI analysis response received (length={len(raw)})")
            logger.info(f"AI usage: prompt_tokens={getattr(response.usage, 'prompt_tokens', '?')}, completion_tokens={getattr(response.usage, 'completion_tokens', '?')}")
            result = json.loads(raw)

            # Validate and sanitize the response
            result = self._validate_analysis(result, job_category)

            # Post-validation: cross-check scores against content heuristics
            result = self._cross_validate_scores(result, resume_text)

            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error from AI analysis: {e}")
            logger.error(f"Raw AI response: {raw[:500] if 'raw' in dir() else 'N/A'}")
            return self._fallback_analysis(resume_text, job_category)
        except Exception as e:
            logger.error(f"AI resume analysis FAILED: {type(e).__name__}: {e}", exc_info=True)
            return self._fallback_analysis(resume_text, job_category)

    def score_sections(
        self,
        sections: list[dict],
        contact_info: dict,
        job_category: str,
    ) -> dict:
        """Score pre-extracted resume sections. Does NOT detect structure.

        The AI receives sections as structured JSON and ONLY adds scores and
        suggestions — it never modifies section names, content, or order.

        Args:
            sections: List of {"key": str, "displayName": str, "content": str}
                from the PDF structure extractor.
            contact_info: Pre-extracted contact info dict.
            job_category: Target job category for relevance scoring.

        Returns:
            Analysis dict compatible with the existing analyze() output format,
            with structure preserved from the input.
        """
        logger.info(f"Scoring {len(sections)} pre-extracted sections for category={job_category}")

        # Build the sections JSON to send to the AI
        sections_for_ai = []
        for sec in sections:
            sections_for_ai.append({
                "key": sec["key"],
                "displayName": sec["displayName"],
                "content": sec.get("content", ""),
            })

        system_prompt = """You are a resume scoring expert. You will receive pre-extracted resume sections as JSON.

Your ONLY job is to score each section and provide improvement suggestions.

=== ABSOLUTE RULES ===

You MUST NOT:
- Change section names, keys, or displayNames
- Modify, rewrite, or paraphrase any content
- Add new sections
- Remove existing sections
- Reorder sections
- Modify contact information

For each section in the input, return it with these additional fields:
- score (0-100 using the rubric below)
- reasoning (specific feedback referencing what earned/lost points)
- suggestions (array of {"text": "actionable suggestion", "priority": "high|medium|low"})

=== SCORING RUBRIC ===

CONTENT QUALITY (0-40 points):
  +10 for substantial content (not too thin, not padding)
  +10 for specific details (names, numbers, dates, technologies)
  +10 for relevance to the target job category
  +10 for clear, professional language

IMPACT & EVIDENCE (0-30 points):
  +15 for quantified results (numbers, percentages, metrics, scale)
  +15 for demonstrated impact (what changed because of the candidate's work)

FORMATTING & STRUCTURE (0-30 points):
  +10 for logical organization within the section
  +10 for consistent formatting (dates aligned, bullets parallel)
  +10 for appropriate length (not too short, not bloated)

=== OVERALL SCORE ===
Weighted average of all sections:
- Experience/skills/technologies sections: 1.5x weight
- Summary/objective/profile/projects sections: 1.2x weight
- Education/certifications: 1.0x weight
- Other sections: 0.8x weight

=== ATS SCORING (0-100) ===
+20 if standard section headers are used
+20 if no tables, graphics, or complex formatting detected
+20 if contact information is present
+15 if keyword density for the job category is adequate
+15 if no unusual characters or encoding issues
+10 if dates are in standard format

=== IMPORTANT ===
- Content that uses strong action verbs and quantified results should score 80-95+
- Be honest and specific. Generic feedback is useless.
- Every suggestion must be actionable and specific to THIS resume.

Return ONLY valid JSON with this structure:
{
  "sections": {
    "<key>": {
      "displayName": "EXACT displayName from input",
      "content": "EXACT content from input — do NOT modify",
      "score": 0-100,
      "reasoning": "specific explanation",
      "suggestions": [{"text": "suggestion", "priority": "high|medium|low"}]
    }
  },
  "overallScore": 0-100,
  "atsScore": 0-100,
  "atsIssues": ["issue1"],
  "keywordsFound": ["keyword1"],
  "keywordsMissing": ["keyword1"],
  "industryBenchmark": {
    "category": "job category",
    "averageScore": 62,
    "percentile": 0-100,
    "topSkillsInDemand": ["skill1", "skill2"]
  },
  "strengthHighlights": ["strength1"],
  "criticalImprovements": ["improvement1"]
}"""

        user_msg = (
            f"Resume sections (JSON):\n{json.dumps(sections_for_ai, indent=2)}\n\n"
            f"Contact info available: name={contact_info.get('name')}, "
            f"email={'yes' if contact_info.get('email') else 'no'}, "
            f"phone={'yes' if contact_info.get('phone') else 'no'}, "
            f"linkedin={'yes' if contact_info.get('linkedin') else 'no'}, "
            f"github={'yes' if contact_info.get('github') else 'no'}\n\n"
            f"Target job category: {job_category}"
        )

        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.0,
                max_tokens=6000,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            logger.info(f"Scoring response received (length={len(raw)})")
            result = json.loads(raw)

            # Merge AI scores back onto the original sections, preserving
            # the exact content from the extractor (not the AI's copy).
            scored_sections = {}
            ai_sections = result.get("sections", {})
            for sec in sections:
                key = sec["key"]
                ai_sec = ai_sections.get(key, {})
                scored_sections[key] = {
                    "displayName": sec["displayName"],
                    "content": sec.get("content", ""),
                    "score": max(0, min(100, int(ai_sec.get("score", 50)))),
                    "reasoning": ai_sec.get("reasoning", ""),
                    "suggestions": ai_sec.get("suggestions", []),
                }
                # Validate suggestion priorities
                for s in scored_sections[key]["suggestions"]:
                    if s.get("priority") not in ("high", "medium", "low"):
                        s["priority"] = "medium"

            result["sections"] = scored_sections
            result["originalSectionOrder"] = [sec["key"] for sec in sections]

            # Validate top-level fields
            result["overallScore"] = max(0, min(100, int(result.get("overallScore", 50))))
            result["atsScore"] = max(0, min(100, int(result.get("atsScore", 50))))
            result.setdefault("atsIssues", [])
            result.setdefault("keywordsFound", [])
            result.setdefault("keywordsMissing", [])
            result.setdefault("strengthHighlights", [])
            result.setdefault("criticalImprovements", [])

            benchmark = result.get("industryBenchmark", {})
            benchmark.setdefault("category", job_category)
            benchmark.setdefault("averageScore", 62)
            benchmark["percentile"] = max(0, min(100, int(benchmark.get("percentile", 50))))
            benchmark.setdefault("topSkillsInDemand", [])
            result["industryBenchmark"] = benchmark

            result["contactInfo"] = contact_info

            # Cross-validate scores against content heuristics
            full_text = "\n".join(sec.get("content", "") for sec in sections)
            result = self._cross_validate_scores(result, full_text)

            return result

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error from scoring AI: {e}")
            return self._fallback_scoring(sections, contact_info, job_category)
        except Exception as e:
            logger.error(f"AI section scoring FAILED: {type(e).__name__}: {e}", exc_info=True)
            return self._fallback_scoring(sections, contact_info, job_category)

    def _fallback_scoring(
        self,
        sections: list[dict],
        contact_info: dict,
        job_category: str,
    ) -> dict:
        """Generate basic scores when AI scoring fails.

        Preserves the exact structure from the extractor.
        """
        scored_sections = {}
        for sec in sections:
            content = sec.get("content", "")
            base_score = 45 if len(content.strip()) > 50 else 25
            scored_sections[sec["key"]] = {
                "displayName": sec["displayName"],
                "content": content,
                "score": base_score,
                "reasoning": "AI scoring unavailable — basic score only",
                "suggestions": [{"text": "Re-analyze to get detailed suggestions", "priority": "medium"}],
            }

        return {
            "sections": scored_sections,
            "originalSectionOrder": [sec["key"] for sec in sections],
            "contactInfo": contact_info,
            "overallScore": 45,
            "atsScore": 45,
            "atsIssues": ["Could not perform detailed ATS analysis"],
            "keywordsFound": [],
            "keywordsMissing": [],
            "industryBenchmark": {
                "category": job_category,
                "averageScore": 62,
                "percentile": 40,
                "topSkillsInDemand": [],
            },
            "strengthHighlights": ["Resume structure extracted successfully"],
            "criticalImprovements": ["Re-run analysis for detailed feedback"],
        }

    def enhance_section(self, section_name: str, content: str, job_category: str) -> str:
        """AI-enhance a specific resume section. Returns PLAIN TEXT only."""
        logger.info(f"Enhancing section '{section_name}' for category '{job_category}'")

        prompt = f"""You are one of the world's top professional resume writers, trusted by C-level executives and FAANG engineers alike. Your job is to rewrite this resume section to be significantly more impactful.

SECTION: {section_name}
TARGET ROLE: {job_category}

CURRENT CONTENT:
{content}

=== ABSOLUTE RULES ===

1. OUTPUT FORMAT: Return PLAIN TEXT ONLY.
   - NO markdown formatting whatsoever (no **, no ##, no *, no _)
   - NO HTML tags
   - Use simple dashes (-) for bullet lists
   - Use plain text line breaks for structure
   - The output will be placed directly into a PDF — any markdown syntax will appear as literal characters and ruin the formatting

2. PRESERVE TRUTH: Keep all factual information. Do NOT invent experiences, skills, companies, or numbers the candidate doesn't have.

3. ENHANCE IMPACT:
   - Start every bullet with a powerful action verb (Engineered, Spearheaded, Orchestrated, Delivered, Architected)
   - Add quantified results where the original implies scale (e.g., "managed team" becomes "Led cross-functional team of 8 engineers")
   - Only add numbers that are reasonable inferences from the context — never fabricate
   - Remove filler words and weak phrasing
   - Make every sentence prove competence, not just describe duties

4. TAILOR TO ROLE: Emphasize aspects most relevant to {job_category} positions.

5. MATCH ORIGINAL STRUCTURE: If the original uses bullets, return bullets. If it uses paragraphs, return paragraphs. Keep the same organizational style.

Return ONLY the improved section text. No explanations, no commentary, no JSON wrapping."""

        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=2000,
            )
            enhanced = response.choices[0].message.content.strip()

            # Strip any markdown formatting the AI might have added despite instructions
            enhanced = self._strip_markdown(enhanced)

            logger.info(f"Section '{section_name}' enhanced (length={len(enhanced)})")
            return enhanced
        except Exception as e:
            logger.error(f"Section enhancement failed: {e}")
            return content  # Return original on failure

    def _strip_markdown(self, text: str) -> str:
        """Remove common markdown formatting from text to keep it PDF-safe."""
        # Remove bold markers: **text** or __text__
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        # Remove italic markers: *text* or _text_ (single, not bullets)
        text = re.sub(r'(?<!\w)\*([^*\n]+?)\*(?!\w)', r'\1', text)
        # Remove heading markers: ## text
        text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
        # Convert markdown bullets (* or +) to plain dashes
        text = re.sub(r'^\s*[\*\+]\s+', '- ', text, flags=re.MULTILINE)
        return text

    def _validate_analysis(self, result: dict, job_category: str) -> dict:
        """Ensure the analysis has all required fields with valid values."""
        # Validate whatever sections the AI returned (dynamic)
        sections = result.get("sections", {})
        for name, sec in sections.items():
            sec["score"] = max(0, min(100, int(sec.get("score", 0))))
            if not sec.get("displayName"):
                sec["displayName"] = name.replace("_", " ").title()
            if not sec.get("content"):
                sec["content"] = ""
            # Decode HTML entities (e.g., &amp; → &, &lt; → <)
            sec["content"] = html.unescape(sec["content"])
            sec["displayName"] = html.unescape(sec["displayName"])
            if not sec.get("reasoning"):
                sec["reasoning"] = ""
            if not sec.get("suggestions"):
                sec["suggestions"] = []
            for s in sec["suggestions"]:
                if s.get("priority") not in ("high", "medium", "low"):
                    s["priority"] = "medium"

        result["sections"] = sections

        # Ensure top-level fields
        result["overallScore"] = max(0, min(100, int(result.get("overallScore", 50))))
        result["atsScore"] = max(0, min(100, int(result.get("atsScore", 50))))
        result.setdefault("atsIssues", [])
        result.setdefault("keywordsFound", [])
        result.setdefault("keywordsMissing", [])
        result.setdefault("strengthHighlights", [])
        result.setdefault("criticalImprovements", [])

        # Ensure industry benchmark
        benchmark = result.get("industryBenchmark", {})
        benchmark.setdefault("category", job_category)
        benchmark.setdefault("averageScore", 62)
        benchmark["percentile"] = max(0, min(100, int(benchmark.get("percentile", 50))))
        benchmark.setdefault("topSkillsInDemand", [])
        result["industryBenchmark"] = benchmark

        # Validate contactInfo
        contact = result.get("contactInfo", {})
        contact.setdefault("name", "")
        contact.setdefault("email", None)
        contact.setdefault("phone", None)
        contact.setdefault("location", None)
        contact.setdefault("linkedin", None)
        contact.setdefault("github", None)
        contact.setdefault("portfolio", None)
        other_links = contact.get("otherLinks", [])
        if not isinstance(other_links, list):
            other_links = []
        contact["otherLinks"] = other_links[:5]
        result["contactInfo"] = contact

        # Preserve original section order as an explicit list
        # Use AI-returned sectionOrder if available, otherwise use dict key order
        ai_order = result.get("sectionOrder", [])
        section_keys = list(result.get("sections", {}).keys())
        if ai_order and set(ai_order) == set(section_keys):
            # Re-order the sections dict to match AI-reported order
            result["sections"] = {k: result["sections"][k] for k in ai_order if k in result["sections"]}
        result["originalSectionOrder"] = list(result.get("sections", {}).keys())

        return result

    def _cross_validate_scores(self, result: dict, resume_text: str) -> dict:
        """Light cross-check of AI scores against content heuristics.
        Only caps scores for clearly problematic content (empty, very thin).
        Trusts the AI's scoring for substantive content to allow enhancement gains."""
        text_lower = resume_text.lower()
        sections = result.get("sections", {})

        metrics_pattern = re.compile(
            r'(?:increased|decreased|improved|reduced|saved|grew|managed|led|built|'
            r'generated|achieved|delivered|processed|engineered|spearheaded|orchestrated|'
            r'architected|optimized|streamlined|automated|mentored|scaled)'
            r'.*?\d+'
        )

        for name, sec in sections.items():
            content = sec.get("content", "")
            score = sec.get("score", 0)

            # Only cap truly empty or near-empty sections
            if not content.strip():
                sec["score"] = min(score, 10)
                continue

            if len(content.strip()) < 20:
                sec["score"] = min(score, 40)
                continue

            # Per-section metrics check for experience sections
            name_lower = name.lower()
            if any(kw in name_lower for kw in ["experience", "work", "employment"]):
                section_has_metrics = bool(metrics_pattern.search(content.lower()))
                exp_lines = [l.strip() for l in content.split("\n") if l.strip()]
                if len(exp_lines) < 2:
                    sec["score"] = min(score, 55)
                elif not section_has_metrics and sec["score"] > 85:
                    sec["score"] = min(sec["score"], 85)

            sec["score"] = max(0, min(100, sec["score"]))

        result["sections"] = sections

        # Recalculate overallScore as weighted average of ALL sections
        if sections:
            total_weight = 0
            weighted_sum = 0
            for name, sec in sections.items():
                name_lower = name.lower()
                if any(kw in name_lower for kw in ["experience", "work", "employment", "skill", "technologies"]):
                    weight = 1.5
                elif any(kw in name_lower for kw in ["summary", "objective", "profile", "project"]):
                    weight = 1.2
                elif any(kw in name_lower for kw in ["education", "certification", "training"]):
                    weight = 1.0
                else:
                    weight = 0.8
                weighted_sum += sec["score"] * weight
                total_weight += weight
            result["overallScore"] = max(0, min(100, round(weighted_sum / total_weight))) if total_weight > 0 else 50

        # ATS score floor — use contactInfo dict (populated by AI/vision),
        # NOT regex on OCR text which is unreliable
        ats = result.get("atsScore", 50)
        contact = result.get("contactInfo", {})
        has_email = bool(contact.get("email"))
        has_phone = bool(contact.get("phone"))
        has_name = bool(contact.get("name"))
        standard_headers = sum(1 for h in ["experience", "education", "skills", "summary", "projects"]
                               if h in text_lower or h.title() in resume_text)
        ats_floor = 20 + (15 if has_email else 0) + (10 if has_phone else 0) + (standard_headers * 5)
        result["atsScore"] = max(0, min(100, max(ats, min(ats_floor, 100))))

        # Correct false ATS issues — if contactInfo has data (from AI/vision),
        # remove false positives that claim contact info is missing
        if has_email or has_phone or has_name:
            contact_false_positives = [
                "missing contact", "no contact", "contact information",
                "no email", "no phone", "missing email", "missing phone",
                "missing candidate", "candidate name", "missing name",
                "missing location", "no location",
                "linkedin", "github", "profile url",
            ]
            result["atsIssues"] = [
                issue for issue in result.get("atsIssues", [])
                if not any(fp in issue.lower() for fp in contact_false_positives)
            ]
            result["criticalImprovements"] = [
                imp for imp in result.get("criticalImprovements", [])
                if not any(fp in imp.lower() for fp in contact_false_positives)
            ]

        logger.info(f"Cross-validated: overall={result['overallScore']}, ats={result['atsScore']}, "
                     f"contact_name={has_name}, contact_email={has_email}, contact_phone={has_phone}, "
                     f"sections={list(sections.keys())}")
        return result

    def _fallback_analysis(self, resume_text: str, job_category: str) -> dict:
        """Generate a basic analysis when AI fails. Detects sections dynamically."""
        has_text = len(resume_text.strip()) > 100
        base_score = 45 if has_text else 10

        sections = {}
        common_headings = [
            "summary", "objective", "profile",
            "experience", "work experience", "employment",
            "education", "academic",
            "skills", "technical skills", "technologies",
            "projects", "portfolio",
            "certifications", "licenses",
            "achievements", "awards",
            "publications", "research",
            "volunteer", "extracurricular",
        ]

        text_lower = resume_text.lower()
        for heading in common_headings:
            if heading in text_lower:
                key = heading.replace(" ", "_")
                sections[key] = {
                    "displayName": heading.title(),
                    "content": f"[{heading.title()} section detected]",
                    "score": base_score + 10,
                    "reasoning": "AI analysis unavailable — basic detection only",
                    "suggestions": [{"text": f"Re-analyze to get detailed suggestions", "priority": "medium"}]
                }

        if not sections:
            sections["resume_content"] = {
                "displayName": "Resume Content",
                "content": resume_text[:500] if has_text else "",
                "score": base_score,
                "reasoning": "Could not detect individual sections",
                "suggestions": [{"text": "Re-analyze for detailed feedback", "priority": "medium"}]
            }

        return {
            "sections": sections,
            "originalSectionOrder": list(sections.keys()),
            "contactInfo": {
                "name": "", "email": None, "phone": None, "location": None,
                "linkedin": None, "github": None, "portfolio": None, "otherLinks": []
            },
            "overallScore": base_score,
            "atsScore": base_score,
            "atsIssues": ["Could not perform detailed ATS analysis"],
            "keywordsFound": [],
            "keywordsMissing": [],
            "industryBenchmark": {
                "category": job_category,
                "averageScore": 62,
                "percentile": 40,
                "topSkillsInDemand": []
            },
            "strengthHighlights": ["Resume uploaded successfully"],
            "criticalImprovements": ["Re-run analysis for detailed feedback"]
        }
