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
  const { name, phone, email, source_type, message_content } = req.body;
  
  try {
    console.log('--- NHẬN WEBHOOK TỪ PANCAKE ---');
    console.log(`Khách hàng: ${name} (${phone})`);
    console.log(`Nguồn: Pancake ${source_type}`);

    // Lưu vào database
    const result = await pool.query(
      'INSERT INTO customers (full_name, email, phone, source, lead_status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email || '', phone, `pancake_${source_type}`, 'NEW']
    );
    
    const customer = result.rows[0];

    // Ghi nhật ký
    await pool.query(
      'INSERT INTO customer_activities (customer_id, activity_type, description, metadata) VALUES ($1, $2, $3, $4)',
      [customer.id, 'PANCAKE_SYNC', `Đồng bộ từ Pancake: ${message_content}`, JSON.stringify(req.body)]
    );

    res.json({ success: true, message: 'Đã đồng bộ từ Pancake thành công' });
  } catch (err) {
    console.error('Lỗi Webhook:', err);
    res.status(500).json({ error: 'Lỗi đồng bộ' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server EduPancake đang chạy tại http://localhost:${port}`);
  });
}

export default app;
