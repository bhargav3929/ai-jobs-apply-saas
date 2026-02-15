import logging
from openai import OpenAI
import random
import json
from core.firebase import db
from core.settings import GROQ_API_KEY

logger = logging.getLogger("email_generator")


def generate_email_with_ai(user: dict, job: dict) -> dict:
    """
    Generate personalized email using random template + AI.
    Dynamically includes portfolio/github links based on user data.
    """

    user_name = user.get("name", "Applicant")
    job_title = job.get("title", job.get("jobCategory", "Role"))
    logger.info(f"Generating email for user='{user_name}' job='{job_title[:60]}'")

    # Step 1: Get random template (1-60)
    template_id = random.randint(1, 60)
    template = {}
    logger.info(f"Selected template ID: {template_id}")

    if db:
        try:
            template_doc = db.collection("email_templates").document(str(template_id)).get()
            if template_doc.exists:
                template = template_doc.to_dict()
                logger.info(f"Template {template_id} loaded from Firestore (keys: {list(template.keys())})")
            else:
                logger.warning(f"Template {template_id} NOT FOUND in Firestore — using fallback")
        except Exception as e:
            logger.error(f"Error fetching template {template_id}: {e}")
    else:
        logger.warning("DB not available — using fallback template")

    if not template:
        template = {
            "body": "Hi,\n\nI came across your post about {JOB_TITLE}. I have experience in {SKILLS}.\n\n{LINKS_SECTION}\n\nI've attached my resume for your review.\n\nBest regards,\n{USER_NAME}"
        }
        logger.info("Using hardcoded fallback template")

    # Step 1b: Use enhanced resume text if available (from resume analysis page edits)
    resume_override = user.get("resumeTextOverride")
    if resume_override:
        logger.info(f"Using resumeTextOverride for user='{user_name}' (length={len(resume_override)})")

    # Step 2: Build user context with links
    post_text = job.get("postText", "")[:1000]
    template_body = template.get("body", "")
    user_skills = user.get("skills", [])

    # Build links context for the AI
    links = user.get("extractedLinks", {})
    github_link = links.get("github", "")
    portfolio_link = links.get("portfolio", "")
    logger.info(f"User links: github={bool(github_link)}, portfolio={bool(portfolio_link)}, skills={user_skills[:5]}")

    links_context = ""
    if github_link and portfolio_link:
        links_context = f"User has a GitHub profile: {github_link} AND a portfolio: {portfolio_link}. Include BOTH in the email naturally."
    elif github_link:
        links_context = f"User has a GitHub profile: {github_link}. Include it in the email naturally (e.g., 'You can check out my work on GitHub: {github_link}')."
    elif portfolio_link:
        links_context = f"User has a portfolio: {portfolio_link}. Include it in the email naturally (e.g., 'You can view my work here: {portfolio_link}')."
    else:
        links_context = "User has NO portfolio or GitHub link. Do NOT mention portfolio, GitHub, or any placeholder URLs. Do NOT invent links. Simply skip any link references."

    skills_str = ", ".join(user_skills[:8]) if isinstance(user_skills, list) and user_skills else "relevant technologies"

    # Include resume context if enhanced version is available
    resume_context = ""
    if resume_override:
        resume_context = f"\n\nENHANCED RESUME CONTEXT (use this to personalize the email):\n{resume_override[:2000]}"

    # Step 3: Use AI to generate the email
    logger.info(f"Calling Groq API (model=openai/gpt-oss-120b, postText length={len(post_text)})")
    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )

    prompt = f"""You are writing a job application email on behalf of {user_name}.

JOB POST:
{post_text}

TEMPLATE STYLE (use as inspiration for tone, not copy verbatim):
{template_body}

USER DETAILS:
- Name: {user_name}
- Key Skills: {skills_str}
- {links_context}{resume_context}

RULES:
1. Write a natural, personalized email that references specifics from the job post
2. Keep it concise (4-8 sentences in the body, not counting greeting/signature)
3. If the user has links (GitHub/portfolio), weave them in naturally — don't just dump them at the end
4. If the user has NO links, do NOT include any URLs or placeholders like {{PORTFOLIO_URL}} — skip link mentions entirely
5. Do NOT include placeholder text like {{JOB_TITLE}} or {{SKILLS}} — use actual values
6. The resume is attached separately, so mention "resume attached" briefly
7. End with the user's name
8. Write a compelling subject line that mentions the specific role from the job post

Return ONLY valid JSON:
{{
    "subject": "...",
    "body": "..."
}}"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        raw_content = response.choices[0].message.content
        logger.info(f"AI response received (length={len(raw_content)})")
        logger.info(f"AI usage: prompt_tokens={getattr(response.usage, 'prompt_tokens', '?')}, completion_tokens={getattr(response.usage, 'completion_tokens', '?')}")

        email_json = json.loads(raw_content)
        email_json["templateId"] = template_id
        logger.info(f"Parsed email: subject='{email_json.get('subject', '')[:80]}', bodyLength={len(email_json.get('body', ''))}")

        # Safety check: if user has no links, strip any hallucinated URLs
        if not github_link and not portfolio_link:
            body = email_json.get("body", "")
            cleaned_lines = []
            stripped_count = 0
            for line in body.split("\n"):
                line_lower = line.lower()
                if any(p in line_lower for p in ["{portfolio", "{github", "portfolio_url", "github_url", "your-portfolio", "yourportfolio"]):
                    stripped_count += 1
                    continue
                cleaned_lines.append(line)
            if stripped_count > 0:
                logger.warning(f"Stripped {stripped_count} hallucinated link lines from email body")
            email_json["body"] = "\n".join(cleaned_lines)

        logger.info(f"Email generation SUCCESS for user='{user_name}'")
        return email_json

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error from AI response: {e}")
        logger.error(f"Raw AI response: {raw_content[:500]}")
    except Exception as e:
        logger.error(f"AI email generation FAILED: {type(e).__name__}: {e}")

    # Fallback
    logger.warning(f"Using FALLBACK email for user='{user_name}'")
    fallback_body = f"Hi,\n\nI am interested in the role described in your LinkedIn post.\n\n"
    if github_link:
        fallback_body += f"You can check out my work on GitHub: {github_link}\n\n"
    if portfolio_link:
        fallback_body += f"My portfolio: {portfolio_link}\n\n"
    fallback_body += f"I've attached my resume for your review.\n\nBest regards,\n{user_name}"

    return {
        "subject": f"Application for {job.get('title', job.get('jobCategory', 'Role'))}",
        "body": fallback_body,
        "templateId": template_id
    }
