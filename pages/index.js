import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

const RadarChart = dynamic(() => import('../components/RadarChart'), { ssr: false });

const AXES = [
  { k: 'appearance', s: '外見・肌',  l: '外見・肌',     idol: 8, color: '#FF6340' },
  { k: 'physique',   s: '体型',      l: '体型・筋力',   idol: 7, color: '#FBBF24' },
  { k: 'english',    s: '英語',      l: '英語力',       idol: 5, color: '#34D399' },
  { k: 'skills',     s: '専門',      l: '専門スキル',   idol: 7, color: '#60A5FA' },
  { k: 'income',     s: '経済力',    l: '経済力',       idol: 9, color: '#00D97E' },
  { k: 'action',     s: '行動力',    l: '行動力',       idol: 8, color: '#F472B6' },
  { k: 'creativity', s: '創造力',    l: '創造力',       idol: 7, color: '#A78BFA' },
  { k: 'presence',   s: '発信力',    l: '表現・発信力', idol: 7, color: '#FB923C' },
  { k: 'attraction', s: '異性',      l: '異性への魅力', idol: 9, color: '#F87171' },
  { k: 'health',     s: '健康',      l: '健康習慣',     idol: 7, color: '#4ADE80' },
  { k: 'intellect',  s: '知性',      l: '知性・思考力', idol: 7, color: '#818CF8' },
  { k: 'social',     s: '社会性',    l: '社会性・人脈', idol: 8, color: '#38BDF8' },
  { k: 'mental',     s: '精神力',    l: '精神力・自己制御', idol: 8, color: '#C084FC' },
];

const DEF = { appearance:3, physique:2, english:7, skills:4, income:3, action:5, creativity:4, presence:2, attraction:3, health:3, intellect:6, social:4, mental:4 };
const SK = 'gt-v4';

function clamp(v) { return Math.round(Math.min(10, Math.max(1, v)) * 10) / 10; }
function tots(s) { return (AXES.reduce((x, a) => x + (s[a.k] || 5), 0) / AXES.length).toFixed(1); }
function idolT() { return (AXES.reduce((x, a) => x + a.idol, 0) / AXES.length).toFixed(1); }
function pctOf(cur, idol) { return Math.min(100, Math.round(parseFloat(tots(cur)) / parseFloat(idol) * 100)); }
function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        scores: { ...DEF, ...(d.scores || {}) },
        history: d.history || [],
        journal: d.journal || [],
        showIdol: d.showIdol !== false,
        portrait: d.portrait || null,
        portraitTs: d.portraitTs || null,
      };
    }
  } catch {}
  return { scores: { ...DEF }, history: [], journal: [], showIdol: true, portrait: null, portraitTs: null };
}

function saveState(st) {
  try { localStorage.setItem(SK, JSON.stringify(st)); } catch {}
}

const TABS = [
  { id: 'home', label: 'ホーム', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/>
    </svg>
  )},
  { id: 'analysis', label: '分析', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg>
  )},
  { id: 'journal', label: '日記', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )},
];

export default function Home() {
  const [tab, setTab] = useState('home');
  const [st, setSt] = useState(null);
  const [taskInput, setTaskInput] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [journalInput, setJournalInput] = useState('');
  const [journalTag, setJournalTag] = useState('insight');

  useEffect(() => { setSt(loadState()); }, []);

  const update = useCallback((fn) => {
    setSt(prev => {
      const next = fn({ ...prev, scores: { ...prev.scores }, history: [...prev.history], journal: [...prev.journal] });
      saveState(next);
      return next;
    });
  }, []);

  const evalTasks = async () => {
    if (evaluating || !taskInput.trim() || !st) return;
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: taskInput, scores: st.scores }),
      });
      const data = await res.json();
      const ch = data.changes || {};
      update(s => {
        const ns = { ...s.scores };
        Object.entries(ch).forEach(([k, v]) => { if (ns[k] !== undefined) ns[k] = clamp((ns[k] || 5) + v); });
        const today = fmtDate(Date.now());
        return { ...s, scores: ns, history: [...s.history, { ts: Date.now(), date: today, tasks: taskInput, changes: ch, comment: data.comment || '', highlight: data.highlight || '' }] };
      });
      setEvalResult(data);
      setTaskInput('');
    } catch (e) {
      setEvalResult({ error: 'エラーが発生しました。もう一度試してください。' });
    }
    setEvaluating(false);
  };

  const getPortrait = async () => {
    if (analyzing || !st) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: st.scores }),
      });
      const data = await res.json();
      update(s => ({ ...s, portrait: data, portraitTs: Date.now() }));
    } catch {}
    setAnalyzing(false);
  };

  const addJournal = () => {
    if (!journalInput.trim()) return;
    update(s => ({
      ...s,
      journal: [...s.journal, { ts: Date.now(), date: fmtDate(Date.now()), text: journalInput.trim(), tag: journalTag }]
    }));
    setJournalInput('');
  };

  const deleteJournal = (ts) => {
    update(s => ({ ...s, journal: s.journal.filter(j => j.ts !== ts) }));
  };

  if (!st) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="pulse" style={{ color: 'var(--text3)', fontSize: 13 }}>読み込み中...</div>
    </div>
  );

  const ct = tots(st.scores);
  const pct = pctOf(st.scores, idolT());

  return (
    <>
      <Head>
        <title>Growth Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="13軸で自分の成長を可視化するAIトラッカー" />
        <meta name="theme-color" content="#09090B" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 80 }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Growth Tracker</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="glow-text" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>{ct}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)' }}>/10</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>アイドル達成率</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: pct >= 70 ? 'var(--primary)' : pct >= 50 ? 'var(--amber)' : 'var(--secondary)' }}>{pct}%</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{st.history.length}日記録</div>
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '12px 16px 0' }}>
          {tab === 'home' && <HomeTab st={st} update={update} taskInput={taskInput} setTaskInput={setTaskInput} evaluating={evaluating} evalTasks={evalTasks} evalResult={evalResult} />}
          {tab === 'analysis' && <AnalysisTab st={st} portrait={st.portrait} portraitTs={st.portraitTs} analyzing={analyzing} getPortrait={getPortrait} />}
          {tab === 'journal' && <JournalTab journal={st.journal} input={journalInput} setInput={setJournalInput} tag={journalTag} setTag={setJournalTag} add={addJournal} del={deleteJournal} />}
        </div>
      </div>

      {/* Bottom tabs */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)', display: 'flex', maxWidth: 480, margin: '0 auto' }}>
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

function HomeTab({ st, update, taskInput, setTaskInput, evaluating, evalTasks, evalResult }) {
  return (
    <div className="fade-up">
      {/* Radar chart */}
      <div className="glass" style={{ padding: '16px 8px 8px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>成長レーダー</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text3)', cursor: 'pointer' }}>
            <input type="checkbox" checked={st.showIdol} onChange={e => update(s => ({ ...s, showIdol: e.target.checked }))} />
            アイドル比較
          </label>
        </div>
        <div style={{ height: 280 }}>
          <RadarChart scores={st.scores} showIdol={st.showIdol} axes={AXES} />
        </div>
      </div>

      {/* Score bars */}
      <div className="glass" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>軸別スコア</div>
        {AXES.map(a => {
          const sc = st.scores[a.k] || 5;
          const pct = sc / 10 * 100;
          const idolPct = a.idol / 10 * 100;
          return (
            <div key={a.k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: 'var(--text2)', minWidth: 68 }}>{a.l}</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: a.color }} />
                </div>
                {st.showIdol && (
                  <div style={{ position: 'absolute', top: -2, left: `${idolPct}%`, height: 9, width: 2, background: 'rgba(255,99,64,0.6)', borderRadius: 1, transform: 'translateX(-50%)' }} />
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 28, textAlign: 'right', color: sc >= a.idol ? 'var(--primary)' : 'var(--text2)' }}>{sc.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {/* Daily check-in */}
      <div className="glass" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>今日の記録 → AIがスコアを更新</div>
        <textarea
          value={taskInput}
          onChange={e => setTaskInput(e.target.value)}
          placeholder="例：筋トレした、Xに投稿した、YouTube撮影した、面接を受けた..."
          style={{ width: '100%', minHeight: 80, padding: '10px 12px', resize: 'vertical' }}
        />
        <button
          onClick={evalTasks}
          disabled={evaluating || !taskInput.trim()}
          style={{
            width: '100%', marginTop: 8, padding: '12px', borderRadius: 10,
            background: evaluating || !taskInput.trim() ? 'var(--surface2)' : 'var(--primary)',
            color: evaluating || !taskInput.trim() ? 'var(--text3)' : '#000',
            fontWeight: 600, fontSize: 14,
          }}
        >
          {evaluating ? '評価中...' : 'AIに評価してもらう →'}
        </button>

        {evalResult && (
          <div className="fade-up" style={{ marginTop: 10, padding: '12px', borderRadius: 10, background: evalResult.error ? 'rgba(255,99,64,0.1)' : 'rgba(0,217,126,0.08)', border: `1px solid ${evalResult.error ? 'rgba(255,99,64,0.3)' : 'rgba(0,217,126,0.2)'}` }}>
            {evalResult.error ? (
              <p style={{ fontSize: 13, color: 'var(--secondary)' }}>{evalResult.error}</p>
            ) : (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>{evalResult.highlight}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{evalResult.comment}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Object.entries(evalResult.changes || {}).filter(([, v]) => v !== 0).map(([k, v]) => {
                    const ax = AXES.find(a => a.k === k);
                    return <span key={k} className={`pill ${v > 0 ? 'pill-green' : 'pill-red'}`}>{ax?.s} {v > 0 ? '+' : ''}{v.toFixed(1)}</span>;
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent history */}
      {st.history.length > 0 && (
        <div className="glass" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>最近の記録</div>
          {[...st.history].reverse().slice(0, 5).map((h, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{h.date}</span>
                <span style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 180, textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.highlight}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 5 }}>{h.comment}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {Object.entries(h.changes || {}).filter(([, v]) => v !== 0).map(([k, v]) => {
                  const ax = AXES.find(a => a.k === k);
                  return <span key={k} className={`pill ${v > 0 ? 'pill-green' : 'pill-red'}`} style={{ fontSize: 10 }}>{ax?.s} {v > 0 ? '+' : ''}{v.toFixed(1)}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisTab({ st, portrait, portraitTs, analyzing, getPortrait }) {
  const pScores = portrait;
  return (
    <div className="fade-up">
      <button
        onClick={getPortrait}
        disabled={analyzing}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, marginBottom: 16,
          background: analyzing ? 'var(--surface2)' : 'var(--secondary-dim)',
          border: `1px solid ${analyzing ? 'var(--border)' : 'rgba(255,99,64,0.4)'}`,
          color: analyzing ? 'var(--text3)' : 'var(--secondary)',
          fontWeight: 600, fontSize: 14,
        }}
      >
        {analyzing ? '分析中...' : 'AIが現在の自分を分析する →'}
      </button>

      {portraitTs && (
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 12 }}>
          最終分析: {fmtDate(portraitTs)}
        </div>
      )}

      {pScores && !pScores.error && (
        <>
          {/* Creature */}
          <div className="portrait-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>今の自分</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--secondary)', marginBottom: 12, lineHeight: 1.3 }}>「{pScores.creature}」</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>{pScores.current}</p>
          </div>

          {/* Historical figure */}
          <div className="glass" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>最も近い歴史上の人物</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--purple)', marginBottom: 8 }}>{pScores.historical_figure}</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>{pScores.historical_reason}</p>
          </div>

          {/* Potential */}
          <div className="glass" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>内側にある可能性</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>{pScores.potential}</p>
          </div>

          {/* Gap */}
          <div className="glass" style={{ padding: '16px 18px', marginBottom: 12, borderColor: 'rgba(255,99,64,0.2)' }}>
            <div style={{ fontSize: 10, color: 'var(--secondary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>越えるべきギャップ</div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>{pScores.gap}</p>
          </div>

          {/* Action */}
          <div className="glass" style={{ padding: '16px 18px', marginBottom: 12, borderColor: 'rgba(0,217,126,0.2)' }}>
            <div style={{ fontSize: 10, color: 'var(--primary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>今すぐ動くなら</div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.8 }}>{pScores.action_metaphor}</p>
          </div>

          {/* Quote */}
          <div style={{ padding: '20px 18px', marginBottom: 12, borderLeft: '3px solid var(--primary)', background: 'rgba(0,217,126,0.04)' }}>
            <p style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1.9, marginBottom: 10 }}>「{pScores.quote}」</p>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>— {pScores.quote_author}</p>
          </div>
        </>
      )}

      {!pScores && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
          ボタンを押してAIに現在の自分を分析してもらいましょう。<br />
          歴史上の人物や比喩で、今の立ち位置が明確になります。
        </div>
      )}
    </div>
  );
}

const JOURNAL_TAGS = [
  { id: 'insight', label: '気づき', cls: 'pill-purple' },
  { id: 'quote', label: '名言', cls: 'pill-amber' },
  { id: 'goal', label: '目標', cls: 'pill-green' },
  { id: 'reflection', label: '振り返り', cls: 'pill-red' },
];

function JournalTab({ journal, input, setInput, tag, setTag, add, del }) {
  return (
    <div className="fade-up">
      <div className="glass" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>名言・気づきを記録する</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {JOURNAL_TAGS.map(t => (
            <button key={t.id} onClick={() => setTag(t.id)}
              className={`pill ${tag === t.id ? t.cls : ''}`}
              style={{ border: `1px solid ${tag === t.id ? 'transparent' : 'var(--border2)'}`, background: tag === t.id ? undefined : 'transparent', color: tag === t.id ? undefined : 'var(--text3)' }}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="名言、気づき、目標、振り返りなど..."
          style={{ width: '100%', minHeight: 80, padding: '10px 12px', resize: 'vertical' }}
        />
        <button
          onClick={add}
          disabled={!input.trim()}
          style={{
            width: '100%', marginTop: 8, padding: '11px', borderRadius: 10,
            background: !input.trim() ? 'var(--surface2)' : 'var(--primary-dim)',
            border: `1px solid ${!input.trim() ? 'var(--border)' : 'rgba(0,217,126,0.3)'}`,
            color: !input.trim() ? 'var(--text3)' : 'var(--primary)',
            fontWeight: 600, fontSize: 14,
          }}
        >
          記録する →
        </button>
      </div>

      {journal.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
          日々の気づきや名言を記録しましょう。<br />積み重ねることで思考が深まります。
        </div>
      ) : (
        [...journal].reverse().map((j, i) => {
          const t = JOURNAL_TAGS.find(x => x.id === j.tag) || JOURNAL_TAGS[0];
          return (
            <div key={j.ts} className="glass fade-up" style={{ padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span className={`pill ${t.cls}`}>{t.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{j.date}</span>
                  <button onClick={() => del(j.ts)} style={{ background: 'transparent', color: 'var(--text3)', fontSize: 14, padding: '0 2px' }}>✕</button>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{j.tag === 'quote' ? `「${j.text}」` : j.text}</p>
            </div>
          );
        })
      )}
    </div>
  );
}
