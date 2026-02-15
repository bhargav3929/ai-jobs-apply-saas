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

        system_prompt = """You are an elite resume analyst hired by Fortune 500 companies to evaluate candidates. Analyze this resume with surgical precision.

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
    "phone": "+1-234-567-8900 or null",
    "location": "City, State or null",
    "linkedin": "https://linkedin.com/in/... or null",
    "github": "https://github.com/... or null",
    "portfolio": "https://... or null",
    "otherLinks": ["any other URLs found in the resume"]
  },
  "sections": {
    "<actual_section_key>": {
      "displayName": "Human-readable section title exactly as it appears in the resume",
      "content": "The full extracted text content of this section",
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
  "strengthHighlights": ["strength1", "strength2", "strength3"],
  "criticalImprovements": ["improvement1", "improvement2"]
}

=== SECTION DETECTION RULES ===

1. Scan the ENTIRE text (not just top-to-bottom) because PDF extraction may scramble the order.
2. Use the EXACT heading from the resume as the key (lowercase, spaces replaced with underscores).
   Examples: "professional_summary", "work_experience", "technical_skills", "academic_projects", "achievements", "publications", "volunteer_work", "relevant_coursework"
3. The "displayName" field must match the heading EXACTLY as written in the resume.
4. Only include sections that actually exist. Do NOT invent sections.
5. If the resume has no clear section headings, group content logically and name them descriptively.

=== SECTION ORDERING (VERY IMPORTANT) ===

Return sections in this standard resume order. Only include sections that actually exist in the resume:
1. Professional Summary / Objective / Profile (any introductory paragraph)
2. Work Experience / Employment / Professional Experience
3. Projects / Academic Projects / Portfolio
4. Technical Skills / Skills / Core Competencies
5. Education / Academic Background
6. Certifications / Licenses / Training
7. Awards / Achievements / Honors
8. Publications / Research
9. Volunteer Work / Extracurricular Activities
10. Any other sections not listed above

This ordering is CRITICAL for ATS compliance and recruiter readability. Recruiters expect to see experience near the top, not education first.

=== UNTITLED CONTENT (VERY IMPORTANT) ===

Many resumes have an introductory paragraph (professional summary, objective statement, or career overview) that appears at the top of the resume WITHOUT any section heading. This is extremely common. You MUST:
- Look for any standalone paragraph that reads like a professional summary, career objective, or personal statement.
- If found, include it as a section with key "professional_summary" and displayName "Professional Summary".
- Do NOT skip it just because it lacks a heading — this paragraph is one of the most important parts of a resume.

=== CONTACT INFORMATION (VERY IMPORTANT) ===

Scan the ENTIRE text — header, body, AND footer — for ALL contact information. Return EVERYTHING you find in the "contactInfo" JSON field:
- Name: the candidate's full name
- Email: anything containing @ (e.g., name@email.com)
- Phone: any sequence of 7-15 digits (with optional +, spaces, hyphens, parentheses) — supports US, Indian, UK, and all international formats
- Location: city names, state/country references
- LinkedIn: any linkedin.com URL
- GitHub: any github.com URL
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
- Professionally polished, concise, and metric-driven content should score 80-95+ in Content Quality. Do not under-score well-written content."""

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

        # Enforce standard section ordering
        result["sections"] = self._enforce_section_order(result.get("sections", {}))

        return result

    # Priority map for standard resume section ordering
    SECTION_ORDER_PRIORITY = {
        "summary": 0, "objective": 0, "profile": 0, "about": 0, "overview": 0,
        "experience": 1, "work": 1, "employment": 1, "professional": 1,
        "project": 2, "portfolio": 2,
        "skill": 3, "competenc": 3, "technologies": 3, "technical": 3,
        "education": 4, "academic": 4, "degree": 4,
        "certification": 5, "license": 5, "training": 5,
        "award": 6, "achievement": 6, "honor": 6,
        "publication": 7, "research": 7,
        "volunteer": 8, "extracurricular": 8, "interest": 8, "hobby": 8,
    }

    def _enforce_section_order(self, sections: dict) -> dict:
        """Reorder sections dict to follow standard resume section ordering."""
        if not sections:
            return sections

        def _get_priority(key: str) -> int:
            key_lower = key.lower()
            for keyword, priority in self.SECTION_ORDER_PRIORITY.items():
                if keyword in key_lower:
                    return priority
            return 9  # Unrecognized sections go last

        sorted_keys = sorted(sections.keys(), key=_get_priority)
        return {k: sections[k] for k in sorted_keys}

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
