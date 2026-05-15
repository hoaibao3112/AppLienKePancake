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
    `);
    console.log('✅ Database initialized: courses table ready.');
  } catch (err) {
    console.error('❌ Database init error:', err);
  }
};
initDB();

app.use(cors());
app.use(express.json());

// --- API ENDPOINTS ---

// 1. Lấy danh sách khách hàng (Leads)
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy khách hàng' });
  }
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
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi thêm khóa học' });
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
  const { name, customer_name, phone, customer_phone, source_type, message_content, content, type } = req.body;
  
  const customerName = name || customer_name || 'Khách hàng Zalo/FB';
  const customerPhone = phone || customer_phone || '';
  const sourceType = source_type || 'pancake';
  const finalContent = message_content || content || 'Tin nhắn mới';

  try {
    // Lưu hoặc cập nhật khách hàng vào DB
    const customerResult = await pool.query(
      `INSERT INTO customers (full_name, phone, source, lead_status) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (full_name, source) 
       DO UPDATE SET phone = EXCLUDED.phone, updated_at = NOW()
       RETURNING id`,
      [customerName, customerPhone, `pancake_${sourceType}`, 'NEW']
    );

    const customerId = customerResult.rows[0].id;

    // Lưu hoạt động vào DB
    await pool.query(
      'INSERT INTO customer_activities (customer_id, activity_type, description, metadata) VALUES ($1, $2, $3, $4)',
      [customerId, 'PANCAKE_EVENT', `Sự kiện ${type || 'SYNC'} từ Pancake: ${finalContent}`, JSON.stringify(req.body)]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi Webhook:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server EduPancake đang chạy tại http://localhost:${port}`);
  });
}

export default app;
