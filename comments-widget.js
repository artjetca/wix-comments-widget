class CommentsWidget extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.comments = [];
    this.replyingTo = null;
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.dispatchEvent(new CustomEvent('ready'));
  }

  static get observedAttributes() {
    return ['comments-data', 'stats-data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'comments-data' && newValue) {
      try {
        this.comments = JSON.parse(newValue);
        this.renderComments();
      } catch (e) {
        console.error('解析留言資料失敗', e);
      }
    }
    if (name === 'stats-data' && newValue) {
      try {
        const stats = JSON.parse(newValue);
        this.updateStats(stats);
      } catch (e) {
        console.error('解析統計資料失敗', e);
      }
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif; }
        :host { display: block; background: #FDF6F0; color: #2F2E41; padding: 20px; }
        
        .share-bar { display: flex; gap: 16px; margin-bottom: 24px; }
        .share-btn { width: 28px; height: 28px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s; }
        .share-btn:hover { opacity: 1; }
        
        .stats-bar { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #E8E8E8; margin-bottom: 32px; }
        .stats-left { display: flex; gap: 24px; color: #7A7A7A; font-size: 14px; }
        .stats-right { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .heart-btn { font-size: 20px; color: #E63946; transition: transform 0.2s; }
        .heart-btn:hover { transform: scale(1.2); }
        
        .comment-title { font-size: 18px; font-weight: 600; color: #3D5A80; margin-bottom: 16px; }
        .input-area { background: #fff; border: 1px solid #E8E8E8; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .input-row { display: flex; gap: 16px; margin-bottom: 12px; }
        .input-field { flex: 1; padding: 12px; border: 1px solid #E8E8E8; border-radius: 6px; font-size: 14px; outline: none; }
        .input-field:focus { border-color: #3D5A80; }
        .message-input { width: 100%; min-height: 80px; padding: 12px; border: 1px solid #E8E8E8; border-radius: 6px; font-size: 14px; resize: vertical; outline: none; font-family: inherit; }
        .message-input:focus { border-color: #3D5A80; }
        
        .toolbar { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
        .toolbar-icons { display: flex; gap: 12px; }
        .toolbar-icon { width: 24px; height: 24px; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        .toolbar-icon:hover { opacity: 1; }
        .btn-cancel { padding: 10px 20px; background: transparent; border: none; color: #7A7A7A; cursor: pointer; font-size: 14px; }
        .btn-cancel:hover { color: #2F2E41; }
        .btn-submit { padding: 10px 24px; background: #3D5A80; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 14px; }
        .btn-submit:hover { background: #2C4A6E; }
        
        .sort-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-size: 14px; color: #7A7A7A; }
        .sort-select { border: none; background: transparent; color: #2F2E41; font-size: 14px; cursor: pointer; outline: none; }
        
        .comments-list { display: flex; flex-direction: column; gap: 24px; }
        .comment-item { display: flex; gap: 16px; }
        .comment-item.reply { margin-left: 56px; }
        .avatar { width: 48px; height: 48px; border-radius: 50%; background: #B8D4E3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .avatar svg { width: 28px; height: 28px; fill: #fff; }
        .comment-content { flex: 1; }
        .comment-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
        .comment-name { font-weight: 600; font-size: 14px; }
        .comment-date { font-size: 13px; color: #7A7A7A; }
        .comment-text { font-size: 15px; line-height: 1.6; margin-bottom: 8px; word-wrap: break-word; }
        .comment-edited { font-size: 13px; color: #3D5A80; text-decoration: underline; margin-bottom: 8px; }
        .comment-actions { display: flex; gap: 16px; align-items: center; }
        .action-btn { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #7A7A7A; font-size: 13px; cursor: pointer; }
        .action-btn:hover { color: #2F2E41; }
        .more-btn { margin-left: auto; background: none; border: none; font-size: 20px; color: #7A7A7A; cursor: pointer; }
        
        .replying-to { display: none; background: #f0f4f8; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; color: #3D5A80; justify-content: space-between; align-items: center; }
        .replying-to.show { display: flex; }
        .replying-to button { background: none; border: none; color: #7A7A7A; cursor: pointer; font-size: 16px; }
        
        .reply-to-name { color: #3D5A80; font-weight: 500; }
      </style>
      
      <!-- 社群分享列 -->
      <div class="share-bar">
        <svg class="share-btn" id="fbShare" viewBox="0 0 24 24" fill="#2F2E41"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        <svg class="share-btn" id="xShare" viewBox="0 0 24 24" fill="#2F2E41"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        <svg class="share-btn" id="linkedinShare" viewBox="0 0 24 24" fill="#2F2E41"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        <svg class="share-btn" id="copyLink" viewBox="0 0 24 24" fill="none" stroke="#2F2E41" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </div>

      <!-- 統計列 -->
      <div class="stats-bar">
        <div class="stats-left">
          <span id="viewCount">0 次查看</span>
          <span id="commentCountTop">0 則留言</span>
        </div>
        <div class="stats-right" id="articleLikeBtn">
          <span id="articleLikeNum">0</span>
          <span class="heart-btn">♥</span>
        </div>
      </div>

      <!-- 留言標題 -->
      <div class="comment-title" id="commentCount">0 則留言</div>
      
      <!-- 輸入區 -->
      <div class="input-area">
        <div class="replying-to" id="replyingTo">
          <span id="replyingToText"></span>
          <button id="cancelReplyBtn">✕</button>
        </div>
        <div class="input-row">
          <input type="text" class="input-field" id="nameInput" placeholder="使用者名稱">
          <input type="email" class="input-field" id="emailInput" placeholder="電子郵件（不公開分享）">
        </div>
        <textarea class="message-input" id="messageInput" placeholder="撰寫留言......"></textarea>
        <div class="toolbar">
          <div class="toolbar-icons">
            <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><text x="6" y="16" font-size="8" fill="#7A7A7A" stroke="none">GIF</text></svg>
            <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="#7A7A7A" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          </div>
          <div>
            <button class="btn-cancel" id="cancelBtn">取消</button>
            <button class="btn-submit" id="submitBtn">發佈</button>
          </div>
        </div>
      </div>
      
      <!-- 排序 -->
      <div class="sort-bar">
        排序方式：
        <select class="sort-select" id="sortSelect">
          <option value="newest">最新</option>
          <option value="oldest">最舊</option>
        </select>
      </div>

      <!-- 留言列表 -->
      <div class="comments-list" id="commentsList"></div>
    `;
  }

  setupEventListeners() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // 社群分享
    $('fbShare').onclick = () => this.emitEvent('share', { platform: 'facebook' });
    $('xShare').onclick = () => this.emitEvent('share', { platform: 'x' });
    $('linkedinShare').onclick = () => this.emitEvent('share', { platform: 'linkedin' });
    $('copyLink').onclick = () => this.emitEvent('share', { platform: 'copy' });

    // 文章按讚
    $('articleLikeBtn').onclick = () => this.emitEvent('likeArticle');

    // 送出留言
    $('submitBtn').onclick = () => this.submitComment();
    $('cancelBtn').onclick = () => this.cancelComment();
    $('cancelReplyBtn').onclick = () => this.cancelReply();

    // 排序
    $('sortSelect').onchange = () => this.emitEvent('sortChange', { sort: $('sortSelect').value });
  }

  submitComment() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    const name = $('nameInput').value.trim();
    const email = $('emailInput').value.trim();
    const content = $('messageInput').value.trim();

    if (!content) {
      alert('請輸入留言內容');
      return;
    }

    this.emitEvent('submitComment', {
      name: name || '訪客',
      email,
      content,
      parentId: this.replyingTo?.id || null,
      replyToName: this.replyingTo?.name || null
    });

    this.cancelComment();
  }

  cancelComment() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('nameInput').value = '';
    $('emailInput').value = '';
    $('messageInput').value = '';
    this.cancelReply();
  }

  startReply(id, name) {
    this.replyingTo = { id, name };
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('replyingTo').classList.add('show');
    $('replyingToText').textContent = `回覆 @${name}`;
    $('messageInput').focus();
  }

  cancelReply() {
    this.replyingTo = null;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('replyingTo').classList.remove('show');
  }

  renderComments() {
    const container = this.shadowRoot.getElementById('commentsList');
    if (!container) return;
    
    container.innerHTML = '';

    this.comments.forEach(item => {
      const div = document.createElement('div');
      div.className = 'comment-item' + (item.parentId ? ' reply' : '');
      div.innerHTML = `
        <div class="avatar">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="comment-content">
          <div class="comment-header">
            <div>
              <div class="comment-name">${this.escapeHtml(item.name) || '匿名'}</div>
              <div class="comment-date">${this.formatDate(item._createdDate)}</div>
            </div>
            <button class="more-btn">⋮</button>
          </div>
          <div class="comment-text">${item.replyToName ? '<span class="reply-to-name">@' + this.escapeHtml(item.replyToName) + '</span> ' : ''}${this.escapeHtml(item.content) || ''}</div>
          ${item.isEdited ? '<div class="comment-edited">已編輯</div>' : ''}
          <div class="comment-actions">
            <button class="action-btn like-btn" data-id="${item._id}">♡ 按讚${item.likes ? ' ' + item.likes : ''}</button>
            <button class="action-btn reply-btn" data-id="${item._id}" data-name="${this.escapeHtml(item.name) || '匿名'}">↩ 回覆</button>
          </div>
        </div>
      `;
      container.appendChild(div);
    });

    // 綁定按讚和回覆事件
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.onclick = () => this.emitEvent('likeComment', { commentId: btn.dataset.id });
    });
    container.querySelectorAll('.reply-btn').forEach(btn => {
      btn.onclick = () => this.startReply(btn.dataset.id, btn.dataset.name);
    });

    // 更新計數
    const count = this.comments.length;
    const countEl = this.shadowRoot.getElementById('commentCount');
    const countTopEl = this.shadowRoot.getElementById('commentCountTop');
    if (countEl) countEl.textContent = `${count} 則留言`;
    if (countTopEl) countTopEl.textContent = `${count} 則留言`;
  }

  updateStats(stats) {
    const viewEl = this.shadowRoot.getElementById('viewCount');
    const likeEl = this.shadowRoot.getElementById('articleLikeNum');
    if (viewEl) viewEl.textContent = `${(stats.views || 0).toLocaleString()} 次查看`;
    if (likeEl) likeEl.textContent = stats.likes || 0;
  }

  emitEvent(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  formatDate(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '1 天前';
    if (days < 7) return `${days} 天前`;
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

customElements.define('comments-widget', CommentsWidget);
