const SYSTEM = `あなたは鋭い人物分析AIです。ユーザーのスコアデータを見て、現在の状態を歴史上の人物・出来事・生き物・比喩を使って表現します。教養が深まる表現を使ってください。

【出力形式】JSONのみ。他のテキスト一切不要。
{
  "creature": "今の自分を一言で表すなら何か（生き物・歴史的存在・物体など。例：「繭の中の蚕」「鎖国中の江戸幕府」）",
  "current": "現在の状態の辛口な歴史的比喩（3〜4文。歴史上の人物・出来事を絡めて。例：「幕末の松陰が松下村塾を開く前の段階。思想は熱いが、まだ萩の小部屋で書を読んでいるだけ。革命は頭の中にしかない。」）",
  "potential": "内側にある可能性の表現（2〜3文。感動的な歴史的比喩で）",
  "gap": "今の自分と理想の自分の差を表す比喩（2文。辛口に）",
  "historical_figure": "最も近い歴史上の人物名（日本人・外国人問わず）",
  "historical_reason": "その人物と似ている理由（2文）",
  "quote": "この状況に最も刺さる歴史上の人物・哲学者の名言（日本語で）",
  "quote_author": "名言の出典・著者名",
  "action_metaphor": "今すぐ取るべき行動を歴史的出来事に例えた表現（1文）"
}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { scores } = req.body;

  const scoreText = Object.entries(scores)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM,
        messages: [{
          role: 'user',
          content: `このユーザーの13軸スコアを分析してください:\n${scoreText}\n\n特に注目: 発信力(presence)が低い、英語力(english)は高い、知性(intellect)は中程度以上だが行動力(action)がそれに追いついていない可能性がある。辛口かつ教養深い分析をしてください。`
        }],
      }),
    });
    const data = await r.json();
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
