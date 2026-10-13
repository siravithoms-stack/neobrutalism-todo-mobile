/**
 * ============================================================================
 * Clean Neo-Brutalism To-Do List Mobile Application
 * Core App Controller & State Manager (Fast & Frictionless)
 * ============================================================================
 */

(function() {
  'use strict';

  // --- App State ---
  const STATE = {
    tasks: [],
    filter: 'all', // 'all' | 'active' | 'completed'
    theme: 'warm-oat',
    isSyncing: false
  };

  const STORAGE_KEY = 'todo_app_tasks_v2';
  const THEME_KEY = 'todo_app_theme_v1';

  // ข้อมูลตัวอย่างเริ่มต้น (เรียบง่าย สบายตา)
  const DEFAULT_SAMPLE_TASKS = [
    {
      id: 'task_demo_1',
      title: 'เตรียมสรุปเนื้อหาประชุมทีมสัปดาห์นี้',
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_demo_2',
      title: 'โทรศัพท์นัดหมายส่งมอบงานกับลูกค้า',
      completed: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_demo_3',
      title: 'ซื้อของสดและของใช้จำเป็นเข้าบ้าน',
      completed: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'task_demo_4',
      title: 'ทดสอบเชื่อมต่อ Google Sheets Database',
      completed: false,
      createdAt: new Date().toISOString()
    }
  ];

  // DOM Elements Cache
  const DOM = {};

  function init() {
    cacheDom();
    setupTheme();
    loadTasks();
    setupEventListeners();
    setupSyncListener();
    renderDate();
    render();

    // ดึงข้อมูลจาก Google Sheets หากมีการเชื่อมต่อไว้แล้ว
    if (window.sheetsSync && window.sheetsSync.isConnected()) {
      syncFromGoogleSheets();
    }
  }

  function cacheDom() {
    DOM.viewport = document.querySelector('.app-viewport');
    DOM.headerDate = document.getElementById('headerDate');
    DOM.syncBtn = document.getElementById('syncIndicatorBtn');
    DOM.syncDot = document.getElementById('syncDot');
    DOM.syncText = document.getElementById('syncText');
    DOM.themeBtn = document.getElementById('themeToggleBtn');
    DOM.sheetsModalBtn = document.getElementById('sheetsModalBtn');

    // Progress
    DOM.progressFill = document.getElementById('progressBarFill');
    DOM.progressText = document.getElementById('progressText');
    DOM.progressBadge = document.getElementById('progressBadge');

    // Filters
    DOM.filterTabs = document.querySelectorAll('.filter-tab');
    DOM.countAll = document.getElementById('countAll');
    DOM.countActive = document.getElementById('countActive');
    DOM.countCompleted = document.getElementById('countCompleted');

    // Task List
    DOM.taskList = document.getElementById('taskList');
    DOM.emptyState = document.getElementById('emptyState');

    // Bottom Quick Add
    DOM.quickForm = document.getElementById('quickAddForm');
    DOM.quickInput = document.getElementById('quickTaskInput');

    // Modals
    DOM.sheetsModal = document.getElementById('sheetsModal');
    DOM.sheetsForm = document.getElementById('sheetsConfigForm');
    DOM.sheetsUrlInput = document.getElementById('sheetsUrlInput');
    DOM.testSheetsBtn = document.getElementById('testSheetsBtn');
    DOM.closeSheetsModal = document.getElementById('closeSheetsModal');

    DOM.themeModal = document.getElementById('themeModal');
    DOM.themeCards = document.querySelectorAll('.theme-card-option');
    DOM.closeThemeModal = document.getElementById('closeThemeModal');

    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.confettiCanvas = document.getElementById('confettiCanvas');
  }

  // --- Theme Management ---
  function setupTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'warm-oat';
    setTheme(savedTheme);
  }

  function setTheme(themeName) {
    STATE.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(THEME_KEY, themeName);

    if (DOM.themeCards) {
      DOM.themeCards.forEach(card => {
        if (card.dataset.theme === themeName) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }
  }

  // --- Task Data Layer ---
  function loadTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        STATE.tasks = JSON.parse(data);
      } else {
        STATE.tasks = [...DEFAULT_SAMPLE_TASKS];
        saveTasks();
      }
    } catch (e) {
      STATE.tasks = [...DEFAULT_SAMPLE_TASKS];
    }
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.tasks));
  }

  // --- Google Sheets Sync Engine ---
  function setupSyncListener() {
    if (!window.sheetsSync) return;

    window.sheetsSync.onStatusChange((status, message) => {
      updateSyncUI(status, message);
    });

    if (window.sheetsSync.isConnected()) {
      updateSyncUI('online', 'เชื่อมต่อแล้ว');
    } else {
      updateSyncUI('offline', 'ออฟไลน์');
    }
  }

  function updateSyncUI(status, message) {
    if (!DOM.syncDot || !DOM.syncText) return;

    DOM.syncDot.className = 'sync-dot';
    if (status === 'online') {
      DOM.syncText.textContent = 'Google Sheets';
    } else if (status === 'syncing') {
      DOM.syncDot.classList.add('syncing');
      DOM.syncText.textContent = 'กำลังซิงค์...';
    } else if (status === 'offline') {
      DOM.syncDot.classList.add('offline');
      DOM.syncText.textContent = 'ออฟไลน์';
    } else if (status === 'error') {
      DOM.syncDot.classList.add('error');
      DOM.syncText.textContent = 'แจ้งเตือน';
    }
  }

  async function syncFromGoogleSheets() {
    if (!window.sheetsSync || !window.sheetsSync.isConnected()) return;

    try {
      const remoteTasks = await window.sheetsSync.fetchAll();
      if (remoteTasks && Array.isArray(remoteTasks) && remoteTasks.length > 0) {
        STATE.tasks = remoteTasks;
        saveTasks();
        render();
        showToast('ซิงค์ข้อมูลจาก Google Sheets เรียบร้อย');
      }
    } catch (err) {
      console.warn('Sync failed:', err);
    }
  }

  // --- Fast Task Actions (Frictionless) ---
  function addTask(title) {
    if (!title || !title.trim()) return;

    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    STATE.tasks.unshift(newTask);
    saveTasks();
    render();
    triggerHaptic();
    showToast(`เพิ่มงานสำเร็จ`);

    // บันทึกลง Google Sheets
    if (window.sheetsSync) {
      window.sheetsSync.addTask(newTask);
    }
  }

  function toggleTask(id) {
    const task = STATE.tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();
    saveTasks();
    render();
    triggerHaptic();

    if (task.completed) {
      showToast(`ทำเสร็จแล้ว!`);
      // ตรวจสอบว่าทำงานครบทุกงานหรือไม่
      const activeCount = STATE.tasks.filter(t => !t.completed).length;
      if (activeCount === 0 && STATE.tasks.length > 0) {
        launchConfetti();
        showToast(`ยินดีด้วย! ทำงานครบทุกรายการแล้ว`);
      }
    }

    // ซิงค์สถานะกับ Google Sheets
    if (window.sheetsSync) {
      window.sheetsSync.toggleTask(id, task.completed);
    }
  }

  function deleteTask(id) {
    const index = STATE.tasks.findIndex(t => t.id === id);
    if (index === -1) return;

    const deleted = STATE.tasks.splice(index, 1)[0];
    saveTasks();
    render();
    triggerHaptic();
    showToast(`ลบรายการแล้ว`);

    // ลบออกจาก Google Sheets
    if (window.sheetsSync) {
      window.sheetsSync.deleteTask(id);
    }
  }

  // --- UI Rendering ---
  function renderDate() {
    if (!DOM.headerDate) return;
    const now = new Date();
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const dayName = thaiDays[now.getDay()];
    const dateNum = now.getDate();
    const monthName = thaiMonths[now.getMonth()];
    const thaiYear = now.getFullYear() + 543;

    DOM.headerDate.textContent = `วัน${dayName}ที่ ${dateNum} ${monthName} ${thaiYear}`;
  }

  function render() {
    // 1. คำนวณสถิติ
    const total = STATE.tasks.length;
    const completed = STATE.tasks.filter(t => t.completed).length;
    const active = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 2. อัปเดต Progress
    if (DOM.progressFill) DOM.progressFill.style.width = `${percent}%`;
    if (DOM.progressText) DOM.progressText.textContent = `เสร็จแล้ว ${completed}/${total} งาน`;
    if (DOM.progressBadge) DOM.progressBadge.textContent = `${percent}%`;

    // 3. อัปเดต Filter Badges
    if (DOM.countAll) DOM.countAll.textContent = total;
    if (DOM.countActive) DOM.countActive.textContent = active;
    if (DOM.countCompleted) DOM.countCompleted.textContent = completed;

    // 4. กรองรายการงาน
    let visibleTasks = STATE.tasks;
    if (STATE.filter === 'active') {
      visibleTasks = STATE.tasks.filter(t => !t.completed);
    } else if (STATE.filter === 'completed') {
      visibleTasks = STATE.tasks.filter(t => t.completed);
    }

    // 5. แสดงผลรายการงาน (Clean, Streamlined & Fast)
    if (!DOM.taskList) return;

    if (visibleTasks.length === 0) {
      DOM.taskList.style.display = 'none';
      if (DOM.emptyState) {
        DOM.emptyState.style.display = 'flex';
        const emptyTitle = DOM.emptyState.querySelector('.empty-title');
        const emptyDesc = DOM.emptyState.querySelector('.empty-desc');
        if (STATE.filter === 'completed') {
          emptyTitle.textContent = 'ยังไม่มีงานที่ทำเสร็จ';
          emptyDesc.textContent = 'เมื่อทำเสร็จแล้ว ให้แตะปุ่มเช็คเพื่อบันทึกที่นี่';
        } else if (STATE.filter === 'active') {
          emptyTitle.textContent = 'ไม่มีงานค้างอยู่เลย';
          emptyDesc.textContent = 'คุณจัดการสิ่งที่ต้องทำหมดแล้ว ยอดเยี่ยมมาก!';
        } else {
          emptyTitle.textContent = 'ยังไม่มีสิ่งที่ต้องทำ';
          emptyDesc.textContent = 'พิมพ์สิ่งที่ต้องทำในช่องด้านล่าง แล้วกดเพิ่มได้ทันที';
        }
      }
    } else {
      DOM.taskList.style.display = 'flex';
      if (DOM.emptyState) DOM.emptyState.style.display = 'none';

      DOM.taskList.innerHTML = visibleTasks.map(task => createTaskCardHTML(task)).join('');
    }
  }

  function createTaskCardHTML(task) {
    const isChecked = task.completed;

    return `
      <div class="task-card ${isChecked ? 'completed' : ''}" data-id="${task.id}">
        <button type="button" class="task-checkbox-btn ${isChecked ? 'checked' : ''}" data-action="toggle" title="${isChecked ? 'ทำเสร็จแล้ว' : 'ยังไม่เสร็จ'}">
          ${isChecked ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
            </svg>
          ` : ''}
        </button>

        <div class="task-body">
          <div class="task-title">${escapeHTML(task.title)}</div>
        </div>

        <div class="task-actions">
          <button type="button" class="task-action-btn delete" data-action="delete" title="ลบงานนี้">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // --- Event Handlers ---
  function setupEventListeners() {
    // Quick Add Form Submit
    if (DOM.quickForm) {
      DOM.quickForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = DOM.quickInput.value.trim();
        if (text) {
          addTask(text);
          DOM.quickInput.value = '';
          DOM.quickInput.blur();
        }
      });
    }

    // Task Card Clicks (Event Delegation)
    if (DOM.taskList) {
      DOM.taskList.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const card = target.closest('.task-card');
        if (!card) return;

        const taskId = card.dataset.id;
        const action = target.dataset.action;

        if (action === 'toggle') {
          toggleTask(taskId);
        } else if (action === 'delete') {
          deleteTask(taskId);
        }
      });
    }

    // Filter Tabs
    if (DOM.filterTabs) {
      DOM.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          DOM.filterTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          STATE.filter = tab.dataset.filter;
          render();
          triggerHaptic();
        });
      });
    }

    // Theme Switcher Modal
    if (DOM.themeBtn) {
      DOM.themeBtn.addEventListener('click', () => {
        openModal(DOM.themeModal);
      });
    }
    if (DOM.closeThemeModal) {
      DOM.closeThemeModal.addEventListener('click', () => {
        closeModal(DOM.themeModal);
      });
    }
    if (DOM.themeCards) {
      DOM.themeCards.forEach(card => {
        card.addEventListener('click', () => {
          const themeName = card.dataset.theme;
          setTheme(themeName);
          triggerHaptic();
          showToast(`เปลี่ยนเป็นธีม ${card.querySelector('.theme-name').textContent}`);
        });
      });
    }

    // Google Sheets Modal
    if (DOM.sheetsModalBtn) {
      DOM.sheetsModalBtn.addEventListener('click', () => {
        populateSheetsModal();
        openModal(DOM.sheetsModal);
      });
    }
    if (DOM.syncBtn) {
      DOM.syncBtn.addEventListener('click', () => {
        populateSheetsModal();
        openModal(DOM.sheetsModal);
      });
    }
    if (DOM.closeSheetsModal) {
      DOM.closeSheetsModal.addEventListener('click', () => {
        closeModal(DOM.sheetsModal);
      });
    }

    // Save & Test Google Sheets Connection
    if (DOM.sheetsForm) {
      DOM.sheetsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = DOM.sheetsUrlInput.value.trim();
        if (!url) {
          alert('กรุณากรอก Google Apps Script Web App URL');
          return;
        }

        saveAndSyncSheets(url);
      });
    }

    if (DOM.testSheetsBtn) {
      DOM.testSheetsBtn.addEventListener('click', async () => {
        const url = DOM.sheetsUrlInput.value.trim();
        if (!url) {
          alert('กรุณากรอก Web App URL ก่อนกดทดสอบ');
          return;
        }

        const originalText = DOM.testSheetsBtn.textContent;
        DOM.testSheetsBtn.textContent = 'กำลังทดสอบ...';
        DOM.testSheetsBtn.disabled = true;

        try {
          const res = await window.sheetsSync.testConnection(url);
          alert('การเชื่อมต่อสำเร็จ!\n\nGoogle Apps Script ตอบกลับว่า: ' + (res.message || 'OK'));
        } catch (err) {
          alert('เชื่อมต่อไม่สำเร็จ:\n\n' + err.message + '\n\nกรุณาตรวจสอบว่าเลือกสิทธิ์ "Anyone" ในขั้นตอน Deploy หรือยัง');
        } finally {
          DOM.testSheetsBtn.textContent = originalText;
          DOM.testSheetsBtn.disabled = false;
        }
      });
    }

    // Close modals on overlay backdrop click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    });
  }

  function populateSheetsModal() {
    if (window.sheetsSync && DOM.sheetsUrlInput) {
      DOM.sheetsUrlInput.value = window.sheetsSync.config.url || '';
    }
  }

  async function saveAndSyncSheets(url) {
    if (!window.sheetsSync) return;

    window.sheetsSync.saveConfig({ url: url });
    showToast('บันทึกการตั้งค่าแล้ว');
    closeModal(DOM.sheetsModal);

    try {
      updateSyncUI('syncing', 'กำลังซิงค์...');
      await window.sheetsSync.batchSync(STATE.tasks);
      showToast('ซิงค์ข้อมูลกับ Google Sheet สำเร็จ');
      updateSyncUI('online', 'เชื่อมต่อแล้ว');
    } catch (err) {
      console.warn('Sync save error:', err);
      updateSyncUI('error', 'ซิงค์ผิดพลาด');
    }
  }

  // --- Modal Helpers ---
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --- UI Toast & Micro Feedback ---
  function showToast(message) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${escapeHTML(message)}</span>
    `;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 2800);
  }

  function triggerHaptic() {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch (e) {}
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // --- Confetti Celebration ---
  function launchConfetti() {
    const canvas = DOM.confettiCanvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#FFE500', '#FF5722', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    let frame = 0;
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.rotation += p.vr;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
          ctx.restore();
        }
      });

      if (alive && frame < 100) {
        frame++;
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  }

  // Start app on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
