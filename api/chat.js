// Vercel Serverless Function: /api/chat
// SpeakFlow 180 - Next-Gen Conversational AI Engine
// Supports Groq LPU (Llama 3.3 70B / 8B ~800 tok/s), Google Gemini 2.0 Flash,
// and Serverless Autonomous Pedagogical NLP Engine (Zero-Key High-IQ Fallback).

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: 'SpeakFlow 180 AI Voice & Chat Engine v2.0',
      engines: ['groq-llama-3.3-70b', 'gemini-2.0-flash', 'autonomous-esl-nlp'],
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      message = '',
      history = [],
      character = 'marcus',
      scenario = 'banking_fintech',
      customApiKey = '',
      preferredEngine = 'auto'
    } = body;

    const cleanUserMsg = (message || '').trim();
    if (!cleanUserMsg) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Character Persona Setup
    const persona = getPersonaMeta(character, scenario);
    const systemPrompt = buildSystemPrompt(persona);

    // 1. Try Groq (Llama 3.3 70B / Llama 3.1 8B Instant)
    const groqKey = customApiKey?.startsWith('gsk_') ? customApiKey : process.env.GROQ_API_KEY;
    if (groqKey && (preferredEngine === 'auto' || preferredEngine === 'groq')) {
      try {
        const groqResult = await callGroqLlama(cleanUserMsg, history, systemPrompt, groqKey);
        if (groqResult && groqResult.en) {
          return res.status(200).json({
            success: true,
            source: 'groq-llama-3.3-70b',
            ...groqResult
          });
        }
      } catch (err) {
        console.warn('Groq call error, trying next engine:', err.message);
      }
    }

    // 2. Try Google Gemini (Gemini 2.0 Flash / 1.5 Flash)
    const geminiKey = (customApiKey && !customApiKey.startsWith('gsk_')) ? customApiKey : process.env.GEMINI_API_KEY;
    if (geminiKey && (preferredEngine === 'auto' || preferredEngine === 'gemini')) {
      try {
        const geminiResult = await callGeminiFlash(cleanUserMsg, history, systemPrompt, geminiKey);
        if (geminiResult && geminiResult.en) {
          return res.status(200).json({
            success: true,
            source: 'gemini-flash',
            ...geminiResult
          });
        }
      } catch (err) {
        console.warn('Gemini call error, trying next engine:', err.message);
      }
    }

    // 3. Autonomous Pedagogical NLP Engine (Zero-Key High-IQ Socratic Fallback)
    const autonomousResult = generateAutonomousMasterTurn(cleanUserMsg, history, persona);
    return res.status(200).json({
      success: true,
      source: 'autonomous-master-esl-v2',
      ...autonomousResult
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal AI Server Error',
      fallback: {
        en: "I hear you clearly! Let's continue practicing this topic together. What is the biggest challenge you are facing right now?",
        vi: "Tôi nghe rất rõ ý bạn! Hãy tiếp tục cùng nhau luyện tập chủ đề này nhé. Thách thức lớn nhất bạn đang gặp phải lúc này là gì?",
        teacherTip: "Hãy giữ nhịp thở đều và phát âm dứt khoát các phụ âm cuối (Ending Sounds) nhé!"
      }
    });
  }
}

// ==================== PERSONA & SYSTEM PROMPT BUILDER ====================
function getPersonaMeta(charId, scenarioId) {
  const characters = {
    marcus: {
      name: 'Marcus Vance',
      role: 'Tech Lead DevOps & FinTech Systems Architect (San Francisco)',
      accent: 'US Tech Accent',
      tone: 'Crisp, highly competent, modern tech/banking vernacular, collaborative'
    },
    emma: {
      name: 'Emma Watson',
      role: 'Elite British ESL Teacher (Oxford)',
      accent: 'British Received Pronunciation',
      tone: 'Empathetic, encouraging, elegant, warm Socratic questioning'
    },
    alex: {
      name: 'Alex Miller',
      role: 'Native American Colleague & Friend (California)',
      accent: 'US Casual West Coast',
      tone: 'Enthusiastic, conversational, modern workplace idioms, friendly banter'
    },
    david: {
      name: 'David Sterling',
      role: 'Senior Executive & Hiring Director (New York Wall St)',
      accent: 'US Corporate Executive',
      tone: 'Polite, razor-sharp, business strategic, interview-focused'
    }
  };

  return {
    char: characters[charId] || characters.marcus,
    scenarioId: scenarioId || 'banking_fintech'
  };
}

function buildSystemPrompt(persona) {
  return `You are ${persona.char.name}, ${persona.char.role}.
Persona & Tone: ${persona.char.tone}. Accent: ${persona.char.accent}.
You are coaching a Vietnamese adult working professional (in Banking, FinTech, Software, or IT Systems Operations) to achieve native fluency, high-speed conversational reflex, and natural pronunciation.

PEDAGOGICAL RULES (CRITICAL):
1. Respond directly and naturally to what the learner said in 1 to 2 punchy, spoken sentences using authentic modern English (use natural conversational markers like "Got it", "Fair point", "Makes total sense", "Spot on!").
2. ALWAYS end your English response with EXACTLY ONE engaging, open-ended follow-up question that invites the learner to speak.
3. Keep the total English response under 45 words so it can be spoken smoothly in under 6 seconds.
4. "teacherTip": Provide a practical 1-sentence tip in Vietnamese explaining how a native speaker would polish any awkward phrasing, Vietnamese-literal translation, or grammar slip from the user's input, or a high-value industry collocation.
5. Provide a natural, accurate Vietnamese translation in "vi".
6. "correction": Analyze the learner's message for grammar slips, pronunciation pitfalls, or awkward Vietnamese-literal wording. Provide:
   - "hasError": boolean (true if error/awkward phrasing detected, false otherwise)
   - "original": the exact awkward phrase
   - "corrected": the grammatically corrected phrase
   - "betterWay": a natural, native-sounding alternative to express the learner's idea
   - "explanation": a concise 1-sentence explanation in Vietnamese
7. "suggestedReplies": Provide 2 to 3 contextual suggested responses that the learner can use to answer your question. For EACH suggestion, provide BOTH "en" (natural English) and "vi" (accurate Vietnamese translation).

STRICT OUTPUT FORMAT: Return ONLY a valid JSON object with no markdown formatting around it:
{
  "en": "Spoken English response ending with 1 open-ended question.",
  "vi": "Bản dịch tiếng Việt tự nhiên và chuẩn xác.",
  "teacherTip": "Mẹo phản xạ bản xứ hoặc lưu ý ngữ pháp/phát âm thực tế bằng tiếng Việt.",
  "correction": {
    "hasError": false,
    "original": "",
    "corrected": "",
    "betterWay": "Polished native way to express the learner's thought.",
    "explanation": "Giải thích ngắn bằng tiếng Việt."
  },
  "suggestedReplies": [
    { "en": "Natural English response 1.", "vi": "Bản dịch tiếng Việt của gợi ý 1." },
    { "en": "Natural English response 2.", "vi": "Bản dịch tiếng Việt của gợi ý 2." }
  ]
}`;
}

// ==================== GROQ LLAMA 3.3 CALLER ====================
async function callGroqLlama(userMsg, history, systemPrompt, apiKey) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
      content: h.parts ? h.parts[0].text : (h.text || h.content || '')
    })),
    { role: 'user', content: userMsg }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.6,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    return parseModelJsonResponse(content);
  } finally {
    clearTimeout(timer);
  }
}

// ==================== GOOGLE GEMINI CALLER ====================
async function callGeminiFlash(userMsg, history, systemPrompt, apiKey) {
  const contents = [
    ...history.slice(-6).map(h => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.parts ? h.parts[0].text : (h.text || h.content || '') }]
    })),
    { role: 'user', parts: [{ text: userMsg }] }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 350,
          response_mime_type: 'application/json'
        }
      })
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseModelJsonResponse(text);
  } finally {
    clearTimeout(timer);
  }
}

function parseModelJsonResponse(raw) {
  if (!raw) return null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.en) {
        const replies = (parsed.suggestedReplies || []).map(r => {
          if (typeof r === 'string') {
            return { en: r, vi: '' };
          }
          return { en: r.en || '', vi: r.vi || '' };
        });

        return {
          en: parsed.en.trim(),
          vi: parsed.vi ? parsed.vi.trim() : 'Bản dịch đàm thoại tự động',
          teacherTip: parsed.teacherTip ? parsed.teacherTip.trim() : 'Hãy chú ý nối âm tự nhiên và nhấn đúng trọng âm câu nhé!',
          suggestedReplies: replies,
          correction: parsed.correction || null
        };
      }
    }
  } catch (e) {}

  return {
    en: raw.replace(/[*_#`]/g, '').trim(),
    vi: 'Bản dịch đàm thoại',
    teacherTip: 'Tập trung phản xạ nhanh và dứt khoát nhé!',
    suggestedReplies: [],
    correction: null
  };
}

// ==================== AUTONOMOUS MASTER ESL NLP ENGINE (ZERO-KEY HIGH IQ) ====================
// A sophisticated semantic tree with Vietnamese ESL pedagogical intelligence
function generateAutonomousMasterTurn(userMsg, history, persona) {
  const lower = userMsg.toLowerCase().trim();
  const char = persona.char;
  const isMarcus = char.name.includes('Marcus');
  const isEmma = char.name.includes('Emma');
  const isDavid = char.name.includes('David');

  // Pedagogical Grammar / Collocation Linting
  let detectedTeacherTip = null;
  let correction = null;

  if (/\b(i am agree|i'm agree)\b/i.test(lower)) {
    detectedTeacherTip = '💡 Lỗi phản xạ phổ biến: Người Việt hay nói "I am agree". Trong tiếng Anh chuẩn phải là "I agree" hoặc "I totally agree with you" (agree là động từ, không đi với to be)!';
    correction = {
      hasError: true,
      original: 'I am agree',
      corrected: 'I agree / I totally agree',
      betterWay: 'I completely agree with your proposal.',
      explanation: 'Agree là động từ chỉ quan điểm, không dùng với động từ to be "am".'
    };
  } else if (/\b(work here since|lived here since)\s+\d+/i.test(lower)) {
    detectedTeacherTip = '💡 Mẹo ngữ pháp: Khi nói về khoảng thời gian (2 years, 3 months), hãy dùng "for" thay vì "since". Ví dụ: "I have worked here for two years."';
    correction = {
      hasError: true,
      original: 'work here since',
      corrected: 'have worked here for',
      betterWay: 'I have been working here for over two years.',
      explanation: 'Dùng "for" cho khoảng thời gian và "since" cho mốc thời gian cụ thể.'
    };
  } else if (/\b(many user|many problem|many request)\b/i.test(lower)) {
    detectedTeacherTip = '💡 Mẹo danh từ đếm được: Hãy nhớ thêm đuôi số nhiều "s/es" khi dùng "many" (VD: "many users", "many requests") hoặc dùng "a high volume of requests".';
    correction = {
      hasError: true,
      original: 'many request / many user',
      corrected: 'many requests / many users',
      betterWay: 'We are processing a high volume of user requests.',
      explanation: 'Danh từ đếm được sau "many" phải ở dạng số nhiều.'
    };
  } else if (/\b(explain me|explain for me)\b/i.test(lower)) {
    detectedTeacherTip = '💡 Collocation chuẩn: "Explain" không đi trực tiếp với tân ngữ người. Hãy nói: "Explain this to me" hoặc "Could you walk me through this?".';
    correction = {
      hasError: true,
      original: 'explain me',
      corrected: 'explain this to me',
      betterWay: 'Could you please walk me through this workflow?',
      explanation: 'Động từ explain đi với giới từ to: explain something to somebody.'
    };
  } else if (/\b(how do you think about)\b/i.test(lower)) {
    detectedTeacherTip = '💡 Câu hỏi ý kiến: Thay vì "How do you think about", người bản xứ luôn hỏi "What do you think about...?" hoặc "What are your thoughts on...?".';
    correction = {
      hasError: true,
      original: 'How do you think about',
      corrected: 'What do you think about',
      betterWay: 'What are your thoughts on this strategy?',
      explanation: 'Hỏi ý kiến trong tiếng Anh dùng "What do you think" thay vì "How".'
    };
  } else if (/\bamma\b/i.test(lower)) {
    detectedTeacherTip = '💡 Phát âm chuẩn: Tên cô là Emma /ˈɛm.ə/. Chú ý hạ nhẹ hàm dưới đọc âm /e/ ngắn dứt khoát, không bẹt miệng thành "Amma".';
    correction = {
      hasError: true,
      original: 'Amma',
      corrected: 'Emma',
      betterWay: 'Hello Emma, how are you doing today?',
      explanation: 'Khẩu hình nguyên âm ngắn /e/ bị đọc bẹt thành /æ/ khiến máy nghe thành Amma.'
    };
  }

  // 1. INCIDENT & OUTAGE / DEVOPS / CPU / MEMORY
  if (/(outage|down|crash|cpu|memory|latency|spike|504|500|timeout|incident|war room|high load|failover)/i.test(lower)) {
    return {
      en: "Understood, that sounds like a critical bottleneck! Have you verified whether the latency spike is originating from the database connection pool or the gateway cache?",
      vi: "Đã rõ, đó có vẻ là một điểm nghẽn nghiêm trọng! Bạn đã kiểm tra xem hiện tượng trễ tăng vọt bắt nguồn từ connection pool của cơ sở dữ liệu hay từ bộ đệm của gateway chưa?",
      teacherTip: detectedTeacherTip || "Trong sự cố kỹ thuật, thay vì nói 'server is dead', dân DevOps quốc tế luôn dùng các thuật ngữ chuyên nghiệp: 'latency spike', 'bottleneck' hoặc 'service degraded'.",
      correction: correction || {
        hasError: false,
        betterWay: "We are currently investigating a latency spike on our primary gateway.",
        explanation: "Diễn đạt ngắn gọn, tự nhiên chuẩn quy trình phản ứng sự cố."
      },
      suggestedReplies: [
        {
          en: "It seems to be a connection pool exhaustion in our primary database cluster.",
          vi: "Có vẻ như đã cạn kiệt connection pool trong cụm cơ sở dữ liệu chính."
        },
        {
          en: "We checked the metrics and the Kubernetes pods are restarting due to OOM kills.",
          vi: "Chúng tôi đã kiểm tra chỉ số và các pod Kubernetes đang khởi động lại do lỗi tràn bộ nhớ (OOM)."
        },
        {
          en: "Latency is stabilizing now after we initiated a graceful failover to standby.",
          vi: "Độ trễ đang dần ổn định sau khi chúng tôi kích hoạt chuyển đổi dự phòng an toàn sang cụm standby."
        }
      ]
    };
  }

  // 2. BANKING & FINTECH / PAYMENTS / CARDS / RECONCILIATION
  if (/(payment|gateway|bank|transaction|fraud|card|reconciliation|balance|settlement|money|transfer|audit|pci)/i.test(lower)) {
    return {
      en: "Makes complete sense. Financial transaction pipelines require zero margin for error. Are all settlement discrepancies being automatically flagged for compliance review?",
      vi: "Rất hợp lý. Luồng giao dịch tài chính đòi hỏi độ chính xác tuyệt đối không sai số. Mọi khoản chênh lệch đối soát có đang được tự động gắn cờ để rà soát tuân thủ không?",
      teacherTip: detectedTeacherTip || "Từ 'settlement' /ˈset.əl.mənt/ (quyết toán bù trừ) và 'reconciliation' (đối soát số dư) là 2 từ vàng trong FinTech. Khi có chênh lệch số liệu, hãy dùng 'discrepancy' thay vì 'difference'.",
      correction: correction || {
        hasError: false,
        betterWay: "Our payment gateway is handling peak transaction volume smoothly.",
        explanation: "Cách nói chuyên nghiệp của kỹ sư tài chính công nghệ."
      },
      suggestedReplies: [
        {
          en: "Yes, our automated reconciliation engine reconciles ledger balances every midnight.",
          vi: "Vâng, công cụ đối soát tự động của chúng tôi cân đối số dư sổ cái vào mỗi nửa đêm."
        },
        {
          en: "We are currently auditing suspicious merchant transactions with the risk team.",
          vi: "Chúng tôi hiện đang kiểm toán các giao dịch đáng ngờ của đơn vị bán hàng cùng đội ngũ rủi ro."
        },
        {
          en: "All settlement pipelines are fully synchronized with zero discrepancies so far.",
          vi: "Tất cả các luồng quyết toán đều được đồng bộ hóa hoàn toàn và chưa ghi nhận sai lệch nào."
        }
      ]
    };
  }

  // 3. DEPLOYMENT & CI/CD / KUBERNETES / CLOUD / ROLLBACK
  if (/(deploy|release|rollback|kubernetes|docker|cluster|aws|azure|pipeline|ci\/cd|git|commit|production)/i.test(lower)) {
    return {
      en: "Spot on! Safe deployments are the backbone of high availability. Did the canary deployment show any regression before you pushed it to full production?",
      vi: "Chuẩn xác! Triển khai an toàn là xương sống của hệ thống sẵn sàng cao. Bản phát hành thử nghiệm Canary có ghi nhận lỗi thoái lui nào trước khi đẩy lên toàn bộ máy chủ thật không?",
      teacherTip: detectedTeacherTip || "Thuật ngữ 'canary deployment' là kỹ thuật triển khai cho 5-10% người dùng trước. Khi có lỗi phát sinh sau khi update, từ chuẩn là 'regression' (lỗi thoái lui).",
      correction: correction || {
        hasError: false,
        betterWay: "We have successfully automated our CI/CD pipeline with zero downtime.",
        explanation: "Dùng 'zero downtime' và 'automated pipeline' rất tự nhiên và thuyết phục."
      },
      suggestedReplies: [
        {
          en: "The canary phase was clean, but we noticed higher memory usage under peak load.",
          vi: "Giai đoạn thử nghiệm canary diễn ra êm đẹp, nhưng chúng tôi nhận thấy mức dùng RAM tăng cao khi chịu tải đỉnh."
        },
        {
          en: "We initiated an instant rollback via ArgoCD and the system is back to healthy.",
          vi: "Chúng tôi đã kích hoạt rollback tức thì qua ArgoCD và hệ thống đã hoạt động bình thường trở lại."
        },
        {
          en: "All automated integration tests passed with 100% test coverage before release.",
          vi: "Tất cả các bài kiểm thử tích hợp tự động đều đã vượt qua với độ phủ kiểm thử 100% trước khi phát hành."
        }
      ]
    };
  }

  // 4. JOB INTERVIEW & CAREER / SALARY / STRENGTHS
  if (/(interview|job|hire|experience|strength|weakness|salary|promotion|career|resume|apply|project)/i.test(lower)) {
    return {
      en: "Fair point, and that is a key consideration for senior leadership! When handling unexpected workplace friction or high-stress deadlines, how do you typically prioritize your deliverables?",
      vi: "Góc nhìn rất sắc bén, và đó là tiêu chí then chốt với ban lãnh đạo! Khi đối mặt với bất đồng công việc hoặc deadline căng thẳng, bạn thường ưu tiên phân bổ công việc như thế nào?",
      teacherTip: detectedTeacherTip || "Trong phỏng vấn xin việc, hãy dùng cấu trúc STAR (Situation - Task - Action - Result). Thay vì nói chung chung 'I do many things', hãy nói 'I prioritized high-impact deliverables'.",
      correction: correction || {
        hasError: false,
        betterWay: "I have extensive experience leading cross-functional engineering teams.",
        explanation: "Diễn đạt cô đọng, tự tin theo chuẩn phỏng vấn cấp cao."
      },
      suggestedReplies: [
        {
          en: "I focus on unblocking critical path deliverables and align expectations with stakeholders.",
          vi: "Tôi tập trung tháo gỡ các hạng mục trên đường găng (critical path) và thống nhất kỳ vọng với các bên liên quan."
        },
        {
          en: "I break down complex dependencies and maintain transparent daily asynchronous updates.",
          vi: "Tôi bẻ nhỏ các phụ thuộc phức tạp và duy trì cập nhật tiến độ bất đồng bộ minh bạch mỗi ngày."
        },
        {
          en: "I stay calm under pressure, triage the most urgent bugs first, and delegate effectively.",
          vi: "Tôi giữ bình tĩnh dưới áp lực, phân loại xử lý các lỗi khẩn cấp nhất trước và phân quyền hiệu quả."
        }
      ]
    };
  }

  // 5. GREETINGS & SMALL TALK / WEEKEND / DAILY CHIT-CHAT
  if (/(hello|hi|hey|how are you|good morning|good evening|weekend|relax|coffee|weather|today|tired|happy)/i.test(lower)) {
    const greetingOpening = isEmma
      ? "Hello there! I'm genuinely delighted to practice with you."
      : isMarcus
      ? "Hey team, great to connect with you!"
      : "Hey what's up! Glad you stopped by.";

    return {
      en: `${greetingOpening} How has your day been treating you so far—did you tackle anything particularly interesting at work?`,
      vi: "Xin chào! Rất vui được kết nối cùng bạn. Ngày hôm nay của bạn thế nào rồi—ở chỗ làm có điều gì thú vị hoặc thử thách không?",
      teacherTip: detectedTeacherTip || "Cách hỏi thăm ngày của ai đó tự nhiên như người bản xứ: 'How's your day treating you?' hoặc 'How did your day turn out?' nghe thân thiện và sống động hơn nhiều so với câu dịch thô.",
      correction: correction || {
        hasError: false,
        betterWay: "I'm doing well, thank you! It's great to connect with you tonight.",
        explanation: "Mở đầu lịch thiệp, tự nhiên và tràn đầy năng lượng tích cực."
      },
      suggestedReplies: [
        {
          en: "It's been quite busy today, but I managed to finish my core tasks.",
          vi: "Hôm nay khá bận rộn, nhưng tôi đã hoàn thành được các nhiệm vụ chính."
        },
        {
          en: "Pretty relaxing actually! Just taking some time to sharpen my English communication.",
          vi: "Thực ra khá thư thái! Tôi chỉ đang dành chút thời gian trau dồi khả năng giao tiếp tiếng Anh."
        },
        {
          en: "I had a great productive day collaborating with my engineering team.",
          vi: "Tôi đã có một ngày làm việc rất năng suất cùng nhóm kỹ thuật của mình."
        }
      ]
    };
  }

  // 6. ADAPTIVE CONVERSATIONAL SOCRATIC EXPANSION (DEFAULT)
  return {
    en: "I hear you, and that makes a lot of sense from a practical standpoint! Looking ahead, what do you think would be the most effective next step to resolve this?",
    vi: "Tôi rất hiểu ý bạn, và điều đó hoàn toàn hợp lý ở góc độ thực tiễn! Nhìn về phía trước, theo bạn bước đi hiệu quả nhất tiếp theo để giải quyết vấn đề này là gì?",
    teacherTip: detectedTeacherTip || "Cụm 'from a practical standpoint' (dưới góc độ thực tế) là cụm từ rất giá trị khi tranh luận công việc hoặc trao đổi kỹ thuật. Hãy tập dùng để câu nói chững chạc hơn!",
    correction: correction || {
      hasError: false,
      betterWay: "That aligns with our operational objectives for this sprint.",
      explanation: "Cách diễn đạt chuyên nghiệp khi xác nhận tính khả thi của một đề xuất."
    },
    suggestedReplies: [
      {
        en: "We should schedule a brief alignment meeting with the lead architect.",
        vi: "Chúng ta nên xếp một buổi họp ngắn để thống nhất với kiến trúc sư trưởng."
      },
      {
        en: "The next step is to benchmark performance and eliminate the bottleneck.",
        vi: "Bước tiếp theo là đo kiểm hiệu năng thực tế và loại bỏ điểm nghẽn."
      },
      {
        en: "I suggest we run a quick proof of concept before rolling it out widely.",
        vi: "Tôi đề xuất chúng ta nên thử nghiệm nhanh bản PoC trước khi áp dụng rộng rãi."
      }
    ]
  };
}
