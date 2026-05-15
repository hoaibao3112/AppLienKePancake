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

const PANCAKE_TOKEN = process.env.PANCAKE_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InB6bF8yMTQzNzU2MTQ0NDY0Nzk2NjAyIiwidGltZXN0YW1wIjoxNzc4ODI5MTc1fQ.d-3R3uSS0toxnO7Ftd5in5yvjkEAX7pMDRcfuvE0ZcA';

// Biến tạm lưu log trong bộ nhớ (chỉ tồn tại khi server chạy)
let systemLogs = [];
const addLog = (message, data = null) => {
  const logEntry = {
    id: Date.now(),
    time: new Date().toLocaleString('vi-VN'),
    message,
    data
  };
  systemLogs.unshift(logEntry);
  if (systemLogs.length > 50) systemLogs.pop();
};

app.use(cors());
app.use(express.json());

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
    const result = await pool.query('SELECT * FROM courses');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy khóa học' });
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
    email, 
    source_type, 
    message_content,
    content
  } = req.body;
  
  // Ưu tiên lấy tên từ nhiều nguồn khác nhau của Pancake/Zalo
  const finalName = name || customer_name || 'Khách hàng Zalo/FB';
  const finalPhone = phone || customer_phone || '';
  const finalSource = source_type || 'pancake';
  const finalContent = message_content || content || 'Tin nhắn mới';

  try {
    const result = await pool.query(
      'INSERT INTO customers (full_name, email, phone, source, lead_status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [finalName, email || '', finalPhone, `pancake_${finalSource}`, 'NEW']
    );
    
    const customer = result.rows[0];

    await pool.query(
      'INSERT INTO customer_activities (customer_id, activity_type, description, metadata) VALUES ($1, $2, $3, $4)',
      [customer.id, 'PANCAKE_SYNC', `Đồng bộ từ Pancake: ${finalContent}`, JSON.stringify(req.body)]
    );

    addLog(`✅ Đã lưu khách hàng thành công: ${finalName}`);
    res.json({ success: true, message: 'Đã đồng bộ từ Pancake thành công' });
  } catch (err) {
    addLog('❌ Lỗi lưu Webhook vào DB', err.message);
    res.status(500).json({ error: 'Lỗi đồng bộ' });
  }
});

// 5. Endpoint ĐỒNG BỘ CHỦ ĐỘNG (Dùng Token để kéo dữ liệu)
app.all('/api/sync-pancake', async (req, res) => {
  addLog('🔄 Bắt đầu đồng bộ chủ động từ Pancake...');
  
  try {
    // Gọi API chính xác của Pancake dành cho trang Zalo của bạn
    const PAGE_ID = 'pzl_84374170367';
    const response = await fetch(`https://pancake.vn/api/v1/pages/${PAGE_ID}/conversations?access_token=${PANCAKE_TOKEN}`);
    const data = await response.json();
    
    if (!data.conversations || data.conversations.length === 0) {
      addLog('ℹ️ Không tìm thấy hội thoại mới trên Zalo.');
      return res.json({ success: true, message: 'Không có khách hàng mới.' });
    }

    // Duyệt qua danh sách và lưu vào DB (Đã có khóa chặn trùng lặp ở DB nên yên tâm)
    let count = 0;
    for (const conv of data.conversations) {
      const customerName = conv.customer_name || 'Khách hàng Zalo';
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
