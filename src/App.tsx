import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ConfigProvider, Button, Card, Table, Tag, message, Avatar, Space, Typography, Badge, Menu, List } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  BookOutlined, 
  ThunderboltOutlined, 
  RocketOutlined, 
  CustomerServiceOutlined,
  ArrowRightOutlined,
  FacebookOutlined,
  MessageOutlined,
  TeamOutlined,
  SyncOutlined
} from '@ant-design/icons';
import './App.css';

const { Title, Text } = Typography;
const API_URL = '/api';

// --- LAYOUTS ---
const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="main-website">
    <header className="main-header">
      <div className="logo">EduPancake</div>
      <nav className="main-nav">
        <Link to="/">Trang chủ</Link>
        <Link to="/courses">Khóa học</Link>
        <Link to="/admin">
          <Button type="primary" shape="round">Dành cho Quản trị</Button>
        </Link>
      </nav>
    </header>
    <main>{children}</main>
  </div>
);

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar" style={{ background: '#001529', borderRight: '1px solid #1e293b' }}>
        <div className="sidebar-logo">
          <RocketOutlined style={{ fontSize: '24px', color: '#3b82f6' }} />
          <span>PANCAKE CRM v2</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ height: '100%', borderRight: 0, padding: '16px 8px', background: '#001529' }}
          theme="dark"
        >
          <Menu.Item key="/admin/dashboard" icon={<DashboardOutlined />}>
            <Link to="/admin/dashboard">Dashboard</Link>
          </Menu.Item>
          <Menu.Item key="/admin/customers" icon={<TeamOutlined />}>
            <Link to="/admin/customers">Khách hàng & Leads</Link>
          </Menu.Item>
          <Menu.Item key="/admin/courses" icon={<BookOutlined />}>
            <Link to="/admin/courses">Quản lý khóa học</Link>
          </Menu.Item>
          <Menu.Item key="/admin/logs" icon={<ThunderboltOutlined />}>
            <Link to="/admin/logs">Nhật ký hệ thống</Link>
          </Menu.Item>
        </Menu>
        <div style={{ padding: '0 32px', marginTop: 'auto', paddingBottom: '32px' }}>
          <Card size="small" style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>
            <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Đang kết nối với</Text>
            <div style={{ color: 'white', fontWeight: 600 }}>Neon Database</div>
          </Card>
        </div>
      </aside>
      <main className="admin-content">{children}</main>
    </div>
  );
};

// --- WEBSITE PAGES ---
const HomePage = () => (
  <div className="hero-section">
    <Badge count="New" color="#3b82f6" style={{ marginBottom: 16 }}>
      <Text strong style={{ color: '#3b82f6' }}>TÍCH HỢP PANCAKE CRM 2.0</Text>
    </Badge>
    <h1>Nền tảng học tập kết nối CRM đa kênh</h1>
    <p>Giải pháp tối ưu dành cho giảng viên để quản lý học viên và đồng bộ hóa dữ liệu khách hàng từ Facebook, Zalo, Website về một nơi duy nhất.</p>
    <Space size="large">
      <Button type="primary" size="large" shape="round" icon={<RocketOutlined />}>
        Bắt đầu miễn phí
      </Button>
      <Button size="large" shape="round" icon={<CustomerServiceOutlined />}>
        Xem Demo CRM
      </Button>
    </Space>
    
    <div style={{ marginTop: 80, display: 'flex', justifyContent: 'center', gap: 60 }}>
       <div style={{ textAlign: 'center' }}>
          <Title level={2} style={{ marginBottom: 0 }}>10k+</Title>
          <Text type="secondary">Học viên</Text>
       </div>
       <div style={{ textAlign: 'center' }}>
          <Title level={2} style={{ marginBottom: 0 }}>500+</Title>
          <Text type="secondary">Khóa học</Text>
       </div>
       <div style={{ textAlign: 'center' }}>
          <Title level={2} style={{ marginBottom: 0 }}>100%</Title>
          <Text type="secondary">Đồng bộ</Text>
       </div>
    </div>
  </div>
);

const CoursesPage = () => {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/courses`)
      .then(res => res.json())
      .then(data => {
        setCourses(data);
      })
      .catch(err => console.error('Lỗi lấy khóa học:', err));
  }, []);

  const handleConsult = (courseTitle: string) => {
    const hide = message.loading('Đang xử lý...', 0);
    fetch(`${API_URL}/consultation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Hoài Bảo (Demo)',
        email: 'bao@test.com',
        phone: '0900112233',
        course_name: courseTitle,
        source: 'website'
      })
    })
    .then(() => {
      hide();
      message.success(`Tuyệt vời! Chúng tôi đã nhận được yêu cầu tư vấn cho khóa "${courseTitle}".`);
    })
    .catch(() => {
      hide();
      message.error('Có lỗi xảy ra, vui lòng thử lại!');
    });
  };

  return (
    <div style={{ padding: '60px 5%' }}>
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title level={2}>Danh sách khóa học tiêu biểu</Title>
        <Text type="secondary">Đầu tư vào kiến thức là khoản đầu tư mang lại lợi nhuận cao nhất.</Text>
      </div>
      
      <div className="course-grid">
        {courses.map(course => (
          <Card 
            key={course.id} 
            className="premium-card"
            cover={<div style={{ height: 180, background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOutlined style={{ fontSize: 60, color: 'white' }} />
            </div>}
          >
            <div style={{ marginBottom: 12 }}>
               <Tag color="blue">{course.level}</Tag>
               <Tag color="purple">SaaS</Tag>
            </div>
            <Title level={4} style={{ marginBottom: 8 }}>{course.title}</Title>
            <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>{course.description || 'Học tập chuyên sâu với lộ trình bài bản từ chuyên gia đầu ngành.'}</Typography.Paragraph>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <Title level={4} style={{ margin: 0, color: '#2563eb' }}>{Number(course.price).toLocaleString()}đ</Title>
              <Button type="primary" onClick={() => handleConsult(course.title)} icon={<ArrowRightOutlined />}>
                Đăng ký ngay
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- ADMIN PAGES ---
const CrmDashboard = () => (
  <div>
    <div className="page-header">
      <h1>Tổng quan CRM</h1>
      <Space>
         <Button icon={<ThunderboltOutlined />}>Báo cáo nhanh</Button>
         <Button type="primary" icon={<RocketOutlined />}>Tạo Campaign</Button>
      </Space>
    </div>

    <div className="stats-grid">
      <div className="stat-card">
        <div className="label">Tổng số Leads</div>
        <div className="value">2,845</div>
        <Text type="success" style={{ fontSize: '12px' }}>+12% từ tháng trước</Text>
      </div>
      <div className="stat-card">
        <div className="label">Doanh thu dự kiến</div>
        <div className="value">1.2 tỷ VND</div>
        <Text type="success" style={{ fontSize: '12px' }}>+5% từ tháng trước</Text>
      </div>
      <div className="stat-card">
        <div className="label">Nguồn từ Pancake</div>
        <div className="value">1,120</div>
        <Text type="secondary" style={{ fontSize: '12px' }}>Chiếm 39.4% tổng nguồn</Text>
      </div>
      <div className="stat-card">
        <div className="label">Tỷ lệ chuyển đổi</div>
        <div className="value">24.5%</div>
        <div style={{ width: '100%', height: 4, background: '#eee', marginTop: 8, borderRadius: 2 }}>
           <div style={{ width: '24.5%', height: '100%', background: '#3b82f6', borderRadius: 2 }}></div>
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
       <Card title="Phân tích nguồn khách hàng" style={{ borderRadius: 16 }}>
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
             Biểu đồ phân bổ nguồn (Pancake Facebook, Zalo, Website)
          </div>
       </Card>
       <Card title="Hoạt động gần đây" style={{ borderRadius: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
             <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Avatar icon={<FacebookOutlined />} style={{ background: '#3b82f6' }} />
                <div>
                   <Text strong>Nguyễn An</Text> nhắn tin từ Facebook
                   <br/><Text type="secondary" style={{ fontSize: 12 }}>2 phút trước</Text>
                </div>
             </div>
             <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <Avatar icon={<MessageOutlined />} style={{ background: '#10b981' }} />
                <div>
                   <Text strong>Lê Bình</Text> đăng ký tư vấn qua Website
                   <br/><Text type="secondary" style={{ fontSize: 12 }}>15 phút trước</Text>
                </div>
             </div>
          </Space>
       </Card>
    </div>
  </div>
);

const CustomerList = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = () => {
    fetch(`${API_URL}/customers`)
      .then(res => res.json())
      .then(data => {
        setCustomers(data);
        setLoading(false);
      })
      .catch(err => console.error('Lỗi lấy lead:', err));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSync = () => {
    setLoading(true);
    message.loading({ content: 'Đang kết nối với Pancake API...', key: 'sync' });
    
    fetch(`${API_URL}/sync-pancake`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          message.success({ content: 'Đồng bộ dữ liệu Zalo thành công!', key: 'sync', duration: 3 });
          fetchCustomers();
        } else {
          message.error({ content: 'Lỗi đồng bộ dữ liệu.', key: 'sync' });
          setLoading(false);
        }
      })
      .catch(() => {
        message.error({ content: 'Không thể kết nối với Server.', key: 'sync' });
        setLoading(false);
      });
  };

  const columns = [
    { 
      title: 'Học viên', 
      key: 'user',
      render: (record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <Text strong>{record.full_name}</Text>
            <br/><Text type="secondary" style={{ fontSize: 12 }}>{record.email || 'Chưa cập nhật email'}</Text>
          </div>
        </Space>
      )
    },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone' },
    { 
      title: 'Trạng thái', 
      dataIndex: 'lead_status', 
      key: 'lead_status', 
      render: (s: string) => {
        let color = 'blue';
        if (s === 'CONVERTED') color = 'green';
        if (s === 'CONSULTING') color = 'orange';
        return <Tag color={color} style={{ borderRadius: 4 }}>{s}</Tag>;
      } 
    },
    { 
      title: 'Nguồn dữ liệu', 
      dataIndex: 'source', 
      key: 'source', 
      render: (s: string) => {
        const isPancake = s.includes('pancake');
        return (
          <Tag icon={isPancake ? <ThunderboltOutlined /> : <RocketOutlined />} color={isPancake ? 'purple' : 'cyan'}>
            {s.toUpperCase()}
          </Tag>
        );
      } 
    },
    { 
      title: 'Thời gian', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      render: (d: string) => <Text type="secondary">{new Date(d).toLocaleDateString('vi-VN')}</Text> 
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Quản lý Leads & Học viên</h1>
        <Button 
          type="primary" 
          icon={<SyncOutlined spin={loading} />} 
          onClick={handleSync}
          loading={loading}
        >
          Đồng bộ từ Pancake
        </Button>
      </div>
      <Table 
        dataSource={customers} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 8 }}
      />
    </div>
  );
};

// --- APP ROUTER ---
function App() {
  return (
    <ConfigProvider 
      theme={{ 
        token: { 
          colorPrimary: '#2563eb', 
          borderRadius: 12,
          fontFamily: 'Inter, sans-serif'
        } 
      }}
    >
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/courses" element={<MainLayout><CoursesPage /></MainLayout>} />
          
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminLayout><CrmDashboard /></AdminLayout>} />
          <Route path="/admin/customers" element={<AdminLayout><CustomerList /></AdminLayout>} />
          <Route path="/admin/courses" element={<AdminLayout><CourseAdminPage /></AdminLayout>} />
          <Route path="/admin/logs" element={<AdminLayout><SystemLogPage /></AdminLayout>} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

// Component hiển thị Nhật ký hệ thống
const SystemLogPage = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = () => {
      fetch(`${API_URL}/logs`)
        .then(res => res.json())
        .then(data => setLogs(data))
        .catch(err => console.error('Lỗi lấy log:', err));
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000); // Tự động cập nhật mỗi 3 giây
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Nhật ký hệ thống (Real-time)</h1>
        <Button onClick={() => setLogs([])} icon={<RocketOutlined />}>Xóa nhật ký tạm</Button>
      </div>
      <Card style={{ borderRadius: 16 }}>
        <List
          itemLayout="vertical"
          dataSource={logs}
          renderItem={(log: any) => (
            <List.Item key={log.id}>
              <List.Item.Meta
                title={<Text strong>[{log.time}] {log.message}</Text>}
                description={
                  <pre style={{ background: '#f5f5f5', padding: 8, borderRadius: 4, fontSize: 12 }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                }
              />
            </List.Item>
          )}
          locale={{ emptyText: 'Chưa có dữ liệu Webhook nào được gửi sang.' }}
        />
      </Card>
    </div>
  );
};

// Component mới cho trang quản lý khóa học trong Admin
const CourseAdminPage = () => {
  return (
    <div>
      <div className="page-header">
        <h1>Quản lý nội dung khóa học</h1>
        <Button type="primary" icon={<BookOutlined />}>Thêm khóa học mới</Button>
      </div>
      <Card style={{ borderRadius: 16 }}>
         <Text type="secondary">Tính năng đang được cập nhật. Bạn có thể xem danh sách khóa học ở trang chủ.</Text>
      </Card>
    </div>
  );
};

export default App;
