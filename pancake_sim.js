import fetch from 'node-fetch';

/**
 * FILE GIẢ LẬP PANCAKE CRM GỬI DỮ LIỆU VỀ WEBSITE
 * Chạy lệnh: node pancake_sim.js
 */

const WEBHOOK_URL = 'https://app-lien-ke-pancake.vercel.app/api/pancake-webhook';

const mockLeads = [
  {
    name: "Nguyễn Hoài Bảo",
    phone: "0911222333",
    email: "hoaibao@gmail.com",
    source_type: "facebook",
    message_content: "Chào shop, mình muốn tư vấn khóa học ReactJS từ Fanpage!"
  },
  {
    name: "Lê Thị Hồng",
    phone: "0344555666",
    email: "hongle@zalo.vn",
    source_type: "zalo",
    message_content: "Tư vấn cho mình khóa Node.js nhé (Nhắn từ Zalo OA)"
  }
];

async function simulatePancakeSync() {
  console.log('🚀 Bắt đầu giả lập đồng bộ dữ liệu từ Pancake CRM...');
  
  for (const lead of mockLeads) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      
      if (response.ok) {
        console.log(`✅ Thành công: Đã gửi khách hàng [${lead.name}] từ [${lead.source_type}] về Website.`);
      } else {
        console.error(`❌ Thất bại: Không thể gửi dữ liệu cho [${lead.name}]. Kiểm tra xem server.js có đang chạy không?`);
      }
    } catch (error) {
      console.error(`❌ Lỗi kết nối: ${error.message}`);
    }
  }
  
  console.log('\n✨ Xong! Hãy quay lại trang Quản trị CRM trên Website để kiểm tra kết quả.');
}

simulatePancakeSync();
