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
  connectionTimeoutMillis: 10000, // Tăng lên 10 giây cho cold start
  ssl: {
    rejectUnauthorized: false // Cần thiết cho Neon/Supabase trên Vercel
  }
});

let isDbInitialized = false;

app.use(cors());
app.use(express.json());

const PANCAKE_TOKEN = process.env.PANCAKE_ACCESS_TOKEN;
const PAGE_ID = process.env.PANCAKE_PAGE_ID || 'pzl_84374170367';

// Kiểm tra Token khi khởi động
const checkToken = async () => {
  if (!PANCAKE_TOKEN) {
    await addLog('❌ LỖI: PANCAKE_ACCESS_TOKEN chưa được cấu hình trên Vercel!');
  } else {
    // Hiện 15 ký tự để bạn dễ so sánh với Token mới
    await addLog(`✅ Token đang dùng: "${PANCAKE_TOKEN.substring(0, 15)}..."`);
  }
};
checkToken();

// --- DATABASE INITIALIZATION ---
const initDB = async () => {
  try {
    // 1. Ưu tiên tạo bảng log trước để ghi lại quá trình
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        message TEXT,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    addLog('⏳ Đang kiểm tra cấu trúc Database...');
    
    // 2. Tạo bảng courses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price NUMERIC DEFAULT 0,
        level TEXT DEFAULT 'Basic',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 3. Tạo bảng customers với Unique Constraint
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        source TEXT NOT NULL,
        lead_status TEXT DEFAULT 'NEW',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(full_name, source)
      )
    `);

    // 4. Tạo bảng customer_activities
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customer_activities (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        activity_type TEXT,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 4. Tạo bảng system_logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        message TEXT,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migration cho các cột cũ (nếu có)
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT');
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0');
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS level TEXT DEFAULT ' + "'Basic'");
    
    // Migration cho bảng customers
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT \'NEW\'');
    
    isDbInitialized = true;
    addLog('✅ Database initialized: All tables ready.');
  } catch (err) {
    addLog('❌ Database init error', err.message);
    console.error('❌ Database init error:', err);
  }
};

// Middleware để đảm bảo DB luôn được khởi tạo trước khi xử lý request
const ensureDb = async (req, res, next) => {
  if (!isDbInitialized && process.env.DATABASE_URL) {
    await initDB();
  }
  next();
};

app.use(ensureDb);

// 0. Kiểm tra trạng thái hệ thống
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    if (process.env.DATABASE_URL) {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    }
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    database: dbStatus,
    config: {
      has_token: !!process.env.PANCAKE_ACCESS_TOKEN,
      has_page_id: !!process.env.PANCAKE_PAGE_ID
    }
  });
});

async function addLog(message, data = null) {
  try {
    console.log(`[LOG] ${message}`, data || '');
    await pool.query(
      'INSERT INTO system_logs (message, data) VALUES ($1, $2)',
      [message, data ? JSON.stringify(data) : null]
    );
  } catch (err) {
    console.error('Lỗi lưu log vào DB:', err);
  }
}

// 0. Kiểm tra kết nối DB
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// --- API ENDPOINTS ---

// 1. Lấy danh sách khách hàng (Leads)
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY updated_at DESC');
    res.json(result.rows);
  } catch (err) {
    addLog('Lỗi lấy khách hàng', err.message);
    res.status(500).json({ error: 'Lỗi server khi lấy khách hàng' });
  }
});

// 1b. Lấy nhật ký hệ thống (từ DB)
app.get('/api/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
    const formattedLogs = result.rows.map(r => ({
      id: r.id,
      time: new Date(r.created_at).toLocaleString('vi-VN'),
      message: r.message,
      data: r.data
    }));
    res.json(formattedLogs);
  } catch (err) {
    res.status(500).json([]);
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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const PURE_PAGE_ID = PAGE_ID.replace('pzl_', ''); // Thử ID chỉ có số
    
    // Danh sách các phương án thử gọi API
    const strategies = [
      `https://pancake.vn/api/v1/pages/${PAGE_ID}/conversations?access_token=${PANCAKE_TOKEN}`,
      `https://pancake.vn/api/v1/pages/${PURE_PAGE_ID}/conversations?access_token=${PANCAKE_TOKEN}`,
      `https://pancake.vn/api/v1/conversations?access_token=${PANCAKE_TOKEN}`
    ];

    let resultData = null;
    let successStrategy = -1;

    for (let i = 0; i < strategies.length; i++) {
      try {
        addLog(`📡 Thử phương án ${i + 1}...`);
        const response = await fetch(strategies[i], { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        const data = await response.json();
        
        if (data.success !== false && !data.error_code) {
          resultData = data;
          successStrategy = i;
          break;
        } else if (i === strategies.length - 1) {
          resultData = data; // Lưu lỗi cuối cùng để báo cáo
        }
      } catch (e) {
        addLog(`⚠️ Phương án ${i + 1} thất bại: ${e.message}`);
      }
    }

    clearTimeout(timeoutId);

    if (!resultData || resultData.success === false || resultData.error_code === 102) {
      addLog('❌ Tất cả phương án đồng bộ đều thất bại do Token lỗi.', resultData);
      return res.json({ success: false, error: 'Token Pancake đã hết hạn hoặc sai Page ID. Vui lòng kiểm tra lại.' });
    }

    const conversations = resultData.conversations || (resultData.data && resultData.data.conversations) || resultData.data || [];
    addLog(`🔍 Thành công (PA ${successStrategy + 1}): Tìm thấy ${conversations.length} hội thoại.`);
    addLog(`👥 Danh sách tên:`, conversations.map(c => c.customer_name || c.name || 'Unknown'));

    if (conversations.length === 0) {
      return res.json({ success: true, message: 'Hệ thống Pancake báo: Không có hội thoại mới hoặc Token không có quyền truy cập hội thoại này.' });
    }

    // Duyệt qua danh sách và lưu vào DB
    let count = 0;
    for (const conv of conversations) {
      // Lấy tên từ nhiều trường khác nhau mà Pancake có thể trả về
      const customerName = conv.customer_name || conv.name || conv.customer?.name || 'Khách hàng Zalo';
      const customerPhone = conv.customer_phone || conv.phone || '';
      const customerId = conv.customer_id || conv.id;
      
      addLog(`Processing: ${customerName} (ID: ${customerId})`);

      // ON CONFLICT DO NOTHING sẽ tự động bỏ qua nếu người này đã có trong danh sách
      await pool.query(
        'INSERT INTO customers (full_name, phone, source, lead_status) VALUES ($1, $2, $3, $4) ON CONFLICT (full_name, source) DO UPDATE SET updated_at = NOW(), phone = EXCLUDED.phone',
        [customerName, customerPhone, 'pancake_zalo', 'NEW']
      );
      count++;
    }

    addLog(`✅ Đã đồng bộ/cập nhật thành công ${count} khách hàng.`);
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
