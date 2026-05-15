import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import 'dotenv/config';

const { Pool } = pkg;
const app = express();
const port = process.env.PORT || 5000;

// Cấu hình kết nối Postgres (Neon.tech)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

const PANCAKE_TOKEN = process.env.PANCAKE_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InB6bF8yMTQzNzU2MTQ0NDY0Nzk2NjAyIiwidGltZXN0YW1wIjoxNzc4ODM0ODc5fQ.-yr9Mpd4dS-377wOtR_kPbeg3WF4mEKXy2WkMgBdjL8';

// --- DATABASE INITIALIZATION ---
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price NUMERIC DEFAULT 0,
        level TEXT DEFAULT 'Basic',
        created_at TIMESTAMP DEFAULT NOW()
      );
      -- Đảm bảo các cột tồn tại nếu bảng đã có sẵn từ trước
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
      ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Basic';
    `);
    console.log('✅ Database initialized: courses table ready.');
  } catch (err) {
    console.error('❌ Database init error:', err);
  }
};
initDB();

// Biến tạm lưu log trong bộ nhớ (chỉ tồn tại khi server chạy)
let systemLogs = [];

function addLog(message, details = null) {
  const log = {
    id: Date.now(),
    time: new Date().toLocaleString('vi-VN'),
    message,
    details
  };
  systemLogs.unshift(log);
  if (systemLogs.length > 50) systemLogs.pop();
  console.log(`[LOG] ${message}`, details || '');
}
// --- API ENDPOINTS ---

// 1. Lấy danh sách khách hàng (Leads)
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    addLog('Lỗi lấy khách hàng', err.message);
    res.status(500).json({ error: 'Lỗi server khi lấy khách hàng' });
  }
});

// 1b. Lấy nhật ký hệ thống
app.get('/api/logs', (req, res) => {
  res.json(systemLogs);
});

// 2. Lấy danh sách khóa học
app.get('/api/courses', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM courses ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy khóa học' });
  }
});

// 2b. Thêm khóa học mới
app.post('/api/courses', async (req, res) => {
  const { title, description, price, level } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO courses (title, description, price, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, price || 0, level || 'Basic']
    );
    addLog(`🆕 Đã thêm khóa học mới: ${title}`);
    res.json(result.rows[0]);
  } catch (err) {
    addLog('❌ Lỗi thêm khóa học', err.message);
    res.status(500).json({ error: 'Lỗi server khi thêm khóa học', details: err.message });
  }
});

// 3. Thêm Lead mới (Đăng ký tư vấn từ Website)
app.post('/api/consultation', async (req, res) => {
  const { full_name, email, phone, course_name, source } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (full_name, email, phone, source) VALUES ($1, $2, $3, $4) RETURNING *',
      [full_name, email, phone, source || 'website']
    );
    
    const newCustomer = result.rows[0];

    await pool.query(
      'INSERT INTO customer_activities (customer_id, activity_type, description) VALUES ($1, $2, $3)',
      [newCustomer.id, 'CONSULTATION_REQUEST', `Đăng ký tư vấn khóa học: ${course_name}`]
    );

    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký tư vấn' });
  }
});

// 4. Endpoint NHẬN DỮ LIỆU TỪ PANCAKE (Webhook)
app.post('/api/pancake-webhook', async (req, res) => {
  addLog('Nhận dữ liệu Webhook từ Pancake', req.body);

  const { 
    name, 
    customer_name, 
    phone, 
    customer_phone,
    source_type, 
    message_content,
    content,
    type 
  } = req.body;
  
  // Ưu tiên lấy tên từ nhiều nguồn khác nhau của Pancake/Zalo
  const customerName = name || customer_name || 'Khách hàng Zalo/FB';
  const customerPhone = phone || customer_phone || '';
  const sourceType = source_type || 'pancake';
  const finalContent = message_content || content || 'Tin nhắn mới';

  try {
    addLog(`⏳ Đang xử lý khách hàng: ${customerName}...`);
    
    // 2. Lưu hoặc cập nhật khách hàng vào DB
    const customerResult = await pool.query(
      `INSERT INTO customers (full_name, phone, source, lead_status) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (full_name, source) 
       DO UPDATE SET phone = EXCLUDED.phone, updated_at = NOW()
       RETURNING id`,
      [customerName, customerPhone, `pancake_${sourceType}`, 'NEW']
    );

    const customerId = customerResult.rows[0].id;
    addLog(`✅ Đã xác định ID khách hàng: ${customerId}`);

    // 3. Lưu hoạt động vào DB
    await pool.query(
      'INSERT INTO customer_activities (customer_id, activity_type, description, metadata) VALUES ($1, $2, $3, $4)',
      [customerId, 'PANCAKE_EVENT', `Sự kiện ${type || 'SYNC'} từ Pancake: ${finalContent}`, JSON.stringify(req.body)]
    );

    addLog(`🚀 Hoàn tất Webhook cho: ${customerName}`);
    res.json({ success: true });
  } catch (err) {
    addLog('❌ Lỗi xử lý Webhook', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// 5. Endpoint ĐỒNG BỘ CHỦ ĐỘNG (Dùng Token để kéo dữ liệu)
app.all('/api/sync-pancake', async (req, res) => {
  addLog('🔄 Bắt đầu đồng bộ chủ động từ Pancake...');
  
  try {
    const PAGE_ID = process.env.PANCAKE_PAGE_ID || 'pzl_84374170367';
    let response = await fetch(`https://pancake.vn/api/v1/pages/${PAGE_ID}/conversations?access_token=${PANCAKE_TOKEN}`);
    let resultData = await response.json();
    
    // Nếu lỗi Invalid Access Token với Page ID, thử dùng endpoint chung
    if (resultData.error_code === 102) {
      addLog('⚠️ Thử endpoint dự phòng (Global conversations)...');
      response = await fetch(`https://pancake.vn/api/v1/conversations?access_token=${PANCAKE_TOKEN}`);
      resultData = await response.json();
    }
    
    const conversations = resultData.conversations || (resultData.data && resultData.data.conversations) || [];
    addLog(`🔍 Kết quả: Tìm thấy ${conversations.length} hội thoại.`, resultData);

    if (conversations.length === 0) {
      return res.json({ success: true, message: 'Hệ thống Pancake báo: Không có hội thoại mới.' });
    }

    // Duyệt qua danh sách và lưu vào DB
    let count = 0;
    for (const conv of conversations) {
      const customerName = conv.customer_name || conv.name || 'Khách hàng Zalo';
      const customerPhone = conv.customer_phone || '';
      
      // ON CONFLICT DO NOTHING sẽ tự động bỏ qua nếu người này đã có trong danh sách
      await pool.query(
        'INSERT INTO customers (full_name, phone, source, lead_status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [customerName, customerPhone, 'pancake_zalo', 'NEW']
      );
      count++;
    }

    addLog(`✅ Đã đồng bộ thành công ${count} khách hàng từ Pancake.`);
    res.json({ success: true, message: `Đã đồng bộ ${count} khách hàng!` });
  } catch (err) {
    addLog('❌ Lỗi khi kết nối với Pancake API', err.message);
    res.status(500).json({ error: 'Lỗi đồng bộ' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server EduPancake đang chạy tại http://localhost:${port}`);
  });
}

export default app;
