import React, { useState, useEffect } from 'react';
import ConverterCard from './components/ConverterCard';

function App() {
  const [updateMsg, setUpdateMsg] = useState("");
  const [currentAppVersion, setCurrentAppVersion] = useState("Loading...");

  // Hook tự động đồng bộ hóa số phiên bản từ hệ thống Backend khi mở ứng dụng
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch("http://127.0.0.1:18999/api/version");
        const data = await res.json();
        setCurrentAppVersion(data.version);
      } catch (error) {
        setCurrentAppVersion("Unknown");
      }
    };
    fetchVersion();
  }, []);

  // Xử lý kiểm tra và yêu cầu cập nhật phần mềm trực tuyến
  const handleCheckUpdate = async () => {
    try {
      setUpdateMsg("Đang kiểm tra cập nhật...");
      const response = await fetch("http://127.0.0.1:18999/api/update/check");
      const data = await response.json();

      if (data.has_update) {
        const confirmUpdate = window.confirm(
          `Phát hiện phiên bản mới hệ thống: v${data.version}\n\nNội dung thay đổi:\n${data.changelog}\n\nBạn có muốn tiến hành tải bản cập nhật tự động ngay không?`
        );
        
        if (confirmUpdate) {
          setUpdateMsg("Hệ thống đang tải xuống và thực thi nâng cấp bản mới. Vui lòng giữ ứng dụng...");
          
          // Mã hóa tham số URL để chuyển dữ liệu an toàn tới API thực thi
          const encodedUrl = encodeURIComponent(data.zip_url);
          const updateRes = await fetch(
            `http://127.0.0.1:18999/api/update/execute?zip_url=${encodedUrl}&expected_sha256=${data.sha256}`,
            { method: "POST" }
          );
          const updateData = await updateRes.json();
          
          if (updateData.status === "success") {
            alert("Tải bản cập nhật hoàn tất! Ứng dụng sẽ tự đóng ngay bây giờ để tiến hành ghi đè nâng cấp hệ thống.");
          } else {
            alert("Lỗi thực thi cập nhật: " + updateData.message);
            setUpdateMsg("");
          }
        } else {
          setUpdateMsg("");
        }
      } else {
        alert("Ứng dụng của bạn hiện đang là phiên bản mới nhất!");
        setUpdateMsg("");
      }
    } catch (error) {
      alert("Không thể thiết lập kết nối đến máy chủ xác thực phiên bản.");
      setUpdateMsg("");
    }
  };

  return (
    <div className="min-h-screen p-8 relative flex flex-col font-sans select-none">
      {/* Nút hành động kiểm tra cập nhật đặt gọn tại góc giao diện */}
      <button 
        onClick={handleCheckUpdate}
        className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-700 text-sm font-semibold cursor-pointer transition-all duration-200"
      >
        Kiểm tra bản cập nhật
      </button>

      {/* Vùng nội dung ứng dụng trung tâm */}
      <div className="flex-grow">
        <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-2 mt-4 drop-shadow-sm">
          Document Converter
        </h1>
        
        {updateMsg && (
          <p className="text-center text-orange-600 font-bold mb-4 animate-pulse text-sm bg-orange-50 inline-block mx-auto px-4 py-1 rounded-full border border-orange-200 left-1/2 transform -translate-x-1/2 relative">
            {updateMsg}
          </p>
        )}

        <ConverterCard />
      </div>

      {/* Chân trang hiển thị số định danh phiên bản hệ thống */}
      <div className="text-center text-gray-400 text-xs font-medium mt-8 pb-2 tracking-wide">
        Phiên bản hiện tại: v{currentAppVersion}
      </div>
    </div>
  );
}

export default App;