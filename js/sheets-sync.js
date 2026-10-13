/**
 * ============================================================================
 * Google Sheets Two-Way Synchronization Module
 * ============================================================================
 * เชื่อมต่อกับ Google Apps Script Web App API แบบ Real-time
 * พร้อมระบบ Offline Queue อัตโนมัติเมื่อไม่มีสัญญาณอินเทอร์เน็ต
 */

class GoogleSheetsSync {
  constructor() {
    this.STORAGE_KEY = 'todo_sheets_config_v1';
    this.QUEUE_KEY = 'todo_offline_queue_v1';
    this.statusListeners = [];
    
    this.config = this.loadConfig();
    this.offlineQueue = this.loadQueue();
    
    // ดักจับเหตุการณ์กลับมาออนไลน์
    window.addEventListener('online', () => {
      this.notifyStatus('syncing', 'อินเทอร์เน็ตกลับมาแล้ว กำลังซิงค์ข้อมูล...');
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.notifyStatus('offline', 'ออฟไลน์: บันทึกข้อมูลในเครื่อง');
    });
  }

  loadConfig() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : { url: '', autoSync: true, lastSyncTime: null };
    } catch (e) {
      return { url: '', autoSync: true, lastSyncTime: null };
    }
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    return this.config;
  }

  loadQueue() {
    try {
      const q = localStorage.getItem(this.QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch (e) {
      return [];
    }
  }

  saveQueue() {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.offlineQueue));
  }

  isConnected() {
    return Boolean(this.config.url && this.config.url.trim().length > 10);
  }

  onStatusChange(fn) {
    this.statusListeners.push(fn);
  }

  notifyStatus(status, message) {
    this.statusListeners.forEach(fn => fn(status, message));
  }

  /**
   * ทดสอบการเชื่อมต่อกับ Web App URL
   */
  async testConnection(url) {
    if (!url || !url.startsWith('https://script.google.com/')) {
      throw new Error('URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://script.google.com/...)');
    }

    const testUrl = `${url}${url.includes('?') ? '&' : '?'}action=ping&_t=${Date.now()}`;
    const response = await fetch(testUrl, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`เชื่อมต่อไม่สำเร็จ HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * ดึงรายการงานทั้งหมดจาก Google Sheet
   */
  async fetchAll() {
    if (!this.isConnected()) return null;
    if (!navigator.onLine) {
      this.notifyStatus('offline', 'ออฟไลน์: ใช้ข้อมูลจากเครื่อง');
      return null;
    }

    try {
      this.notifyStatus('syncing', 'กำลังโหลดข้อมูลจาก Google Sheets...');
      const fetchUrl = `${this.config.url}${this.config.url.includes('?') ? '&' : '?'}action=list&_t=${Date.now()}`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors'
      });

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        this.config.lastSyncTime = new Date().toISOString();
        this.saveConfig(this.config);
        this.notifyStatus('online', 'ซิงค์กับ Google Sheets แล้ว');
        return result.data;
      } else {
        throw new Error(result.error || 'โครงสร้างข้อมูลไม่ถูกต้อง');
      }
    } catch (err) {
      console.warn('Sheets Fetch Error:', err);
      this.notifyStatus('error', 'ซิงค์ไม่สำเร็จ (ใช้ข้อมูลในเครื่อง)');
      return null;
    }
  }

  /**
   * ส่งคำขอไปยัง Google Apps Script (พร้อมเก็บลง Queue หากออฟไลน์)
   */
  async sendAction(payload) {
    if (!this.isConnected()) return;

    if (!navigator.onLine) {
      this.offlineQueue.push(payload);
      this.saveQueue();
      this.notifyStatus('offline', 'บันทึกในคิวออฟไลน์');
      return;
    }

    try {
      this.notifyStatus('syncing', 'กำลังบันทึกลง Google Sheets...');
      
      // ส่งผ่าน POST แบบ text/plain เพื่อป้องกัน CORS preflight issue ใน Google Apps Script
      const response = await fetch(this.config.url, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        this.config.lastSyncTime = new Date().toISOString();
        this.saveConfig(this.config);
        this.notifyStatus('online', 'บันทึกลง Google Sheets แล้ว');
      } else {
        throw new Error(result.error || 'เซิร์ฟเวอร์ตอบกลับล้มเหลว');
      }
    } catch (err) {
      console.warn('Sheets Send Action Error:', err);
      this.offlineQueue.push(payload);
      this.saveQueue();
      this.notifyStatus('offline', 'เซฟลงคิวออฟไลน์แล้ว');
    }
  }

  /**
   * เพิ่มงานใหม่ลง Google Sheet
   */
  async addTask(task) {
    return this.sendAction({
      action: 'add',
      task: task
    });
  }

  /**
   * สลับสถานะทำเสร็จใน Google Sheet
   */
  async toggleTask(id, completed) {
    return this.sendAction({
      action: 'toggle',
      id: id,
      completed: completed
    });
  }

  /**
   * ลบงานออกจาก Google Sheet
   */
  async deleteTask(id) {
    return this.sendAction({
      action: 'delete',
      id: id
    });
  }

  /**
   * อัปเดตงานใน Google Sheet
   */
  async updateTask(task) {
    return this.sendAction({
      action: 'update',
      task: task
    });
  }

  /**
   * ซิงค์ข้อมูลทั้งหมดจากเครื่องขึ้น Google Sheet แบบ Batch
   */
  async batchSync(tasks) {
    return this.sendAction({
      action: 'batch_sync',
      tasks: tasks
    });
  }

  /**
   * ส่งข้อมูลใน Queue ที่ค้างไว้เมื่อกลับมาออนไลน์
   */
  async processQueue() {
    if (!this.isConnected() || this.offlineQueue.length === 0 || !navigator.onLine) return;

    const itemsToSend = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveQueue();

    for (const item of itemsToSend) {
      await this.sendAction(item);
    }
  }
}

// Global instance
window.sheetsSync = new GoogleSheetsSync();
