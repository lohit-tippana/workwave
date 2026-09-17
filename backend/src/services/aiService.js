const config = require('../config');
const ApiError = require('../utils/ApiError');

/**
 * AIService - single integration point for LLM-powered features.
 *
 * Provider priority:
 *   1. Google Gemini (when GEMINI_API_KEY is configured)
 *   2. Deterministic local heuristic analyzer (fallback)
 *
 * The fallback is a real, documented analyzer - it performs skill extraction
 * against a known-tech dictionary, section detection, and overlap scoring.
 * It never pretends to be an LLM: every result carries `provider` so the UI
 * can label it correctly.
 */

// ---------- skill dictionary used by the fallback analyzer and match post-processing ----------
const SKILL_DICTIONARY = [
  'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
  'react', 'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'redux', 'html', 'css', 'tailwind', 'sass',
  'node.js', 'nodejs', 'express', 'nestjs', 'django', 'flask', 'fastapi', 'spring', 'laravel', 'rails',
  'mongodb', 'postgresql', 'postgres', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'dynamodb', 'firebase',
  'rest', 'rest api', 'graphql', 'grpc', 'websocket', 'socket.io', 'microservices',
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'github actions',
  'git', 'linux', 'nginx', 'rabbitmq', 'kafka',
  'machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
  'figma', 'ui/ux', 'photoshop', 'illustrator', 'sketch',
  'seo', 'content writing', 'copywriting', 'digital marketing', 'social media',
  'react native', 'flutter', 'android', 'ios',
  'jest', 'vitest', 'cypress', 'playwright', 'testing', 'unit testing',
  'agile', 'scrum', 'jira', 'webpack', 'vite', 'babel', 'eslint',
  'stripe', 'razorpay', 'payment integration', 'oauth', 'jwt', 'authentication',
  'wordpress', 'shopify', 'woocommerce', 'solidity', 'blockchain', 'web3',
];

const SOFT_SKILLS = [
  'communication', 'leadership', 'teamwork', 'problem solving', 'time management',
  'collaboration', 'mentoring', 'adaptability', 'critical thinking', 'attention to detail',
];

const norm = (s) => String(s || '').toLowerCase().trim();

function extractSkillsFromText(text) {
  const t = ` ${norm(text).replace(/[.,;:!?()\[\]{}]/g, ' ')} `;
  const found = new Set();
  for (const skill of SKILL_DICTIONARY) {
    if (t.includes(` ${skill} `) || t.includes(` ${skill},`) || t.endsWith(` ${skill}`)) {
      found.add(skill === 'nodejs' ? 'node.js' : skill === 'nextjs' ? 'next.js' : skill);
    }
  }
  for (const skill of SOFT_SKILLS) {
    if (t.includes(skill)) found.add(skill);
  }
  return [...found];
}

function overlapScore(required = [], possessed = []) {
  const req = new Set(required.map(norm));
  const pos = new Set(possessed.map(norm));
  const matched = [...req].filter((s) => pos.has(s) || [...pos].some((p) => p.includes(s) || s.includes(p)));
  const missing = [...req].filter((s) => !matched.includes(s));
  const score = req.size === 0 ? 50 : Math.round((matched.length / req.size) * 100);
  return { matched, missing, score: Math.min(100, Math.max(5, score)) };
}

// ---------- Gemini plumbing ----------
let geminiModel = null;
function getModel() {
  if (!config.isGeminiConfigured()) return null;
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    geminiModel = new GoogleGenerativeAI(config.gemini.apiKey).getGenerativeModel({
      model: config.gemini.model,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    });
  }
  return geminiModel;
}

function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGemini(prompt, { validate }) {
  const model = getModel();
  if (!model) return null; // caller falls back
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = extractJson(text);
  const validation = validate(parsed);
  if (validation !== true) throw new Error(`Invalid AI response: ${validation}`);
  return parsed;
}

// ---------- fallback implementations ----------
function fallbackResumeAnalysis(text) {
  const skills = extractSkillsFromText(text);
  const soft = skills.filter((s) => SOFT_SKILLS.includes(s));
  const technical = skills.filter((s) => !SOFT_SKILLS.includes(s));
  const lower = norm(text);
  const sections = {
    hasContactInfo: /email|@|phone|\+?\d{10}/.test(lower),
    hasEducation: /education|degree|bachelor|master|b\.tech|m\.tech|university|college/.test(lower),
    hasExperience: /experience|worked|developer|engineer|intern|\d{4}\s*-\s*\d{4}/.test(lower),
    hasProjects: /project|built|developed|github/.test(lower),
    hasCertifications: /certification|certified|certificate/.test(lower),
    hasSummary: /summary|objective|about/.test(lower),
  };
  const sectionScores = {
    skills: Math.min(100, technical.length * 12),
    experience: sections.hasExperience ? 70 : 25,
    projects: sections.hasProjects ? 70 : 20,
    education: sections.hasEducation ? 75 : 30,
    keywords: Math.min(100, skills.length * 8),
    formatting: sections.hasContactInfo && sections.hasSummary ? 75 : 50,
  };
  const overall = Math.round(
    Object.values(sectionScores).reduce((a, b) => a + b, 0) / Object.keys(sectionScores).length
  );
  const missing = Object.entries(sections)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace('has', '').replace(/([A-Z])/g, ' $1').toLowerCase());
  const suggestions = [
    technical.length < 5 && 'Add more specific technical skills with exact technology names.',
    !sections.hasProjects && 'Add a projects section with measurable outcomes.',
    !sections.hasSummary && 'Add a short professional summary at the top.',
    !sections.hasCertifications && 'Consider adding relevant certifications.',
    'Quantify achievements (e.g., "reduced load time by 40%") where possible.',
  ].filter(Boolean);
  return {
    overallScore: overall,
    label: 'AI-generated ATS-style analysis (local fallback analyzer)',
    sections: sectionScores,
    detected: sections,
    technicalSkills: technical,
    softSkills: soft,
    missingInformation: missing,
    suggestions,
  };
}

function fallbackJobAnalysis(description) {
  const skills = extractSkillsFromText(description);
  const lower = norm(description);
  const experience = lower.includes('senior') || lower.includes('expert') ? 'expert'
    : lower.includes('junior') || lower.includes('entry') ? 'entry' : 'intermediate';
  const complexity = skills.length > 8 ? 'high' : skills.length > 4 ? 'medium' : 'low';
  const responsibilities = description
    .split(/\n|•|-\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 200)
    .slice(0, 6);
  return {
    requiredSkills: skills.slice(0, 10),
    preferredSkills: [],
    experienceLevel: experience,
    estimatedComplexity: complexity,
    responsibilities,
    keywords: skills.slice(0, 12),
    label: 'Extracted by local heuristic analyzer (configure GEMINI_API_KEY for LLM analysis)',
  };
}

// ---------- public API ----------

async function analyzeResume(resumeText) {
  const prompt = `You are a resume analysis engine. Analyze the following resume text and return ONLY a JSON object with this exact shape:
{
  "overallScore": <0-100 integer ATS-style compatibility estimate>,
  "sections": {"skills":0-100,"experience":0-100,"projects":0-100,"education":0-100,"keywords":0-100,"formatting":0-100},
  "technicalSkills": ["..."],
  "softSkills": ["..."],
  "education": ["..."],
  "experience": ["..."],
  "projects": ["..."],
  "certifications": ["..."],
  "missingInformation": ["..."],
  "suggestions": ["..."]
}
Resume text:
"""${resumeText.slice(0, 12000)}"""`;

  const validate = (o) =>
    typeof o.overallScore === 'number' && o.sections && Array.isArray(o.technicalSkills)
      ? true
      : 'missing required fields';

  try {
    const ai = await callGemini(prompt, { validate });
    if (ai) return { provider: 'gemini', result: { ...ai, label: 'AI-generated ATS-style analysis' } };
  } catch (err) {
    console.error('[ai] analyzeResume gemini failed:', err.message);
    // fall through to fallback
  }
  return { provider: 'fallback', result: fallbackResumeAnalysis(resumeText) };
}

async function analyzeJobDescription(description) {
  const prompt = `Analyze this job description and return ONLY JSON:
{
  "requiredSkills": ["..."],
  "preferredSkills": ["..."],
  "experienceLevel": "entry|intermediate|expert",
  "estimatedComplexity": "low|medium|high",
  "responsibilities": ["..."],
  "keywords": ["..."]
}
Job description:
"""${description.slice(0, 8000)}"""`;
  const validate = (o) => (Array.isArray(o.requiredSkills) && o.experienceLevel ? true : 'bad shape');
  try {
    const ai = await callGemini(prompt, { validate });
    if (ai) return { provider: 'gemini', result: { ...ai, label: 'AI-generated job description analysis' } };
  } catch (err) {
    console.error('[ai] analyzeJobDescription gemini failed:', err.message);
  }
  return { provider: 'fallback', result: fallbackJobAnalysis(description) };
}

async function matchProfileToJob({ profile, resumeText, job }) {
  const freelancerSkills = [
    ...(profile?.skills || []),
    ...extractSkillsFromText(resumeText || ''),
  ];
  const required = job.requiredSkills?.length
    ? job.requiredSkills
    : extractSkillsFromText(`${job.title} ${job.description}`);

  const prompt = `Compare this freelancer to the job and return ONLY JSON:
{
  "matchScore": <0-100>,
  "matchedSkills": ["..."],
  "missingSkills": ["..."],
  "relevantExperience": "...",
  "explanation": "2-4 sentences"
}
Job: ${job.title}
Required skills: ${required.join(', ')}
Job description: ${(job.description || '').slice(0, 4000)}
Freelancer skills: ${freelancerSkills.join(', ')}
Freelancer experience: ${profile?.yearsOfExperience || 0} years
Freelancer headline: ${profile?.headline || ''}
Resume excerpt: ${(resumeText || '').slice(0, 3000)}`;

  const validate = (o) =>
    typeof o.matchScore === 'number' && Array.isArray(o.matchedSkills) ? true : 'bad shape';

  try {
    const ai = await callGemini(prompt, { validate });
    if (ai) {
      return {
        provider: 'gemini',
        result: {
          ...ai,
          disclaimer:
            'AI-generated compatibility estimate for decision support only. The final hiring decision belongs to the client.',
        },
      };
    }
  } catch (err) {
    console.error('[ai] matchProfileToJob gemini failed:', err.message);
  }
  const { matched, missing, score } = overlapScore(required, freelancerSkills);
  return {
    provider: 'fallback',
    result: {
      matchScore: score,
      matchedSkills: matched,
      missingSkills: missing,
      relevantExperience: `${profile?.yearsOfExperience || 0} years of experience`,
      explanation: `Skill-overlap analysis matched ${matched.length} of ${required.length} required skills.`,
      disclaimer:
        'AI-generated compatibility estimate (local heuristic) for decision support only. The final hiring decision belongs to the client.',
    },
  };
}

async function generateJobRecommendations({ profile, resumeText, jobs }) {
  const freelancerSkills = [...(profile?.skills || []), ...extractSkillsFromText(resumeText || '')];
  const scored = jobs.map((job) => {
    const required = job.requiredSkills?.length
      ? job.requiredSkills
      : extractSkillsFromText(`${job.title} ${job.description}`);
    const { matched, score } = overlapScore(required, freelancerSkills);
    return { job, matched, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 10)
    .slice(0, 10)
    .map(({ job, matched, score }) => ({
      jobId: job._id,
      score,
      matchedSkills: matched,
      reason:
        matched.length > 0
          ? `Recommended because your profile includes ${matched.slice(0, 4).join(', ')}, which match this job's requirements.`
          : `Recommended based on category overlap with your profile.`,
    }));
}

async function generateProposalDraft({ job, profile }) {
  const skills = (profile?.skills || []).slice(0, 8).join(', ');
  const prompt = `Write a professional freelance proposal draft as JSON: {"coverLetter": "..."}
Rules: 150-250 words, first person, no placeholders like [Name], reference the specific job.
Job: ${job.title}
Description: ${(job.description || '').slice(0, 3000)}
Freelancer: ${profile?.name}, ${profile?.headline || ''}, skills: ${skills}, ${profile?.yearsOfExperience || 0} years experience`;
  const validate = (o) => (typeof o.coverLetter === 'string' && o.coverLetter.length > 80 ? true : 'bad shape');
  try {
    const ai = await callGemini(prompt, { validate });
    if (ai) return { provider: 'gemini', result: ai };
  } catch (err) {
    console.error('[ai] generateProposalDraft gemini failed:', err.message);
  }
  return {
    provider: 'fallback',
    result: {
      coverLetter: `Hi, I'm ${profile?.name || 'a freelancer'}${profile?.headline ? `, ${profile.headline}` : ''}. I reviewed your project "${job.title}" and believe my experience with ${skills || 'the required technologies'} is a strong fit. I'd be glad to discuss requirements, milestones, and timeline in detail.`,
      note: 'Draft generated by local fallback - review and personalize before submitting.',
    },
  };
}

module.exports = {
  analyzeResume,
  analyzeJobDescription,
  matchProfileToJob,
  generateJobRecommendations,
  generateProposalDraft,
  extractSkillsFromText,
  overlapScore,
  isConfigured: () => config.isGeminiConfigured(),
};
