/**
 * ============================================================================
 * Google Apps Script Backend for Neo-Brutalism To-Do List Mobile Web App
 * ============================================================================
 * ระบบฐานข้อมูลและ REST API อัตโนมัติสำหรับเชื่อมต่อกับแอป To-Do List (Fast & Clean)
 * 
 * วิธีติดตั้ง (ใช้เวลา 1 นาที):
 * 1. เปิด Google Sheets เปล่าที่ https://sheets.new
 * 2. ไปที่เมนู "ส่วนขยาย" (Extensions) -> "Apps Script"
 * 3. ลบโค้ดเดิมออกทั้งหมด แล้ววางโค้ดในไฟล์นี้ลงไป
 * 4. กดปุ่ม "การทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้ใหม่" (New deployment)
 * 5. เลือกประเภท "เว็บแอป" (Web app)
 *    - คำอธิบาย: To-Do List API
 *    - ดำเนินการในฐานะ: ตัวฉันเอง (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)  *** สำคัญมาก ต้องเลือก Anyone ***
 * 6. กด "ทำให้ใช้งานได้" (Deploy) และคัดลอก Web App URL ไปใส่ในเว็บแอป To-Do List
 * ============================================================================
 */

const SHEET_NAME = 'Tasks';
const HEADERS = ['id', 'title', 'completed', 'createdAt', 'updatedAt'];

/**
 * ฟังก์ชันสร้างและตั้งค่าตารางใน Google Sheet อัตโนมัติ
 */
function initSheetDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  
  // ตรวจสอบแถวหัวตาราง
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    // กำหนดหัวตาราง
    sheet.appendRow(HEADERS);
    
    // ตกแต่งหัวตารางสไตล์ Clean Neo-Brutalism
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#312E81');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Kanit');
    headerRange.setFontSize(11);
    headerRange.setHorizontalAlignment('center');
    headerRange.setVerticalAlignment('middle');
    sheet.setRowHeight(1, 40);
    sheet.setFrozenRows(1);
    
    // ใส่ข้อมูลตัวอย่าง
    const now = new Date().toISOString();
    const sampleData = [
      ['task_1', 'ทดสอบเชื่อมต่อ Google Sheets สำเร็จ! 🚀', true, now, now],
      ['task_2', 'เตรียมสรุปเนื้อหาประชุมทีมสัปดาห์นี้', false, now, now],
      ['task_3', 'โทรศัพท์นัดหมายส่งมอบงานกับลูกค้า', false, now, now]
    ];
    
    sampleData.forEach(row => sheet.appendRow(row));
    
    // จัดรูปแบบความกว้างคอลัมน์
    sheet.setColumnWidth(1, 140); // id
    sheet.setColumnWidth(2, 360); // title
    sheet.setColumnWidth(3, 110); // completed
    sheet.setColumnWidth(4, 180); // createdAt
    sheet.setColumnWidth(5, 180); // updatedAt
  }
  
  return sheet;
}

/**
 * Handle GET Requests: อ่านข้อมูลรายการงานทั้งหมด
 */
function doGet(e) {
  try {
    const sheet = initSheetDatabase();
    const action = (e && e.parameter && e.parameter.action) || 'list';
    
    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'Google Sheets API เชื่อมต่อสำเร็จ! 🟢', timestamp: new Date() });
    }
    
    const tasks = getAllTasks(sheet);
    return jsonResponse({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * Handle POST Requests: เพิ่ม, อัปเดต, ติ๊กเสร็จ, ลบงาน
 */
function doPost(e) {
  try {
    const sheet = initSheetDatabase();
    let body = {};
    
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = e.parameter || {};
      }
    } else {
      body = (e && e.parameter) || {};
    }
    
    const action = body.action || 'add';
    const task = body.task || body;
    const now = new Date().toISOString();
    
    // 1. เพิ่มงานใหม่ (Add Task)
    if (action === 'add') {
      const newId = task.id || 'task_' + Utilities.getUuid();
      const newRow = [
        newId,
        task.title || 'ไม่มีชื่อหัวข้อ',
        Boolean(task.completed),
        task.createdAt || now,
        now
      ];
      sheet.appendRow(newRow);
      return jsonResponse({ success: true, action: 'add', task: { id: newId, ...task } });
    }
    
    // 2. สลับสถานะทำเสร็จ (Toggle Completed)
    if (action === 'toggle') {
      const taskId = body.id || (task && task.id);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(taskId)) {
          const currentStatus = Boolean(rows[i][2]);
          const newStatus = typeof body.completed !== 'undefined' ? Boolean(body.completed) : !currentStatus;
          sheet.getRange(i + 1, 3).setValue(newStatus);
          sheet.getRange(i + 1, 5).setValue(now);
          return jsonResponse({ success: true, action: 'toggle', id: taskId, completed: newStatus });
        }
      }
      return jsonResponse({ success: false, error: 'ไม่พบงาน ID: ' + taskId });
    }
    
    // 3. ลบงาน (Delete Task)
    if (action === 'delete') {
      const taskId = body.id || (task && task.id);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(taskId)) {
          sheet.deleteRow(i + 1);
          return jsonResponse({ success: true, action: 'delete', id: taskId });
        }
      }
      return jsonResponse({ success: false, error: 'ไม่พบงาน ID: ' + taskId });
    }
    
    // 4. บันทึกข้อมูลหลายรายการแบบรวม (Batch Sync)
    if (action === 'batch_sync' && Array.isArray(body.tasks)) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      
      const newRows = body.tasks.map(t => [
        t.id || 'task_' + Utilities.getUuid(),
        t.title || '',
        Boolean(t.completed),
        t.createdAt || now,
        now
      ]);
      
      if (newRows.length > 0) {
        sheet.getRange(2, 1, newRows.length, HEADERS.length).setValues(newRows);
      }
      
      return jsonResponse({ success: true, action: 'batch_sync', count: newRows.length });
    }
    
    return jsonResponse({ success: false, error: 'ไม่รู้จักคำสั่ง action: ' + action });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

/**
 * ฟังก์ชันอ่านข้อมูลแถวทั้งหมดแปลงเป็น Array of Objects
 */
function getAllTasks(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const tasks = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue;
    
    tasks.push({
      id: String(row[0]),
      title: String(row[1]),
      completed: Boolean(row[2]),
      createdAt: String(row[3] || ''),
      updatedAt: String(row[4] || '')
    });
  }
  
  return tasks;
}

/**
 * ฟังก์ชันส่งกลับ JSON Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
