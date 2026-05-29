const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Vercel.' });
  }

  // Vercel pode entregar o body como string em alguns runtimes
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { level, levelName, levelDesc, topic } = body || {};

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const topicStr = topic === 'todos'
    ? 'qualquer tópico de matemática financeira e HP-12C'
    : (topic || 'matemática financeira');

  const prompt = `Você é um professor universitário de matemática financeira para o curso de Administração de Empresas no Brasil.

Gere exatamente 5 questões de múltipla escolha sobre ${topicStr} para nível ${levelName || 'Intermediário'} (${levelDesc || 'cálculos de PMT, conversão de taxas, séries de pagamento'}).

Regras:
- Contexto realista em reais (R$), dados do dia a dia brasileiro
- Exatamente 4 alternativas por questão (A, B, C, D)
- Apenas UMA alternativa correta
- Explicação didática e completa da resposta correta
- Nível ${level || 3}/5

Retorne APENAS JSON válido, sem texto antes ou depois:
{
  "questions": [
    {
      "topic": "nome curto do tópico",
      "question": "texto da questão",
      "options": ["opção A", "opção B", "opção C", "opção D"],
      "correct": 0,
      "explanation": "Explicação completa e didática..."
    }
  ]
}

"correct" é o índice 0-3 da opção correta.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    const data = JSON.parse(raw);
    return res.status(200).json(data);
  } catch (err) {
    console.error('Erro na API:', err.message);
    return res.status(500).json({ error: err.message || 'Erro ao gerar questões. Tente novamente.' });
  }
};
