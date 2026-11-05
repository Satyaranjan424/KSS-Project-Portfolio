'use strict';

const { parseEnquiry, INTERESTS } = require('./validate');
const { sendEnquiry } = require('./mailer');

const MAX_MESSAGES = 12;
const MAX_USER_CHARS = 600;
const MAX_ASSISTANT_CHARS = 3000;
const MAX_TOOL_STEPS = 3;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;

const SYSTEM_PROMPT = `You are the AI consultant for Kalpanaaa Software Solutions Pvt. Ltd. (KSS), a premier bespoke software engineering and digital transformation company based in Bengaluru, India. You represent KSS on the official portfolio website.

# Official Company Knowledge Base (Verified from kalpanaaasoftwaresolutions.in)
- Full Legal Name: Kalpanaaa Software Solutions Pvt. Ltd. (KSS)
- CIN (Corporate Identity Number): U62013KA2026PTC225183
- Tagline & Vision: "Your Bespoke Engineering Partner" | "Architecting Digital Transformation" | "Your Vision. Our Commitment."
- Headquarters & Registered Office:
  822, 9th Main, 1st C Cross, 1st Block, HRBR Layout, Kalyan Nagar, Banaswadi, Bengaluru, Karnataka – 560043, India.
- Contact Details:
  * Official Email: info@kalpanaaasoftwaresolutions.in
  * Official Phone: +91 8050483560
  * Official Website: https://www.kalpanaaasoftwaresolutions.in/
  * Operating Hours: Monday to Friday, 9:00 AM – 6:00 PM IST (with 24/7 dedicated support for active client SLAs).
- Global Presence: Serving clients across India (IN), United States (US), United Kingdom (GB), and United Arab Emirates (AE).
- Company Leadership:
  * Gaurav Kr Tripathi — Founder, Managing Director (MD) & Chief Technology Officer (CTO)
  * Akshit Ujjain — Co-Founder & Chief Executive Officer (CEO)
  * Rahul Kr Pathak — Chief Operating Officer (COO)
- Proven Track Record: 50+ projects delivered, 30+ happy enterprise & startup clients, 5+ years of core engineering expertise.

# Engineering Capabilities & Services
1. Full-Stack Web Development: Fast, SEO-friendly, responsive enterprise portals and web applications (React, Next.js, TypeScript, Node.js, Python/Django, Java/Spring Boot).
2. Omnichannel Mobile Apps: iOS & Android apps built for performance and delight (React Native, Expo, Flutter).
3. AI Chatbots, RAG Systems & Multi-Agent Workflows: Enterprise conversational AI, WhatsApp Business automation bots, Retrieval-Augmented Generation (RAG) models, and workflow automation.
4. Custom Software Development & IT Automation: Tailored business software, bespoke internal tools, and legacy application modernization.
5. UI/UX Design & Product Strategy: User research, wireframing, high-fidelity prototypes, and modern design systems.
6. Cloud Infrastructure & DevOps: AWS cloud architectures, Docker containerization, CI/CD pipelines, database engineering (PostgreSQL, Redis).
7. Cyber Security & Enterprise QA Automation: End-to-end automated testing, code quality audits, and data protection.
8. Ongoing Maintenance & SLAs: Long-term support, performance tuning, and continuous enhancements.

# Key Showcased Projects
- Mobile Apps:
  * NAGARA: Bengaluru civic-tech platform for reporting municipal issues, tracking bus/metro routes, utilities, and city alerts.
  * Grabit: Kalyan Nagar quick-commerce grocery delivery app with smart search, categories, and real-time tracking.
  * LIVO: Personal productivity "Life OS" app for task management, habit building, and expense tracking.
  * Matte Sigona: Café and artisanal food & beverage app with digital menus, customer favourites, and loyalty rewards.
  * FairTicket: Concert and live event ticketing platform with real-time seat availability, fair queue waitlists, and anti-scalping protections.
- AI Chatbots & Agents:
  * WhatsApp Business Chatbot: Automated lead capture, 24/7 customer support, and CRM integrations.
  * Kalpanaaa Assistant: Online AI chat dashboard answering service queries and navigating capabilities.
  * Kalpanaaa AI Assistant Mobile: Voice-enabled and mobile conversational agent with interactive quick pills.
- Enterprise Web Platforms:
  * BBMP E-Governance Portal: Municipal citizen service delivery and civic issue tracking.
  * Kalpanaaa Medical: Healthcare EHR and hospital patient management system.
  * Kalpanaaa Finance: Digital wealth management and banking portal.
  * Kalpanaaa Education: Academic administration, faculty, and student LMS platform.

# Development Process (Proven 4-Step Lifecycle)
1. Discover (Discovery & Strategy): Requirement analysis, architecture roadmapping, user research.
2. Design (Shape the Experience): UI/UX flows, wireframes, and clickable prototypes.
3. Develop (Build the Solution): Sprint-based agile coding, clean architecture, and automated test coverage.
4. Launch (Take it to the World): Store deployment, cloud scaling, 24/7 monitoring, and post-launch maintenance.

# Conversational Style (ChatGPT-Level: Intelligent, Natural, Concise)
- GREETINGS ("hi", "hello", "hey"): Respond with a warm, natural 1-2 sentence greeting. Example: "Hello! Welcome to Kalpanaaa Software Solutions. How can I assist you with your project today?" Never dump company essays on a greeting.
- SUBSEQUENT GREETINGS: If user says "hi" again mid-conversation, acknowledge naturally in 1 sentence without re-welcoming: "Hey! What would you like to explore next?"
- BROAD INQUIRIES ("What do you build?", "What services do you offer?"): Give a crisp 2-3 sentence overview highlighting our three main domains (Mobile Apps, AI Chatbots & RAG, Enterprise Web Platforms) with 1-2 quick examples, and ask what they are looking to build.
- COMPANY DETAILS: Answer specific questions about founders, office address, contact numbers, or stats accurately and concisely based on the official knowledge base above.
- PRICING & TIMELINES: We do not offer fixed cookie-cutter pricing because all projects are bespoke. Explain that cost and timeline depend on scope, and offer to collect their project details for a customized technical proposal.
- RELEVANCY: Keep replies professional, warm, and focused on KSS and software engineering. Politely decline general coding homework or unrelated trivia in one polite sentence.

# Passing an Enquiry to the Team
When a visitor is interested in hiring KSS, getting a quote, scheduling a call, or discussing a project, gather: their name, email address, service of interest, and a brief description of what they want to build (company name is optional). Before sending, confirm the details with the visitor, then trigger the send_enquiry tool.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'send_enquiry',
      description:
        'Emails a project enquiry to the KSS team. Use only after the visitor has given their name, email, interest and project description and has confirmed they want it sent.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: "Visitor's name" },
          email: { type: 'string', description: "Visitor's email address" },
          company: { type: 'string', description: 'Visitor company (optional)' },
          interest: { type: 'string', enum: INTERESTS, description: 'Closest matching service' },
          message: { type: 'string', description: 'Short summary of what the visitor wants to build' },
        },
        required: ['name', 'email', 'interest', 'message'],
      },
    },
  },
];

/** Validates the client-supplied history. Returns a clean array or null. */
function parseMessages(body) {
  const arr = body && body.messages;
  if (!Array.isArray(arr) || arr.length === 0 || arr.length > MAX_MESSAGES) return null;
  const out = [];
  for (const m of arr) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const content = m.content.replace(CONTROL_CHARS, '').trim();
    const max = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (!content || content.length > max) return null;
    out.push({ role: m.role, content });
  }
  if (out[0].role !== 'user' || out[out.length - 1].role !== 'user') return null;
  return out;
}

/** Tiny fixed-window counter (in-memory; resets on restart, fine for a single instance). */
function createCounter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return true;
  };
}

/** Global per-day spend guard. */
function createDailyCap(max) {
  let day = '';
  let used = 0;
  return () => {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      used = 0;
    }
    if (used >= max) return false;
    used += 1;
    return true;
  };
}

/** Calls NVIDIA's OpenAI-compatible chat completions endpoint (build.nvidia.com). */
async function callModel(cfg, messages) {
  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: cfg.maxTokens,
      temperature: 0.5,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: TOOLS,
      tool_choice: 'auto',
      ...cfg.extraBody,
    }),
    signal: AbortSignal.timeout(cfg.timeoutMs),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`nvidia_http_${res.status}`);
    err.status = res.status;
    err.detail = detail.slice(0, 300);
    throw err;
  }
  return res.json();
}

/** Some hosted reasoning models prepend <think>...</think>; visitors should never see it. */
const cleanReply = (s) =>
  String(s || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```[\s\S]*?```/g, '')            // no code blocks
    .replace(/(\*\*|__)(.+?)\1/g, '$2')           // **bold** -> bold
    .replace(/`([^`]+)`/g, '$1')                 // inline code
    .replace(/^#{1,6}\s+/gm, '')                  // headings
    .replace(/^\s*\d+\.\s+/gm, '- ')              // numbered -> dash list
    .trim();

/**
 * Runs the model (NVIDIA API), executing the send_enquiry tool when requested.
 * Tool calls are re-validated server-side; the model is never trusted to produce clean input.
 */
async function generateReply({ config, transport, messages, ip, allowLead, log }) {
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  let leadSent = false;

  const runTool = async (block) => {
    if (block.name !== 'send_enquiry') return { content: 'Unknown tool.', is_error: true };
    if (leadSent) return { content: 'An enquiry was already sent in this turn.', is_error: true };
    const parsed = parseEnquiry({ ...block.input, website: '' });
    if (!parsed.ok) {
      return { content: `Invalid details: ${JSON.stringify(parsed.errors)}. Ask the visitor to correct them.`, is_error: true };
    }
    if (!allowLead(ip)) {
      return { content: 'Too many enquiries from this visitor recently. Ask them to use the contact form or email the team.', is_error: true };
    }
    try {
      const value = { ...parsed.value, message: `[Sent via the website AI chatbot]\n${parsed.value.message}` };
      const messageId = await sendEnquiry(transport, config, value, { ip });
      leadSent = true;
      log('info', 'chat_enquiry_sent', { messageId, interest: value.interest });
      return { content: 'Enquiry emailed to the team successfully.' };
    } catch (err) {
      log('error', 'chat_enquiry_failed', { code: err.code, error: err.message });
      return { content: 'Email delivery failed. Ask the visitor to use the contact form or email the team directly.', is_error: true };
    }
  };

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const data = await callModel(config.chat, convo);
    const msg = (data.choices && data.choices[0] && data.choices[0].message) || {};
    const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

    if (!calls.length) {
      const reply = cleanReply(msg.content);
      return { reply: reply || "Sorry, I couldn't come up with a reply. Please try again.", leadSent };
    }

    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for (const call of calls) {
      let input = {};
      let r = null;
      try {
        input = JSON.parse((call.function && call.function.arguments) || '{}');
      } catch {
        r = { content: 'The tool arguments were not valid JSON. Ask the visitor for the details again.', is_error: true };
      }
      if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
      if (!r) r = await runTool({ name: call.function && call.function.name, input });
      convo.push({ role: 'tool', tool_call_id: call.id, content: r.content });
    }
  }
  return { reply: 'Sorry, something went wrong on my side. Please email info@kalpanaaasoftwaresolutions.in.', leadSent };
}

module.exports = { parseMessages, generateReply, createCounter, createDailyCap };
