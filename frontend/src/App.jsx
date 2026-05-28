import React, { useState, useEffect } from 'react';
import ConverterCard from './components/ConverterCard';
import Swal from 'sweetalert2';
import { Moon, Sun, RefreshCw, FileText, Settings, Clock } from 'lucide-react';

function App() {
  const [currentAppVersion, setCurrentAppVersion] = useState("...");
  const [updateMsg, setUpdateMsg] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Hàm tạo Hộp thoại cập nhật (Dùng chung cho cả Tự động và Bấm nút)
  const promptUpdate = (data) => {
    Swal.fire({
      title: `Phát hiện bản mới: v${data.version}`,
      html: `<b>Nội dung cập nhật:</b><br/>${data.changelog}`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',     
      cancelButtonColor: '#64748b',      
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Bỏ qua',
      allowOutsideClick: false // Ép người dùng phải chọn 1 trong 2 nút
    }).then(async (result) => {
      if (result.isConfirmed) {
        setUpdateMsg("Đang tải & cài đặt...");
        const updateRes = await fetch(
          `http://127.0.0.1:18999/api/update/execute?zip_url=${encodeURIComponent(data.zip_url)}&expected_sha256=${data.sha256}`,
          { method: "POST" }
        );
        if ((await updateRes.json()).status === "success") {
          setUpdateMsg("Đang khởi động lại...");
        }
      }
    });
  };

  useEffect(() => {
    // 1. Kiểm tra xem có phải vừa nâng cấp xong không
    const params = new URLSearchParams(window.location.search);
    if (params.get("updated") === "true") {
      Swal.fire({
        icon: 'success',
        title: 'Nâng cấp hoàn tất!',
        text: 'Chào mừng bạn đến với phiên bản mới nhất.',
        confirmButtonColor: '#2563eb'
      });
    }
    
    // 2. Lấy số phiên bản hiện tại để hiển thị
    fetch("http://127.0.0.1:18999/api/version")
      .then(res => res.json())
      .then(data => setCurrentAppVersion(data.version))
      .catch(() => setCurrentAppVersion("..."));

    // 3. TỰ ĐỘNG KIỂM TRA CẬP NHẬT NGẦM KHI MỞ APP
    const autoCheckUpdate = async () => {
      try {
        const response = await fetch("http://127.0.0.1:18999/api/update/check");
        const data = await response.json();
        // Nếu có bản mới -> Tự động bật Popup luôn
        if (data.has_update) {
          promptUpdate(data);
        }
        // Nếu không có bản mới -> Im lặng, không làm phiền người dùng
      } catch (error) {
        // Lỗi mạng lúc khởi động cũng im lặng bỏ qua
      }
    };

    // Đợi 1.5 giây sau khi UI load xong mới check để tránh giật lag lúc khởi động
    setTimeout(() => {
      autoCheckUpdate();
    }, 1500);

  }, []);

  // Hàm xử lý khi người dùng CHỦ ĐỘNG BẤM NÚT "Kiểm tra cập nhật"
  const handleCheckUpdate = async () => {
    try {
      setUpdateMsg("Đang kiểm tra...");
      const response = await fetch("http://127.0.0.1:18999/api/update/check");
      const data = await response.json();

      if (data.has_update) {
        setUpdateMsg("");
        promptUpdate(data);
      } else {
        // Khi tự bấm nút mà không có update thì mới báo là "Đã cập nhật"
        Swal.fire({
          icon: 'success',
          title: 'Đã cập nhật',
          text: 'Bạn đang dùng phiên bản mới nhất!',
          confirmButtonColor: '#2563eb'
        });
        setUpdateMsg("");
      }
    } catch (error) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Lỗi mạng', 
        text: 'Không thể kiểm tra bản cập nhật lúc này. Vui lòng kiểm tra kết nối internet!', 
        confirmButtonColor: '#2563eb' 
      });
      setUpdateMsg("");
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 flex overflow-hidden font-sans select-none transition-colors duration-300">
      
      {/* CỘT TRÁI - SIDEBAR */}
      <div className="w-64 glass border-r border-slate-200 dark:border-slate-800/50 flex flex-col p-6 relative z-10">
        
        <div className="flex space-x-2 mb-10">
          <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-red-500/80 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-yellow-500/80 shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-green-500/80 shadow-sm"></div>
        </div>

        <div className="mb-8 flex justify-between items-start">
          <h1 className="text-2xl font-black leading-tight tracking-tight bg-gradient-to-br from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Document<br />
            Converter
          </h1>
          <button 
            onClick={toggleDarkMode} 
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="space-y-3 flex-grow">
          <button className="w-full h-11 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold rounded-xl flex items-center px-4 transition-all">
            <FileText size={18} className="mr-3" />
            Chuyển Đổi
          </button>
          <button className="w-full h-11 text-slate-500 dark:text-slate-400 font-medium rounded-xl flex items-center px-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-not-allowed opacity-60">
            <Clock size={18} className="mr-3" />
            Lịch Sử
          </button>
          <button className="w-full h-11 text-slate-500 dark:text-slate-400 font-medium rounded-xl flex items-center px-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-not-allowed opacity-60">
            <Settings size={18} className="mr-3" />
            Cài Đặt
          </button>
        </div>

        {/* Nút cập nhật */}
        <div className="mt-auto">
          {updateMsg && (
            <div className="flex items-center justify-center text-xs text-orange-500 font-semibold mb-3 animate-pulse">
              <RefreshCw size={12} className="mr-1.5 animate-spin" />
              {updateMsg}
            </div>
          )}
          <button 
            onClick={handleCheckUpdate}
            className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all mb-4 flex items-center justify-center"
          >
            <RefreshCw size={14} className="mr-2" />
            Kiểm tra bản mới
          </button>
          <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
            Phiên bản v{currentAppVersion}
          </div>
        </div>
      </div>

      {/* CỘT PHẢI - MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        <div className="relative z-10 w-full flex justify-center">
          <ConverterCard darkMode={darkMode} />
        </div>
      </div>

    </div>
  );
}

export default App;