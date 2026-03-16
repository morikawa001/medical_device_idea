// ★ nurse_reserch と同じGASウェブアプリURLを使用（Gemini APIプロキシ）
const GAS_URL = "https://script.google.com/macros/s/AKfycbwFGWXonRPSDqhToxurlrxmvb0oMydOdM18_2Jy5aQWDXP60o6bKjkjYYfu741dgkqB/exec";

// ===== TRIZ 40の発明原理 正式リスト =====
const TRIZ_PRINCIPLES = `1|分割|Segmentation
2|分離|Taking Away
3|局所的性質|Local Quality
4|非対称|Asymmetry
5|組み合わせ|Combining
6|汎用性|Universality
7|入れ子構造|Nesting
8|つり合い|Counterweight
9|先取り反作用|Preliminary Anti-Action
10|先取り作用|Preliminary Action
11|事前保護|Beforehand Cushioning
12|等ポテンシャル|Equipotentiality
13|逆発想|The Other Way Round
14|曲面化|Spheroidality / Curvature
15|ダイナミック性|Dynamicity
16|過不足作用|Partial or Excessive Action
17|次元移行|Another Dimension
18|機械的振動|Mechanical Vibration
19|周期的作用|Periodic Action
20|有用作用の継続|Continuity of Useful Action
21|高速実行|Skip / Rushing Through
22|災い转じて福|Blessing in Disguise
23|フィードバック|Feedback
24|付介|Intermediary
25|セルフサービス|Self-Service
26|コピー|Copying
27|高価な長对寈命より安価な短对寈命|Cheap Short-Life Instead of Costly Long-Life
28|機械的システムの置換|Mechanics Substitution
29|空気圧・水圧の利用|Pneumatics and Hydraulics
30|柔軟な殼と薄膜|Flexible Shells and Thin Films
31|多孔質材料|Porous Materials
32|色の変化|Color Changes
33|均質性|Homogeneity
34|排除と再生|Discarding and Recovering
35|パラメータ変化|Parameter Changes
36|相変化|Phase Transitions
37|熱膨張|Thermal Expansion
38|高濃度酸素の利用|Enriched Atmosphere
39|不活性雰囲気|Inert Atmosphere
40|複合材料|Composite Materials`;

function getCheckedItems() {
  return Array.from(document.querySelectorAll('.checkbox-group input[type=checkbox]:checked'))
    .map(cb => cb.value);
}

async function generate() {
  const ideaTitle       = document.getElementById('ideaTitle').value.trim();
  const problem         = document.getElementById('problem').value.trim();
  const device          = document.getElementById('device').value.trim();
  const targetUser      = document.getElementById('targetUser').value.trim();
  const setting         = document.getElementById('setting').value.trim();
  const contradictionEl = document.getElementById('contradiction');
  const contradiction   = contradictionEl ? contradictionEl.value.trim() : '';
  const items           = getCheckedItems();

  if (!ideaTitle) { alert('アイデア名を入力してください。'); return; }
  if (!problem)   { alert('解決したい医療課題を入力してください。'); return; }

  const btn           = document.getElementById('generateBtn');
  const loading       = document.getElementById('loading');
  const result        = document.getElementById('result');
  const errorBox      = document.getElementById('errorBox');
  const resultContent = document.getElementById('resultContent');
  const statusBar     = document.getElementById('statusBar');
  const copyBtn       = document.getElementById('copyBtn');

  btn.disabled            = true;
  loading.style.display   = 'flex';
  result.style.display    = 'none';
  errorBox.style.display  = 'none';
  resultContent.innerHTML = '';
  statusBar.textContent   = '';
  copyBtn.style.display   = 'none';

  const prompt = buildPrompt(ideaTitle, problem, device, targetUser, setting, contradiction, items);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, topP: 0.85, maxOutputTokens: 8192 }
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'APIエラー: ' + response.status);
    }
    const data     = await response.json();
    const fullText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!fullText) throw new Error('レスポンスが空です。GASのデプロイ設定を確認してください。');

    loading.style.display   = 'none';
    result.style.display    = 'block';
    resultContent.innerHTML = markdownToHtml(fullText);
    statusBar.innerHTML     = '<span class="status-done">✅ 分析完了（' + fullText.length + '文字）</span>';
    copyBtn.style.display   = 'inline-block';
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    loading.style.display  = 'none';
    result.style.display   = 'none';
    errorBox.textContent   = 'エラーが発生しました: ' + e.message;
    errorBox.style.display = 'block';
  } finally {
    btn.disabled          = false;
    loading.style.display = 'none';
  }
}

// ===== プロンプト構築 =====
function buildPrompt(ideaTitle, problem, device, targetUser, setting, contradiction, items) {
  let p = `あなたは医療機器開発の専門家（医療工学・薬機法・知財・事業化・発明工学）です。
以下の医療機器開発アイデアについて、指定された項目を分析してください。

❗️ **重要な制約ルール**：
- 特許番号・著者名・論文名・DOI・PMIDなどの具体的識別情報は「実在すると確信できるもののみ」を記載してください。
- 存在を確信できない場合は、数字・ID・名前などの具体的情報は一切作成・ハルシネーションしないでください。
- 「実在する可能性が高い」だけでは不十分です。「実在すると言える」情報のみを出力してください。
- 不確かな具体的情報は「記載なし」とし、代わりに「検索推奨キーワード」や「調査方法の指示」を記載してください。

## 入力情報
- アイデア名: ${ideaTitle}
- 解決したい医療課題: ${problem}
`;
  if (device)        p += `- デバイス概要: ${device}\n`;
  if (targetUser)    p += `- 想定ユーザー: ${targetUser}\n`;
  if (setting)       p += `- 使用場面: ${setting}\n`;
  if (contradiction) p += `- 技術的トレードオフ・矛盾: ${contradiction}\n`;

  p += `\n## 分析項目\n以下の項目をすべて出力してください：\n\n`;

  if (items.includes('TRIZ矛盾分析')) {
    p += `### 🧩 0. TRIZ（発明的問題解決）分析
TRIZの思考プロセスに従い、以下のステップで分析してください。

**ステップ1: 機能分析**
- このデバイス・システムが果たすべき主要機能を列挙してください
- 有害機能・不要機能も特定してください

**ステップ2: 技術的矛盾の特定**
- 改善しようとすると悪化するパラメータのペアを特定してください（例：精度↑→コスト↑）
- 物理的矛盾があれば特定してください（例：「硬くあるべきだが柔らかくもあるべき」）
- 入力された技術的トレードオフ（${contradiction || '未入力'}）も考慮してください

**ステップ3: 発明原理の適用**
以下はTRIZの40の発明原理の正式リストです。必ずこのリストの番号と原理名をそのまま使用してください：

${TRIZ_PRINCIPLES}

上記のリストからこの課題に最も適した原理を3〜5個選び、以下のルールを必ず守って表形式で出力してください。

❗️ **表の出力ルール（必須）**：
- 必ず4列構成：「原理番号」「原理名（日本語）」「内容（30字以内）」「本アイデアへの適用例（50字以内）」
- 原理番号と原理名は必ず上記正式リストの値をそのまま使用すること
- セル内に「|」は一切使わないこと
- 1行1原理、必ず改行すること
- 表のフォーマット例：
| 原理番号 | 原理名 | 内容 | 適用例 |
|------|------|------|------|
| 1 | 分割 | 物体を部分に分ける | センサーを分散配置 |
| 5 | 組み合わせ | 複数要素を統合 | 計測と誘導を一体化 |

**ステップ4: 理想最終結果（IFR）の設定**
- 「デバイスが存在しなくても、システムが自律的に問題を解決するとしたら？」という観点でIFRを記述してください
- IFRに近づけるための具体的な設計アイデアを2〜3点提案してください

**ステップ5: 物質－場モデル（Su-Field）による分析**
- このシステムの主な作用物質と場（エネルギー）を特定してください
- 有害作用・不足作用を改善する手法を提案してください

**ステップ6: TRIZによる新たな発明コンセプト提案**
- 上記の分析を踏まえ、元のアイデアを発展・変革させた新しい設計コンセプトを2〜3案提示してください\n\n`;
  }

  if (items.includes('関連特許')) {
    p += `### 🔖 1. 関連特許調査

⚠️ **出力ルール（必ず守ってください）**：
- 特許番号（例：JP2023-XXXXXX、US10XXXXXXX）は「実在すると断言できるもののみ」記載し、
  不確かな場合は「番号不明」と明記してください。絶対に番号を作成・ハルシネーションしないでください。
- 出願人・出願人名も同様です。確認できない場合は「不明」と記載してください。
- 代わりに「実際に検索すべきJ-PlatPat / Google Patentsのキーワード」を必ず提示してください。

以下の内容を出力してください：

**A. 実在する特許情報（確認できたもののみ）**
| 特許番号 | 出願人 | 概要 | 公開年 |
|------|------|------|------|

**B. 特許の技術的動向（実在する知識に基づいた記述）**
- この技術領域で許諾されている主な技術アプローチの概要
- 本アイデアの新規性・進歩性の評価（概略）
- 差別化のために重要なクレーム要素

**C. 推奨検索データベースとキーワード**
- J-PlatPat（日本語・英語）
- Google Patents / Espacenet
- 推奨IPC分類コード：（記載）
- 推奨検索キーワード：（日本語・英語それぞれ3件以上）\n\n`;
  }

  if (items.includes('先行研究')) {
    p += `### 📚 2. 先行研究・エビデンス

⚠️ **出力ルール（必ず守ってください）**：
- 著者名・DOI・PMID・雑誌名の具体的な数字・名前は「確認できるもののみ」記載してください。
- 「実在する可能性が高い」ではなく、「実在すると言える」もののみ記載し、不確かな場合は「要確認」としてください。
- 絶対に存在しない論文情報を作成（ハルシネーション）しないでください。

以下の内容を出力してください：

**A. 実在する論文情報（確認できたもののみ）**
| 著者 | 発行年 | 雑誌名 | 主な知見 | DOI/PMID |
|------|------|------|------|------|

**B. 研究動向の概要（実在する知識に基づくサマリー）**
- 現時点でのこの技術領域の研究エビデンスレベルの評価
- 未解決の研究課題（発表済み知識に基づく）

**C. 推奨検索情報**
- PubMed検索キーワード（英語5個）
- 医中誌・検索キーワード（日本語3個）
- Cochrane Library / CINAHLでの推奨フィルター\n\n`;
  }

  if (items.includes('採算性')) {
    p += `### 💴 3. 採算性・事業性分析
- 想定市場規模（国内・海外）の概算
- 開発費用の目安（フェーズ別：概念実証→試作→承認取得→製造）
- 想定販売価格帯と収益モデルの提案
- 損益分岐点の概算（台数・期間）
- 主な収益化リスクと対策\n\n`;
  }

  if (items.includes('開発ロードマップ')) {
    p += `### 🗺️ 4. 開発ロードマップ案
| フェーズ | 期間目安 | 主なタスク | 必要リソース | マイルストーン |
|------|------|------|------|------|
- フェーズ1: 概念実証（POC）
- フェーズ2: 試作・動物実験
- フェーズ3: 臨床試験（治験）
- フェーズ4: 薬機法承認申請
- フェーズ5: 製造・市場投入
- 各フェーズで想定される主なリスクと対応策も記載\n\n`;
  }

  if (items.includes('競合製品分析')) {
    p += `### 🏭 5. 競合製品分析
- 国内外の競合製品・代替品を3〜5件列挙（製品名・企業・特徴・価格帯）
- 本アイデアの差別化ポイント（競合比較表）\n\n`;
  }

  if (items.includes('規制・薬機法対応')) {
    p += `### ⚖️ 6. 規制・薬機法対応
- 想定される医療機器クラス分類（クラスⅠ〜Ⅳ）と根拠
- 必要な認証・承認の種類（届出・認証・承認）
- QMS省令対応のポイント
- 国際規格（ISO 13485、IEC 62304等）の適用可能性\n\n`;
  }

  p += `最後に、**総合評価**として本アイデアの実現可能性・市場性・医療貢献度を5段階で評価し、最も重要な次のアクション（Next Step）を3点まとめてください。`;
  return p;
}

// ===== Markdown → HTML 変換 =====
function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '', tableRows = [], listItems = [], inOl = false;

  function headingClass(text) {
    if (text.includes('TRIZ') || text.includes('発明')) return 'triz';
    if (text.includes('特許'))   return 'patent';
    if (text.includes('先行研究') || text.includes('エビデンス')) return 'research';
    if (text.includes('採算') || text.includes('事業')) return 'finance';
    if (text.includes('ロードマップ') || text.includes('開発')) return 'roadmap';
    return 'other';
  }

  function flushList() {
    if (!listItems.length) return;
    const tag = inOl ? 'ol' : 'ul';
    html += '<' + tag + '>' + listItems.map(i => '<li>' + i + '</li>').join('') + '</' + tag + '>';
    listItems = []; inOl = false;
  }

  function escapeCell(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  function flushTable() {
    if (!tableRows.length) return;
    let t = '<table>';
    let headerDone = false;
    let bodyOpen   = false;

    tableRows.forEach(function(row) {
      const trimmed = row.trim();
      if (/^\|[\s\-:\|]+\|$/.test(trimmed)) {
        if (!bodyOpen) { t += '<tbody>'; bodyOpen = true; }
        return;
      }
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (!headerDone) {
        t += '<thead><tr>' + cells.map(c => '<th>' + escapeCell(c) + '</th>').join('') + '</tr></thead>';
        headerDone = true;
      } else {
        if (!bodyOpen) { t += '<tbody>'; bodyOpen = true; }
        t += '<tr>' + cells.map(c => '<td>' + escapeCell(c) + '</td>').join('') + '</tr>';
      }
    });
    if (bodyOpen) t += '</tbody>';
    t += '</table>';
    html += t;
    tableRows = [];
  }

  lines.forEach(line => {
    if (line.trim().startsWith('|')) {
      flushList();
      tableRows.push(line);
      return;
    }
    if (tableRows.length) flushTable();

    if (/^#{1,3} /.test(line)) {
      flushList();
      const text = line.replace(/^#+\s+/, '');
      html += '<h3 class="' + headingClass(text) + '">' + escapeCell(text) + '</h3>';
    } else if (/^\*\*ステップ\d/.test(line) || /^\*\*Step/.test(line)) {
      flushList();
      html += '<p class="triz-step">' + escapeCell(line) + '</p>';
    } else if (/^\*\*[ABC]\./.test(line)) {
      flushList();
      html += '<p class="subsection-head">' + escapeCell(line) + '</p>';
    } else if (/^[-*] /.test(line)) {
      inOl = false;
      listItems.push(escapeCell(line.replace(/^[-*] /, '')));
    } else if (/^\d+\. /.test(line)) {
      inOl = true;
      listItems.push(escapeCell(line.replace(/^\d+\. /, '')));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      html += '<p>' + escapeCell(line) + '</p>';
    }
  });
  flushList();
  flushTable();
  return html;
}

function inl(t) {
  return t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function copyResult() {
  const text = document.getElementById('resultContent').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const b = document.getElementById('copyBtn');
    b.textContent = '✅ コピーしました！';
    setTimeout(() => { b.textContent = '📋 結果をコピー'; }, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ideaTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') generate();
  });
  const trizCheckbox = document.querySelector('.checkbox-group input[value="TRIZ矛盾分析"]');
  const trizField    = document.getElementById('trizField');
  if (trizCheckbox && trizField) {
    trizCheckbox.addEventListener('change', () => {
      trizField.style.display = trizCheckbox.checked ? 'block' : 'none';
    });
  }
});
