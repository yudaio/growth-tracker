const SYSTEM = `あなたは個人成長トラッカーAIです。ユーザーの今日の行動報告を評価し、13軸のスコア変化をJSONのみで返します。

【13軸の定義】
- appearance: 外見・肌（日焼け止め・洗顔・保湿・眉・目元ケア）
- physique: 体型・筋力（筋トレ・体重管理・食事・タンパク質）
- english: 英語力（TOEIC学習・英語コンテンツ・英語使用）
- skills: 専門スキル（SaaS知識・資格学習・転職準備・HubSpot/Salesforce）
- income: 経済力（転職活動・副業・Gumroad販売・収益活動）
- action: 行動力（タスク完遂・先送り克服・習慣継続）
- creativity: 創造力（作曲・ピアノ練習・アプリ開発・新規制作）
- presence: 表現・発信力（YouTube投稿・X発信・Gumroad出品・人前に立つ・ライブ演奏・登壇・スピーチ・表舞台に出る）
- attraction: 異性への魅力（マッチング活動・デート・外見磨き・自然な自信）
- health: 健康習慣（睡眠7h以上・4〜5食・水分・規則的生活）
- intellect: 知性・思考力（読書・哲学探究・NotebookLM学習・思考の深化）
- social: 社会性・人脈（LinkedIn活動・networking・コミュニティ参加）
- mental: 精神力・自己制御（恐れを行動に変える・感情制御・一貫性維持）

【スコア変化ルール】
- 直接的な行動: +0.1〜+0.2
- 重要な挑戦・初挑戦・人前に出る行動: +0.3〜+0.5
- 複数関連タスク同日: +0.1ボーナス
- 変化なし・未報告: 0
- 明示的なサボり: -0.1
- スコアは必ず1.0〜10.0の範囲内

【出力形式】JSONのみ。他のテキスト一切不要。
{"changes":{"appearance":0.0,"physique":0.0,"english":0.0,"skills":0.0,"income":0.0,"action":0.0,"creativity":0.0,"presence":0.0,"attraction":0.0,"health":0.0,"intellect":0.0,"social":0.0,"mental":0.0},"comment":"1〜2文の評価","highlight":"最も評価できた行動"}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { tasks, scores } = req.body;
  if (!tasks) return res.status(400).json({ error: 'tasks required' });

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
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: `今日の行動報告:\n${tasks}\n\n現在スコア:\n${JSON.stringify(scores)}` }],
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
