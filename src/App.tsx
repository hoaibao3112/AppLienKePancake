import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Button, Card, Table, Tag, message } from 'antd';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// --- LAYOUTS ---
const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="main-website">
    <header className="main-header">
      <h1>EduPancake</h1>
      <nav className="main-nav">
        <a href="/">Trang chủ</a>
        <a href="/courses">Khóa học</a>
        <a href="/admin">Quản trị CRM</a>
      </nav>
    </header>
    <main className="main-content">{children}</main>
  </div>
);

const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="admin-dashboard">
    <aside className="admin-sidebar">
      <h2>CRM Admin</h2>
      <nav className="admin-nav">
        <a href="/admin/dashboard">Dashboard</a>
        <a href="/admin/customers">Khách hàng / Leads</a>
      </nav>
    </aside>
    <main className="admin-content">{children}</main>
  </div>
);

// --- WEBSITE PAGES ---
const HomePage = () => (
  <div style={{ textAlign: 'center', padding: '50px 0' }}>
    <h1>Nền tảng học trực tuyến & Tích hợp Pancake CRM</h1>
    <p>Giải pháp quản lý đào tạo hiện đại nhất cho giảng viên.</p>
    <Button type="primary" size="large" style={{ marginTop: '20px' }}>Khám phá các khóa học</Button>
  </div>
);

const CoursesPage = () => {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/courses`)
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error('Lỗi lấy khóa học:', err));
  }, []);

  const handleConsult = (courseTitle: string) => {
    // Giả lập gửi yêu cầu tư vấn
    fetch(`${API_URL}/consultation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Khách hàng mới',
        email: 'khach@test.com',
        phone: '0123456789',
        course_name: courseTitle,
        source: 'website'
      })
    })
    .then(() => message.success(`Đã đăng ký tư vấn ${courseTitle} thành công!`))
    .catch(() => message.error('Có lỗi xảy ra!'));
  };

  return (
    <div>
      <h1>Danh Sách Khóa Học (Dữ liệu từ Neon DB)</h1>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {courses.map(course => (
          <Card key={course.id} title={course.title} style={{ width: 300 }}>
            <p><strong>Cấp độ:</strong> {course.level}</p>
            <p><strong>Học phí:</strong> {Number(course.price).toLocaleString()} VND</p>
            <Button type="primary" onClick={() => handleConsult(course.title)}>Đăng ký tư vấn</Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- ADMIN PAGES ---
const CrmDashboard = () => (
  <div>
    <h1>Tổng quan hệ thống</h1>
    <div style={{ display: 'flex', gap: '20px' }}>
      <Card title="Phân tích Lead" style={{ width: 300 }}>
        <p>Đang đồng bộ từ Pancake...</p>
      </Card>
    </div>
  </div>
);

const CustomerList = () => {
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/customers`)
      .then(res => res.json())
      .then(data => setCustomers(data))
      .catch(err => console.error('Lỗi lấy lead:', err));
  }, []);

  const columns = [
    { title: 'Họ tên', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone' },
    { title: 'Trạng thái', dataIndex: 'lead_status', key: 'lead_status', render: (s: string) => <Tag color="blue">{s}</Tag> },
    { title: 'Nguồn', dataIndex: 'source', key: 'source', render: (s: string) => <Tag color={s.includes('pancake') ? 'purple' : 'green'}>{s}</Tag> },
    { title: 'Ngày tạo', dataIndex: 'created_at', key: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  return (
    <div>
      <h1>Quản lý Leads (Data Real-time từ Neon)</h1>
      <Table dataSource={customers} columns={columns} rowKey="id" style={{ marginTop: '20px' }} />
    </div>
  );
};

// --- APP ROUTER ---
function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff', borderRadius: 6 } }}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/courses" element={<MainLayout><CoursesPage /></MainLayout>} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminLayout><CrmDashboard /></AdminLayout>} />
          <Route path="/admin/customers" element={<AdminLayout><CustomerList /></AdminLayout>} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
