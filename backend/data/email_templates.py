"""
70 email templates across 7 tones (10 each):
professional, casual, enthusiastic, concise, confident, warm, direct

Anti-spam design:
- Varied structure: links inline vs end vs omitted
- Resume mention early vs late
- Skills upfront vs woven in
- Varied greeting/sign-off/length (3-8 sentences)
- Placeholders: {JOB_TITLE}, {SKILLS}, {USER_NAME}, {PORTFOLIO_URL}, {GITHUB_URL}
"""

TEMPLATES = [
    # ═══════════════════════════════════════
    # PROFESSIONAL (1-10)
    # ═══════════════════════════════════════
    {
        "templateId": 1,
        "tone": "professional",
        "subject": "Application for {JOB_TITLE}",
        "body": """Dear Hiring Manager,

I came across your posting for {JOB_TITLE} and wanted to express my interest. My background in {SKILLS} aligns well with the requirements outlined.

I have attached my resume for your consideration. You can also review my work at {PORTFOLIO_URL}.

I would welcome the opportunity to discuss how my experience can contribute to your team.

Best regards,
{USER_NAME}"""
    },
    {
        "templateId": 2,
        "tone": "professional",
        "subject": "Re: {JOB_TITLE} Opening",
        "body": """Hello,

I am writing to apply for the {JOB_TITLE} position. With hands-on experience in {SKILLS}, I am confident in my ability to deliver results in this role.

My portfolio ({PORTFOLIO_URL}) and GitHub ({GITHUB_URL}) showcase relevant projects. Resume attached for your review.

Thank you for your time and consideration.

Sincerely,
{USER_NAME}"""
    },
    {
        "templateId": 3,
        "tone": "professional",
        "subject": "{JOB_TITLE} — Application from {USER_NAME}",
        "body": """Hello,

I noticed your {JOB_TITLE} opening and believe my skill set in {SKILLS} would be a strong match. I have attached my resume which details my relevant experience.

I look forward to the possibility of contributing to your organization.

Kind regards,
{USER_NAME}"""
    },
    {
        "templateId": 4,
        "tone": "professional",
        "subject": "Interest in {JOB_TITLE} Role",
        "body": """Dear Team,

I am reaching out regarding the {JOB_TITLE} position. My professional experience spans {SKILLS}, and I have consistently delivered quality work in similar roles.

Please find my resume attached. For additional context on my work, you may visit {GITHUB_URL}.

I appreciate your consideration and look forward to hearing from you.

Best regards,
{USER_NAME}"""
    },
    {
        "templateId": 5,
        "tone": "professional",
        "subject": "Application: {JOB_TITLE}",
        "body": """Hello,

I would like to formally apply for the {JOB_TITLE} role. My expertise in {SKILLS} has been honed through multiple projects, some of which are available at {PORTFOLIO_URL}.

My resume is attached for your reference. I am available for a discussion at your earliest convenience.

Regards,
{USER_NAME}"""
    },
    {
        "templateId": 6,
        "tone": "professional",
        "subject": "{JOB_TITLE} Position — {USER_NAME}",
        "body": """Dear Hiring Team,

I saw the {JOB_TITLE} listing and it closely matches my background. I bring experience in {SKILLS} and a track record of delivering measurable results.

Resume attached. I would appreciate the chance to discuss this opportunity further.

Thank you,
{USER_NAME}"""
    },
    {
        "templateId": 7,
        "tone": "professional",
        "subject": "Qualified Candidate for {JOB_TITLE}",
        "body": """Hello,

I am interested in the {JOB_TITLE} opportunity. My resume, attached here, outlines my experience with {SKILLS}.

You can view my GitHub profile at {GITHUB_URL} and my portfolio at {PORTFOLIO_URL} for examples of my recent work.

I look forward to your response.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 8,
        "tone": "professional",
        "subject": "Regarding {JOB_TITLE} Opening",
        "body": """Dear Sir/Madam,

I wish to apply for the {JOB_TITLE} role currently open at your company. My skills in {SKILLS} make me a suitable candidate for this position.

I have attached my resume for your review and would be glad to elaborate on my qualifications in an interview.

Warm regards,
{USER_NAME}"""
    },
    {
        "templateId": 9,
        "tone": "professional",
        "subject": "{JOB_TITLE} — Resume Attached",
        "body": """Hello,

Please consider my application for the {JOB_TITLE} position. I have built expertise in {SKILLS} through hands-on project work and professional experience.

My portfolio is available at {PORTFOLIO_URL}. Resume is attached.

Looking forward to connecting.

Respectfully,
{USER_NAME}"""
    },
    {
        "templateId": 10,
        "tone": "professional",
        "subject": "Application for {JOB_TITLE} — {USER_NAME}",
        "body": """Hello,

I am applying for {JOB_TITLE}. My professional background in {SKILLS} positions me well for this role, and I am eager to bring that experience to your team.

Resume attached. Please feel free to reach out if you require any additional information.

Best regards,
{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # CASUAL (11-20)
    # ═══════════════════════════════════════
    {
        "templateId": 11,
        "tone": "casual",
        "subject": "Interested in {JOB_TITLE} Position",
        "body": """Hey there,

I saw your post about {JOB_TITLE} and thought it looked like a great fit. I have solid experience with {SKILLS} and would love to chat about the role.

Here's my portfolio: {PORTFOLIO_URL}

Resume attached. Let me know if you'd like to connect!

Cheers,
{USER_NAME}"""
    },
    {
        "templateId": 12,
        "tone": "casual",
        "subject": "Hey — {JOB_TITLE} sounds awesome",
        "body": """Hi!

Just came across the {JOB_TITLE} opening and got pretty excited. I work with {SKILLS} daily and think I could add real value to your team.

Check out some of my work on GitHub: {GITHUB_URL}

Attached my resume too. Would love to chat!

Thanks,
{USER_NAME}"""
    },
    {
        "templateId": 13,
        "tone": "casual",
        "subject": "Quick note about {JOB_TITLE}",
        "body": """Hey,

I noticed you're hiring for {JOB_TITLE}. I've been working with {SKILLS} for a while now and this seems like it'd be a great match.

Resume's attached — happy to hop on a quick call whenever works for you.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 14,
        "tone": "casual",
        "subject": "{JOB_TITLE} — count me interested!",
        "body": """Hi there,

Your {JOB_TITLE} posting caught my eye. I've been building things with {SKILLS} and love solving the kind of problems this role involves.

My portfolio: {PORTFOLIO_URL}
GitHub: {GITHUB_URL}

Resume attached — let's talk!

{USER_NAME}"""
    },
    {
        "templateId": 15,
        "tone": "casual",
        "subject": "Would love to join as {JOB_TITLE}",
        "body": """Hey,

Saw the {JOB_TITLE} role and it honestly sounds like something I'd thrive in. My experience with {SKILLS} lines up really well.

I've attached my resume. Let me know if there's a good time to chat.

Thanks!
{USER_NAME}"""
    },
    {
        "templateId": 16,
        "tone": "casual",
        "subject": "Reaching out for {JOB_TITLE}",
        "body": """Hi,

I came across the {JOB_TITLE} opening and wanted to throw my hat in the ring. I've got hands-on experience with {SKILLS} and some cool projects to show for it.

Portfolio here: {PORTFOLIO_URL}

Resume's attached. Looking forward to hearing from you!

{USER_NAME}"""
    },
    {
        "templateId": 17,
        "tone": "casual",
        "subject": "Interested in {JOB_TITLE}!",
        "body": """Hey,

I'd love to apply for the {JOB_TITLE} role. I've been working with {SKILLS} and think my background could be a solid fit for what you're building.

Attached my resume for you. Happy to chat anytime.

Cheers,
{USER_NAME}"""
    },
    {
        "templateId": 18,
        "tone": "casual",
        "subject": "{JOB_TITLE} role — quick intro",
        "body": """Hi!

Just a quick note to say I'm interested in the {JOB_TITLE} position. I work with {SKILLS} and have been looking for exactly this kind of opportunity.

You can check out my GitHub at {GITHUB_URL}. Resume attached!

Talk soon,
{USER_NAME}"""
    },
    {
        "templateId": 19,
        "tone": "casual",
        "subject": "Hey, applying for {JOB_TITLE}",
        "body": """Hey,

Spotted the {JOB_TITLE} role and had to reach out. {SKILLS} are right in my wheelhouse, and I'd love to bring that to your team.

Resume's attached. Let me know what you think!

Best,
{USER_NAME}"""
    },
    {
        "templateId": 20,
        "tone": "casual",
        "subject": "Applying for {JOB_TITLE} — let's connect",
        "body": """Hi there,

I saw you're looking for a {JOB_TITLE} and wanted to get in touch. I have experience with {SKILLS} and a few projects that are relevant to what you're doing.

Here's my portfolio: {PORTFOLIO_URL}. Resume attached.

Would love to chat!
{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # ENTHUSIASTIC (21-30)
    # ═══════════════════════════════════════
    {
        "templateId": 21,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} — I'd love to contribute!",
        "body": """Hello!

I am thrilled to apply for the {JOB_TITLE} role! I have been following your company's work and would love to contribute my skills in {SKILLS}.

You can see examples of my work here: {PORTFOLIO_URL}

My resume is attached. I would love to discuss how I can help your team succeed!

Best,
{USER_NAME}"""
    },
    {
        "templateId": 22,
        "tone": "enthusiastic",
        "subject": "Excited about {JOB_TITLE}!",
        "body": """Hi there!

I just saw your {JOB_TITLE} posting and I am genuinely excited about this opportunity! My experience in {SKILLS} is exactly what this role calls for.

I have been working on some great projects — check them out at {GITHUB_URL}.

Resume attached. I cannot wait to hear from you!

Best,
{USER_NAME}"""
    },
    {
        "templateId": 23,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} — This is exactly what I've been looking for!",
        "body": """Hello!

Your {JOB_TITLE} posting is the perfect match for what I love doing. I have deep experience with {SKILLS} and a real passion for this kind of work.

My portfolio speaks for itself: {PORTFOLIO_URL}
GitHub: {GITHUB_URL}

Resume is attached. I would be absolutely thrilled to join your team!

Warmly,
{USER_NAME}"""
    },
    {
        "templateId": 24,
        "tone": "enthusiastic",
        "subject": "Can't wait to apply for {JOB_TITLE}!",
        "body": """Hi!

When I saw the {JOB_TITLE} opening, I knew I had to reach out immediately! My background in {SKILLS} has prepared me perfectly for this role.

Resume attached. I am incredibly excited about the possibility of contributing to your team!

Best regards,
{USER_NAME}"""
    },
    {
        "templateId": 25,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} — Let me show you what I can do!",
        "body": """Hello!

I absolutely love the sound of the {JOB_TITLE} position! With my skills in {SKILLS}, I know I can make a meaningful impact from day one.

Take a look at my work: {PORTFOLIO_URL}

Resume is attached. I am so looking forward to connecting with you!

Excited to hear back,
{USER_NAME}"""
    },
    {
        "templateId": 26,
        "tone": "enthusiastic",
        "subject": "Passionate about {JOB_TITLE}!",
        "body": """Hi!

The {JOB_TITLE} role is right up my alley! I have been honing my skills in {SKILLS} and am eager to put them to work for your team.

My GitHub ({GITHUB_URL}) has some projects that are directly relevant. Resume attached!

Looking forward to this exciting opportunity!
{USER_NAME}"""
    },
    {
        "templateId": 27,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} application — fired up!",
        "body": """Hello!

I am writing with great enthusiasm about the {JOB_TITLE} position. The role description resonated with me deeply — {SKILLS} are the core of what I do and what I love.

Resume attached. Let us set up a call — I have so many ideas to share!

Best,
{USER_NAME}"""
    },
    {
        "templateId": 28,
        "tone": "enthusiastic",
        "subject": "This {JOB_TITLE} role was made for me!",
        "body": """Hi there!

I could not be more excited about the {JOB_TITLE} opportunity! My experience with {SKILLS} aligns perfectly, and I am ready to hit the ground running.

Portfolio: {PORTFOLIO_URL}

I have attached my resume. Truly looking forward to hearing from you!

{USER_NAME}"""
    },
    {
        "templateId": 29,
        "tone": "enthusiastic",
        "subject": "Applying with excitement for {JOB_TITLE}",
        "body": """Hello!

I just had to apply the moment I saw the {JOB_TITLE} listing. This is exactly the kind of role where my {SKILLS} expertise can shine!

Check out my work at {PORTFOLIO_URL} and {GITHUB_URL}.

Resume is attached. I am ready and eager to discuss this further!

Warmly,
{USER_NAME}"""
    },
    {
        "templateId": 30,
        "tone": "enthusiastic",
        "subject": "{JOB_TITLE} — thrilled to apply!",
        "body": """Hi!

What an incredible opportunity! I am applying for {JOB_TITLE} with a lot of excitement. {SKILLS} are the foundation of my work, and I am confident I can deliver outstanding results.

Resume attached. I would love to chat about how I can contribute!

All the best,
{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # CONCISE (31-40)
    # ═══════════════════════════════════════
    {
        "templateId": 31,
        "tone": "concise",
        "subject": "{JOB_TITLE} Application",
        "body": """Hi,

Applying for {JOB_TITLE}. Experienced in {SKILLS}. Resume attached.

Portfolio: {PORTFOLIO_URL}

Best,
{USER_NAME}"""
    },
    {
        "templateId": 32,
        "tone": "concise",
        "subject": "Re: {JOB_TITLE}",
        "body": """Hello,

Interested in the {JOB_TITLE} position. My background in {SKILLS} is a strong fit. Resume attached for your review.

GitHub: {GITHUB_URL}

Regards,
{USER_NAME}"""
    },
    {
        "templateId": 33,
        "tone": "concise",
        "subject": "{JOB_TITLE} — {USER_NAME}",
        "body": """Hi,

{JOB_TITLE} role caught my attention. I work with {SKILLS}. Resume attached.

{USER_NAME}"""
    },
    {
        "templateId": 34,
        "tone": "concise",
        "subject": "Application: {JOB_TITLE}",
        "body": """Hello,

I am applying for {JOB_TITLE}. Skilled in {SKILLS}. I have attached my resume. Available for a call at your convenience.

{USER_NAME}"""
    },
    {
        "templateId": 35,
        "tone": "concise",
        "subject": "{JOB_TITLE} candidate",
        "body": """Hi,

Saw your {JOB_TITLE} posting. My skills: {SKILLS}. Resume attached.

Portfolio: {PORTFOLIO_URL}
GitHub: {GITHUB_URL}

Thanks,
{USER_NAME}"""
    },
    {
        "templateId": 36,
        "tone": "concise",
        "subject": "{JOB_TITLE} role",
        "body": """Hello,

Applying for {JOB_TITLE}. Experience in {SKILLS} with proven results. Resume attached.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 37,
        "tone": "concise",
        "subject": "{JOB_TITLE} — interested",
        "body": """Hi,

Quick note: I am interested in {JOB_TITLE}. Background in {SKILLS}. Resume attached. Happy to discuss further.

{USER_NAME}"""
    },
    {
        "templateId": 38,
        "tone": "concise",
        "subject": "For: {JOB_TITLE}",
        "body": """Hi,

{JOB_TITLE} matches my experience with {SKILLS}. Portfolio: {PORTFOLIO_URL}. Resume attached.

Regards,
{USER_NAME}"""
    },
    {
        "templateId": 39,
        "tone": "concise",
        "subject": "{JOB_TITLE} interest",
        "body": """Hello,

Interested in {JOB_TITLE}. Strong in {SKILLS}. Check my GitHub: {GITHUB_URL}. Resume attached.

Thanks,
{USER_NAME}"""
    },
    {
        "templateId": 40,
        "tone": "concise",
        "subject": "Applying — {JOB_TITLE}",
        "body": """Hi,

I would like to apply for {JOB_TITLE}. My core skills include {SKILLS}. Resume attached for your reference.

{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # CONFIDENT (41-50)
    # ═══════════════════════════════════════
    {
        "templateId": 41,
        "tone": "confident",
        "subject": "Why I'm the right fit for {JOB_TITLE}",
        "body": """Hi,

I am writing to apply for {JOB_TITLE}. My background in {SKILLS} aligns perfectly with what you are looking for.

Portfolio: {PORTFOLIO_URL}

Resume attached. I am ready to hit the ground running.

Regards,
{USER_NAME}"""
    },
    {
        "templateId": 42,
        "tone": "confident",
        "subject": "{JOB_TITLE} — I can deliver",
        "body": """Hello,

I saw the {JOB_TITLE} role and I know I am the right person for it. I have deep expertise in {SKILLS} and a proven track record of delivering results.

My work on GitHub ({GITHUB_URL}) demonstrates the quality I bring. Resume attached.

Let's connect.
{USER_NAME}"""
    },
    {
        "templateId": 43,
        "tone": "confident",
        "subject": "Strong candidate for {JOB_TITLE}",
        "body": """Hi,

I bring exactly what your {JOB_TITLE} role requires: hands-on experience with {SKILLS} and a results-driven mindset.

Portfolio: {PORTFOLIO_URL}
Resume attached.

I am confident I can make an immediate impact on your team.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 44,
        "tone": "confident",
        "subject": "{JOB_TITLE} — proven experience",
        "body": """Hello,

The {JOB_TITLE} position is well suited to my skillset. I have built and shipped production-quality work using {SKILLS}, and I am ready to do the same for your team.

Resume attached. Let me know when we can schedule a conversation.

{USER_NAME}"""
    },
    {
        "templateId": 45,
        "tone": "confident",
        "subject": "I can add value as {JOB_TITLE}",
        "body": """Hi,

I noticed the {JOB_TITLE} opening and I am certain I can contribute meaningfully. My expertise in {SKILLS} is backed by real-world results.

Check my work: {PORTFOLIO_URL} and {GITHUB_URL}. Resume attached.

Looking forward to discussing this.
{USER_NAME}"""
    },
    {
        "templateId": 46,
        "tone": "confident",
        "subject": "{JOB_TITLE} — let's make it happen",
        "body": """Hello,

Your {JOB_TITLE} listing describes exactly what I do best. {SKILLS} are my core competencies, and I have the track record to back it up.

Resume attached. I would welcome a chance to prove my value.

Regards,
{USER_NAME}"""
    },
    {
        "templateId": 47,
        "tone": "confident",
        "subject": "Right fit for {JOB_TITLE}",
        "body": """Hi,

I am applying for {JOB_TITLE} with full confidence that my {SKILLS} expertise will be an asset. I have consistently exceeded expectations in similar roles.

My GitHub: {GITHUB_URL}. Resume attached.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 48,
        "tone": "confident",
        "subject": "{JOB_TITLE} — experienced and ready",
        "body": """Hello,

I bring substantial experience in {SKILLS} to the {JOB_TITLE} role. I have delivered impactful work throughout my career and am ready for this next challenge.

Portfolio: {PORTFOLIO_URL}. Resume attached.

Let's connect.
{USER_NAME}"""
    },
    {
        "templateId": 49,
        "tone": "confident",
        "subject": "{JOB_TITLE} application — strong match",
        "body": """Hi,

I am reaching out because I know I can excel as your {JOB_TITLE}. My experience with {SKILLS} speaks for itself, and I am eager to demonstrate that in person.

Resume attached. Let's set up a conversation.

{USER_NAME}"""
    },
    {
        "templateId": 50,
        "tone": "confident",
        "subject": "Your next {JOB_TITLE}",
        "body": """Hello,

You are looking for a {JOB_TITLE}, and I am looking for this exact opportunity. My work with {SKILLS} has prepared me to deliver from day one.

Resume attached. Portfolio: {PORTFOLIO_URL}.

Regards,
{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # WARM (51-60)
    # ═══════════════════════════════════════
    {
        "templateId": 51,
        "tone": "warm",
        "subject": "Hello from {USER_NAME} — {JOB_TITLE} interest",
        "body": """Hi there,

I hope this message finds you well. I came across the {JOB_TITLE} opening and felt genuinely drawn to it. My experience in {SKILLS} has been a rewarding journey, and I would love to continue it with your team.

I have attached my resume. You can also explore my work at {PORTFOLIO_URL}.

Wishing you a great day!

Warmly,
{USER_NAME}"""
    },
    {
        "templateId": 52,
        "tone": "warm",
        "subject": "A warm hello — interested in {JOB_TITLE}",
        "body": """Hello,

I hope your day is going well! I noticed the {JOB_TITLE} position and it really resonated with me. I have been working with {SKILLS} and enjoy every part of it.

My resume is attached. I would love to learn more about your team and how I might fit in.

Take care,
{USER_NAME}"""
    },
    {
        "templateId": 53,
        "tone": "warm",
        "subject": "{JOB_TITLE} — would love to connect",
        "body": """Hi,

I hope this finds you well. The {JOB_TITLE} opportunity really caught my attention, and I would love to be considered. My skills in {SKILLS} have helped me build some meaningful projects.

GitHub: {GITHUB_URL}
Portfolio: {PORTFOLIO_URL}

Resume attached. I appreciate your time!

Kindly,
{USER_NAME}"""
    },
    {
        "templateId": 54,
        "tone": "warm",
        "subject": "Reaching out with warmth — {JOB_TITLE}",
        "body": """Hello,

I wanted to send a thoughtful note about the {JOB_TITLE} role. I have been working with {SKILLS} and have found genuine fulfillment in this line of work.

My resume is attached. I would be grateful for the chance to chat.

All the best,
{USER_NAME}"""
    },
    {
        "templateId": 55,
        "tone": "warm",
        "subject": "{JOB_TITLE} — hoping to connect",
        "body": """Hi there,

Your {JOB_TITLE} posting brought a smile to my face — it sounds like a wonderful role. I bring experience in {SKILLS} and a genuine enthusiasm for the work.

Here is my portfolio: {PORTFOLIO_URL}. Resume attached.

I hope to hear from you soon!

Best wishes,
{USER_NAME}"""
    },
    {
        "templateId": 56,
        "tone": "warm",
        "subject": "Hello — {JOB_TITLE} application",
        "body": """Hi,

I hope you are having a great week. I am writing about the {JOB_TITLE} role — it really speaks to my background in {SKILLS}.

I have attached my resume and would truly appreciate the opportunity to learn more about your team.

With warm regards,
{USER_NAME}"""
    },
    {
        "templateId": 57,
        "tone": "warm",
        "subject": "Interested in {JOB_TITLE} — a friendly intro",
        "body": """Hello,

Just wanted to introduce myself. I am {USER_NAME}, and I am very interested in the {JOB_TITLE} role. I have been building my skills in {SKILLS} and am looking for a team where I can grow and contribute.

My GitHub: {GITHUB_URL}. Resume attached.

I hope we get to connect!

Warmly,
{USER_NAME}"""
    },
    {
        "templateId": 58,
        "tone": "warm",
        "subject": "{JOB_TITLE} — looking forward to hearing from you",
        "body": """Hi,

I came across the {JOB_TITLE} position and it felt like the right fit. My experience with {SKILLS} has been both challenging and rewarding, and I am excited about continuing that journey.

Resume attached. Thank you for taking the time to consider my application.

Kind regards,
{USER_NAME}"""
    },
    {
        "templateId": 59,
        "tone": "warm",
        "subject": "A note about {JOB_TITLE}",
        "body": """Hello,

I hope you are doing well! I wanted to express my interest in the {JOB_TITLE} opening. Working with {SKILLS} has been a passion of mine, and I would love to bring that energy to your team.

Portfolio: {PORTFOLIO_URL}. Resume is attached.

Wishing you all the best,
{USER_NAME}"""
    },
    {
        "templateId": 60,
        "tone": "warm",
        "subject": "{JOB_TITLE} — grateful for the opportunity",
        "body": """Hi there,

Thank you for posting the {JOB_TITLE} role. I am genuinely interested and believe my background in {SKILLS} could be a great addition to your team.

Resume attached. I am looking forward to the possibility of working together.

Take care,
{USER_NAME}"""
    },

    # ═══════════════════════════════════════
    # DIRECT (61-70)
    # ═══════════════════════════════════════
    {
        "templateId": 61,
        "tone": "direct",
        "subject": "{JOB_TITLE} — application",
        "body": """Hi,

I want to apply for {JOB_TITLE}. I have experience in {SKILLS} and can start contributing quickly. Resume attached.

{USER_NAME}"""
    },
    {
        "templateId": 62,
        "tone": "direct",
        "subject": "Applying for {JOB_TITLE}",
        "body": """Hello,

I saw the {JOB_TITLE} opening. My skills in {SKILLS} match your requirements. You can review my work at {PORTFOLIO_URL}. Resume attached.

Let me know if you want to schedule a call.

{USER_NAME}"""
    },
    {
        "templateId": 63,
        "tone": "direct",
        "subject": "{JOB_TITLE} — relevant experience",
        "body": """Hi,

I have the {SKILLS} experience your {JOB_TITLE} role needs. GitHub: {GITHUB_URL}. Resume attached. Available to talk this week.

{USER_NAME}"""
    },
    {
        "templateId": 64,
        "tone": "direct",
        "subject": "{JOB_TITLE} — let's talk",
        "body": """Hello,

Reaching out about {JOB_TITLE}. My background is in {SKILLS}. I have shipped real projects and can demonstrate results.

Resume attached. When can we connect?

{USER_NAME}"""
    },
    {
        "templateId": 65,
        "tone": "direct",
        "subject": "For your {JOB_TITLE} opening",
        "body": """Hi,

I am a good fit for {JOB_TITLE}. {SKILLS} are my strengths. Portfolio: {PORTFOLIO_URL}. Resume attached.

Happy to discuss further.

{USER_NAME}"""
    },
    {
        "templateId": 66,
        "tone": "direct",
        "subject": "{JOB_TITLE} — straight to the point",
        "body": """Hello,

You need a {JOB_TITLE}. I have the skills: {SKILLS}. I have the experience. Resume attached.

Let's connect and discuss specifics.

{USER_NAME}"""
    },
    {
        "templateId": 67,
        "tone": "direct",
        "subject": "Re: {JOB_TITLE} position",
        "body": """Hi,

Applying for {JOB_TITLE}. Experienced in {SKILLS}. My work is visible at {GITHUB_URL} and {PORTFOLIO_URL}. Resume attached.

{USER_NAME}"""
    },
    {
        "templateId": 68,
        "tone": "direct",
        "subject": "{JOB_TITLE} application from {USER_NAME}",
        "body": """Hello,

I am interested in {JOB_TITLE}. I bring {SKILLS} expertise and deliver results. Resume attached. Available for a call at your convenience.

{USER_NAME}"""
    },
    {
        "templateId": 69,
        "tone": "direct",
        "subject": "{JOB_TITLE} — my background fits",
        "body": """Hi,

The {JOB_TITLE} role is a match for my experience in {SKILLS}. I have attached my resume. Check my portfolio at {PORTFOLIO_URL} for project examples.

Best,
{USER_NAME}"""
    },
    {
        "templateId": 70,
        "tone": "direct",
        "subject": "{JOB_TITLE} — ready to contribute",
        "body": """Hello,

I want the {JOB_TITLE} position. {SKILLS} are what I do best. Resume attached. Let's schedule a conversation.

{USER_NAME}"""
    },
]
