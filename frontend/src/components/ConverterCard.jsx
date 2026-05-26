import React, { useState } from 'react';

const ConverterCard = () => {
  const [file, setFile] = useState(null);
  const [convertType, setConvertType] = useState('pdf-to-word'); // 'pdf-to-word' hoặc 'word-to-pdf'
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      alert("Vui lòng chọn file cần chuyển đổi!");
      return;
    }

    // Kiểm tra đuôi file có khớp với chế độ không
    if (convertType === 'pdf-to-word' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert("Vui lòng chọn file PDF!"); return;
    }
    if (convertType === 'word-to-pdf' && !file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
      alert("Vui lòng chọn file Word (.docx, .doc)!"); return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Đồng bộ sử dụng IP 127.0.0.1 để đảm bảo độ ổn định khi giao tiếp với Backend ngầm
      const endpoint = `http://127.0.0.1:18999/api/convert/${convertType}`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.status === "success") {
        // Gọi API yêu cầu Windows mở thư mục chứa file và highlight nó
        await fetch(`http://127.0.0.1:18999/api/open-folder/${data.file_name}`);
        
        // Reset lại ô chọn file để tiện làm file tiếp theo
        setFile(null); 
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Không thể kết nối đến Backend!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl shadow-md overflow-hidden p-6 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Chuyển Đổi Tài Liệu</h2>
      
      {/* Nút chọn chế độ chuyển đổi */}
      <div className="flex justify-center mb-6 space-x-4">
        <button 
          onClick={() => { setConvertType('pdf-to-word'); setFile(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${convertType === 'pdf-to-word' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent'}`}
        >
          PDF Sang Word
        </button>
        <button 
          onClick={() => { setConvertType('word-to-pdf'); setFile(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${convertType === 'word-to-pdf' ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 text-gray-600 border-2 border-transparent'}`}
        >
          Word Sang PDF
        </button>
      </div>

      {/* Khu vực Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors relative">
        <input 
          type="file" 
          accept={convertType === 'pdf-to-word' ? ".pdf" : ".docx,.doc"} 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
        <div className="flex flex-col items-center pointer-events-none">
          <svg className="w-12 h-12 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <span className="text-gray-700 font-medium">
            {file ? `Đã chọn: ${file.name}` : `Nhấn hoặc kéo thả file ${convertType === 'pdf-to-word' ? 'PDF' : 'Word'} vào đây`}
          </span>
        </div>
      </div>

      <button 
        onClick={handleConvert}
        disabled={loading || !file}
        className={`mt-6 w-full py-3 px-4 rounded-lg text-white font-bold text-lg transition-all ${
          loading || !file 
            ? 'bg-blue-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 shadow-md'
        }`}
      >
        {loading ? 'Đang xử lý...' : 'Bắt Đầu Chuyển Đổi'}
      </button>
    </div>
  );
};

export default ConverterCard;