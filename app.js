// ★ nurse_reserch と同じGASウェブアプリURLを使用（Gemini APIプロキシ）
// 別のGASをデプロイした場合はそのURLに変更してください
const GAS_URL = "https://script.google.com/macros/s/AKfycbwFGWXonRPSDqhToxurlrxmvb0oMydOdM18_2Jy5aQWDXP60o6bKjkjYYfu741dgkqB/exec";

// チェックボックスの値を収集
function getCheckedItems() {
  return Array.from(document.querySelectorAll('.checkbox-group input[type=checkbox]:checked'))
    .map(cb => cb.value);
}

// メイン実行
async function generate() {
  const ideaTitle  = document.getElementById('ideaTitle').value.trim();
  const problem    = document.getElementById('problem').value.trim();
  const device     = document.getElementById('device').value.trim();
  const targetUser = document.getElementById('targetUser').value.trim();
  const setting    = document.getElementById('setting').value.trim();
  const items      = getCheckedItems();

  if (!ideaTitle) { alert('アイデア名を入力してください。'); return; }
  if (!problem)   { alert('解決したい医療課題を入力してください。'); return; }

  const btn           = document.getElementById('generateBtn');
  const loading       = document.getElementById('loading');
  const result        = document.getElementById('result');
  const errorBox      = document.getElementById('errorBox');
  const resultContent = document.getElementById('resultContent');
  const statusBar     = document.getElementById('statusBar');
  const copyBtn       = document.getElementById('copyBtn');

  // UI初期化
  btn.disabled            = true;
  loading.style.display   = 'flex';
  result.style.display    = 'none';
  errorBox.style.display  = 'none';
  resultContent.innerHTML = '';
  statusBar.textContent   = '';
  copyBtn.style.display   = 'none';

  const prompt = buildPrompt(ideaTitle, problem, device, targetUser, setting, items);

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 8192
        }
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
function buildPrompt(ideaTitle, problem, device, targetUser, setting, items) {
  let p = `あなたは医療機器開発の専門家（医療工学・薬機法・知財・事業化）です。
以下の医療機器開発アイデアについて、指定された項目を詳細に分析してください。

## 入力情報
- アイデア名: ${ideaTitle}
- 解決したい医療課題: ${problem}
`;
  if (device)     p += `- デバイス概要: ${device}\n`;
  if (targetUser) p += `- 想定ユーザー: ${targetUser}\n`;
  if (setting)    p += `- 使用場面: ${setting}\n`;

  p += `\n## 分析項目\n以下の項目をすべて出力してください：\n\n`;

  if (items.includes('関連特許')) {
    p += `### 🔖 1. 関連特許調査
- 類似する既存特許の概要を3〜5件挙げ、特許番号・出願人・概要を表形式で示してください
- 本アイデアの特許取得可能性（新規性・進歩性の観点）を評価
- 参考にすべきIPCコード（国際特許分類）を提示
- 特許出願時の注意点・差別化すべきクレームポイント\n\n`;
  }
  if (items.includes('先行研究')) {
    p += `### 📚 2. 先行研究・エビデンス
- 関連する先行研究の概要（3〜5件、著者・年・ジャーナル・主な知見）を表形式で
- 現時点での研究エビデンスレベルの評価
- 本アイデアが取り組む未解決の研究課題
- 推奨するPubMed検索キーワード（英語5個）\n\n`;
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
以下を表形式で示してください：
| フェーズ | 期間目安 | 主なタスク | 必要リソース | マイルストーン |
|---------|---------|-----------|------------|-------------|
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

  // セクション見出しの色分けクラス判定
  function headingClass(text) {
    if (text.includes('特許'))   return 'patent';
    if (text.includes('先行研究') || text.includes('エビデンス')) return 'research';
    if (text.includes('採算') || text.includes('事業')) return 'finance';
    if (text.includes('ロードマップ') || text.includes('開発')) return 'roadmap';
    return 'other';
  }

  function flushList() {
    if (!listItems.length) return;
    const tag = inOl ? 'ol' : 'ul';
    html += `<${tag}>` + listItems.map(i => `<li>${i}</li>`).join('') + `</${tag}>`;
    listItems = []; inOl = false;
  }

  function flushTable() {
    if (!tableRows.length) return;
    let t = '<table><thead>';
    let bodyStarted = false;
    tableRows.forEach((row, i) => {
      if (/^\|[-:\s|]+\|$/.test(row.trim())) {
        t += '</thead><tbody>'; bodyStarted = true; return;
      }
      const cells = row.trim().split('|').filter((_, ci) => ci > 0 && ci < row.trim().split('|').length - 1).map(c => c.trim());
      if (!bodyStarted) {
        t += '<tr>' + cells.map(c => `<th>${inl(c)}</th>`).join('') + '</tr>';
      } else {
        t += '<tr>' + cells.map(c => `<td>${inl(c)}</td>`).join('') + '</tr>';
      }
    });
    if (bodyStarted) t += '</tbody>'; else t += '</thead>';
    t += '</table>';
    html += t; tableRows = [];
  }

  lines.forEach(line => {
    if (line.trim().startsWith('|')) {
      flushList(); tableRows.push(line); return;
    }
    if (tableRows.length) flushTable();

    if (/^#{1,3} /.test(line)) {
      flushList();
      const text = line.replace(/^#+\s+/, '');
      const cls  = headingClass(text);
      html += `<h3 class="${cls}">${inl(text)}</h3>`;
    } else if (/^[-*] /.test(line)) {
      inOl = false;
      listItems.push(inl(line.replace(/^[-*] /, '')));
    } else if (/^\d+\. /.test(line)) {
      inOl = true;
      listItems.push(inl(line.replace(/^\d+\. /, '')));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      html += `<p>${inl(line)}</p>`;
    }
  });
  flushList(); flushTable();
  return html;
}

// インラインMarkdown変換
function inl(t) {
  return t
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

// コピー機能
function copyResult() {
  const text = document.getElementById('resultContent').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const b = document.getElementById('copyBtn');
    b.textContent = '✅ コピーしました！';
    setTimeout(() => { b.textContent = '📋 結果をコピー'; }, 2000);
  });
}

// Enterキーでも送信
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ideaTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') generate();
  });
});
