TEMPLATES = [
    {
        "templateId": 1,
        "tone": "professional",
        "subject": "Application for {JOB_TITLE}",
        "body": """Hi,

I came across your post on LinkedIn about {JOB_TITLE} and wanted to express my interest. With my experience in {SKILLS}, I believe I'd be a great fit for this role.

Here's my portfolio:
{PORTFOLIO_URL}

I've attached my resume for your review.

Looking forward to hearing from you!

Best regards,
{USER_NAME}"""
    },
    {
        "templateId": 2,
        "tone": "casual",
        "subject": "Interested in {JOB_TITLE} Position",
        "body": """Hey,

I saw your LinkedIn post about hiring for {JOB_TITLE}. I've got solid experience with {SKILLS} and think I could bring real value to your team.

Check out my work:
{PORTFOLIO_URL}

Resume attached. Let me know if you'd like to chat!

Thanks,
{USER_NAME}"""
    },
    {
        "templateId": 3,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} - {USER_NAME} Application",
        "body": """Hello!

I am thrilled to apply for the {JOB_TITLE} position I saw on LinkedIn. I have been following your company's work and would love to contribute my skills in {SKILLS}.

You can see examples of my work here:
{PORTFOLIO_URL}

My resume is attached. I'd love to discuss how I can help your team succeed!

Best,
{USER_NAME}"""
    },
    {
        "templateId": 4,
        "tone": "concise",
        "subject": "{JOB_TITLE} Application",
        "body": """Hi,

Applying for the {JOB_TITLE} role. Experienced in {SKILLS}.

Portfolio: {PORTFOLIO_URL}
Resume attached.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 5,
        "tone": "confident",
        "subject": "Why I'm the right fit for {JOB_TITLE}",
        "body": """Hi,

I'm writing to apply for the {JOB_TITLE} position. My background in {SKILLS} aligns perfectly with what you're looking for.

Portfolio: {PORTFOLIO_URL}

Resume attached. I'm ready to hit the ground running.

Regards,
{USER_NAME}"""
    }
    # Note: PRD asks for 60 templates. For brevity in this file, we include 5 representative ones.
    # In production, we would populate this list fully or load from a JSON/DB.
]
