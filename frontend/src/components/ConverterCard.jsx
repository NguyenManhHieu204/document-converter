import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { UploadCloud, FileText, FileImage, ArrowRight, Loader2 } from 'lucide-react';

const ConverterCard = ({ darkMode }) => {
  const [file, setFile] = useState(null);
  const [convertType, setConvertType] = useState('pdf-to-word'); 
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) setFile(e.target.files[0]);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleConvert = async () => {
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'Chưa chọn tệp', text: 'Vui lòng chọn tài liệu cần chuyển đổi!', confirmButtonColor: '#2563eb' });
      return;
    }
    if (convertType === 'pdf-to-word' && !file.name.toLowerCase().endsWith('.pdf')) {
      Swal.fire({ icon: 'error', title: 'Sai định dạng', text: 'Vui lòng chọn file PDF!', confirmButtonColor: '#2563eb' });
      return;
    }
    if (convertType === 'word-to-pdf' && !file.name.toLowerCase().endsWith('.docx') && !file.name.toLowerCase().endsWith('.doc')) {
      Swal.fire({ icon: 'error', title: 'Sai định dạng', text: 'Vui lòng chọn file Word!', confirmButtonColor: '#2563eb' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`http://127.0.0.1:18999/api/convert/${convertType}`, {
        method: "POST", body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        Swal.fire({
          icon: 'success',
          title: 'Thành công!',
          text: 'Tài liệu đã được chuyển đổi xong.',
          timer: 2000,
          showConfirmButton: false
        });
        await fetch(`http://127.0.0.1:18999/api/open-folder/${data.file_name}`);
        setFile(null); 
      } else {
        Swal.fire({ icon: 'error', title: 'Lỗi chuyển đổi', text: data.message, confirmButtonColor: '#2563eb' });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Lỗi kết nối hệ thống!',
        text: 'Không thể kết nối đến máy chủ xử lý. Vui lòng khởi động lại ứng dụng.',
        confirmButtonColor: '#2563eb'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto glass-card rounded-3xl p-8 relative">
      
      {/* Tabs chọn đuôi file - Segmented Control */}
      <div className="flex justify-between mb-8 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl relative shadow-inner">
        <div 
          className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-slate-700 rounded-xl shadow-sm transition-transform duration-300 ease-in-out"
          style={{ transform: convertType === 'word-to-pdf' ? 'translateX(100%)' : 'translateX(0)' }}
        ></div>
        
        <button 
          onClick={() => { setConvertType('pdf-to-word'); setFile(null); }}
          className={`flex-1 py-2.5 z-10 font-bold text-sm rounded-xl transition-colors ${convertType === 'pdf-to-word' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          PDF to Word
        </button>
        <button 
          onClick={() => { setConvertType('word-to-pdf'); setFile(null); }}
          className={`flex-1 py-2.5 z-10 font-bold text-sm rounded-xl transition-colors ${convertType === 'word-to-pdf' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Word to PDF
        </button>
      </div>

      {/* Khu vực Drag & Drop */}
      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl h-56 flex flex-col items-center justify-center transition-all duration-300 ${
          file 
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
            : isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-slate-800/80 scale-[1.02]'
              : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60'
        }`}
      >
        <input 
          type="file" 
          accept={convertType === 'pdf-to-word' ? ".pdf" : ".docx,.doc"} 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
        
        <div className="text-center pointer-events-none px-4 flex flex-col items-center">
          <div className={`p-4 rounded-full mb-4 transition-colors ${file ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
            {file ? (
              convertType === 'pdf-to-word' ? <FileText size={32} /> : <FileImage size={32} />
            ) : (
              <UploadCloud size={32} />
            )}
          </div>
          
          <span className={`font-semibold text-[15px] mb-1 ${file ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {file ? file.name : "Kéo thả tài liệu vào đây"}
          </span>
          {!file && <p className="text-slate-400 dark:text-slate-500 text-[13px]">hoặc click để chọn file từ máy</p>}
        </div>
      </div>

      {/* Nút CHUYỂN ĐỔI */}
      <button 
        onClick={handleConvert}
        disabled={loading || !file}
        className={`mt-8 w-full py-4 rounded-2xl font-bold text-[15px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center ${
          loading || !file 
            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none' 
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-[0_10px_20px_rgba(37,99,235,0.3)] dark:shadow-[0_10px_20px_rgba(37,99,235,0.15)] hover:-translate-y-1'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            ĐANG XỬ LÝ...
          </>
        ) : (
          <>
            CHUYỂN ĐỔI NGAY
            <ArrowRight size={18} className="ml-2" />
          </>
        )}
      </button>

    </div>
  );
};

export default ConverterCard;