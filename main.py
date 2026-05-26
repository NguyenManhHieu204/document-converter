import os
import sys
import json
import time
import uuid
import shutil
import hashlib
import zipfile
import threading
import subprocess
import urllib.request
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import webview

# Khởi tạo ứng dụng FastAPI
app = FastAPI(title="Document Converter Backend")

# Cấu hình CORSMiddleware cho phép tất cả các nguồn theo đặc tả hệ thống
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khai báo cấu hình hệ thống và phiên bản
TEMP_DIR = "temp_files"
CURRENT_VERSION = "1.0.0"  # Thay đổi số này khi bạn phát hành bản nâng cấp (ví dụ: "1.0.1")
GITHUB_VERSION_URL = "https://raw.githubusercontent.com/NguyenManhHieu204/document-converter/main/version.json"
# Đảm bảo thư mục tạm luôn tồn tại
os.makedirs(TEMP_DIR, exist_ok=True)


# ==========================================
# MODULE 1: XỬ LÝ CHUYỂN ĐỔI TÀI LIỆU
# ==========================================

@app.post("/api/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    """Chuyển đổi hoàn toàn offline từ PDF sang Word sử dụng pdf2docx"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Định dạng file phải là PDF")
    
    try:
        from pdf2docx import Converter
        
        # Lưu file PDF tạm thời từ client gửi lên
        input_file_path = os.path.join(TEMP_DIR, f"src_{uuid.uuid4().hex[:6]}.pdf")
        with open(input_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Xác định tên file đầu ra (.docx)
        base_name = os.path.splitext(file.filename)[0]
        output_filename = f"Converted_{base_name}_{uuid.uuid4().hex[:4]}.docx"
        output_file_path = os.path.join(TEMP_DIR, output_filename)
        
        # Thực hiện tiến trình chuyển đổi tuyến tính
        cv = Converter(input_file_path)
        cv.convert(output_file_path, start=0, end=None)
        cv.close()
        
        # Dọn dẹp file đầu vào
        os.remove(input_file_path)
        
        # Đã cập nhật: Trả về thêm file_name để Frontend gọi lệnh mở thư mục
        return {
            "status": "success", 
            "download_url": f"/api/download/{output_filename}",
            "file_name": output_filename 
        }
    except Exception as e:
        return {"status": "error", "message": f"Lỗi xử lý hệ thống: {str(e)}"}


@app.post("/api/convert/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    """Chuyển đổi từ Word sang PDF sử dụng docx2pdf (Yêu cầu MS Word trên máy client)"""
    if not file.filename.lower().endswith(('.docx', '.doc')):
        raise HTTPException(status_code=400, detail="Định dạng file phải là Word (.docx, .doc)")
        
    try:
        from docx2pdf import convert as convert_word_to_pdf
        
        # Lưu file Word tạm thời
        ext = os.path.splitext(file.filename)[1]
        input_file_path = os.path.join(TEMP_DIR, f"src_{uuid.uuid4().hex[:6]}{ext}")
        with open(input_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Xác định tên file đầu ra (.pdf)
        base_name = os.path.splitext(file.filename)[0]
        output_filename = f"Converted_{base_name}_{uuid.uuid4().hex[:4]}.pdf"
        output_file_path = os.path.join(TEMP_DIR, output_filename)
        
        # Gọi tương tác qua COM API tới MS Word local
        convert_word_to_pdf(input_file_path, output_file_path)
        
        # Dọn dẹp file đầu vào
        os.remove(input_file_path)
        
        # Đã cập nhật: Trả về thêm file_name để Frontend gọi lệnh mở thư mục
        return {
            "status": "success", 
            "download_url": f"/api/download/{output_filename}",
            "file_name": output_filename
        }
    except Exception as e:
        return {"status": "error", "message": f"Yêu cầu máy tính phải cài đặt Microsoft Word. Chi tiết lỗi: {str(e)}"}


@app.get("/api/download/{file_name}")
async def download_file(file_name: str):
    """Endpoint tải tập tin an toàn từ thư mục temp_files"""
    file_path = os.path.join(TEMP_DIR, file_name)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=file_name, media_type='application/octet-stream')
    raise HTTPException(status_code=404, detail="Không tìm thấy tập tin hoặc tệp tin đã bị xóa.")


# Đã cập nhật: Thêm API kích hoạt mở File Explorer trên Windows
@app.get("/api/open-folder/{file_name}")
async def open_folder(file_name: str):
    """Ra lệnh cho Windows mở File Explorer và highlight file vừa chuyển đổi"""
    try:
        # Lấy đường dẫn tuyệt đối của file
        file_path = os.path.abspath(os.path.join(TEMP_DIR, file_name))
        if os.path.exists(file_path):
            # Lệnh CMD của Windows để mở thư mục và chọn sẵn file
            subprocess.Popen(f'explorer /select,"{file_path}"')
            return {"status": "success"}
        return {"status": "error", "message": "File không tồn tại."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ==========================================
# MODULE 2: HỆ THỐNG PHIÊN BẢN & OTA UPDATE
# ==========================================

@app.get("/api/version")
async def get_current_version():
    """Cung cấp số phiên bản hiện tại cho Frontend hiển thị định danh"""
    return {"version": CURRENT_VERSION}


def calculate_sha256(file_path):
    """Hàm tính toán mã hash SHA-256 xác thực tính toàn vẹn của tệp tải về"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


@app.get("/api/update/check")
async def check_update():
    """Kiểm tra đối chiếu phiên bản từ máy chủ GitHub Raw"""
    try:
        req = urllib.request.Request(GITHUB_VERSION_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            new_version = data.get("version", "1.0.0")
            
            if new_version > CURRENT_VERSION:
                return {
                    "has_update": True,
                    "version": new_version,
                    "changelog": data.get("changelog", ""),
                    "zip_url": data.get("zip_url", ""),
                    "sha256": data.get("sha256", "")
                }
    except Exception:
        pass  # Giữ trạng thái hoạt động offline ổn định nếu không có mạng
    return {"has_update": False, "version": CURRENT_VERSION}


@app.post("/api/update/execute")
async def execute_update(zip_url: str, expected_sha256: str):
    """Xử lý tải, kiểm tra mã băm, giải nén thuần bằng zipfile và ghi đè bằng file batch độc lập"""
    try:
        zip_target_path = os.path.join(TEMP_DIR, "update.zip")
        extract_target_dir = os.path.join(TEMP_DIR, "extracted_update")
        
        # 1. Tải file ZIP cập nhật
        req = urllib.request.Request(zip_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(zip_target_path, 'wb') as out_file:
            shutil.copyfileobj(response, out_file)
        
        # 2. Kiểm tra mã SHA-256 bảo mật chống giả mạo
        actual_sha256 = calculate_sha256(zip_target_path)
        if actual_sha256.lower() != expected_sha256.lower():
            return {"status": "error", "message": "Xác thực SHA-256 thất bại! Tệp tải về không an toàn."}
            
        # 3. Sử dụng zipfile giải nén thuần túy (TUYỆT ĐỐI KHÔNG sử dụng lệnh PowerShell)
        if os.path.exists(extract_target_dir):
            shutil.rmtree(extract_target_dir)
        os.makedirs(extract_target_dir, exist_ok=True)
        
        with zipfile.ZipFile(zip_target_path, 'r') as zip_ref:
            zip_ref.extractall(extract_target_dir)
            
        # 4. Thiết lập kịch bản updater.bat thực thi CMD thuần độc lập sau khi tắt app chính
        bat_path = "updater.bat"
        bat_content = f"""@echo off
timeout /t 1 /nobreak > nul
xcopy "{extract_target_dir}\\*" "." /E /Y /Q
rmdir /S /Q "{extract_target_dir}"
del /Q "{zip_target_path}"
start ChuyenDoiTaiLieu.exe
del "%~f0"
"""
        with open(bat_path, "w", encoding="utf-8") as bat_file:
            bat_file.write(bat_content)
            
        # 5. Kích hoạt tiến trình Batch bên ngoài độc lập không đồng bộ
        subprocess.Popen([bat_path], shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
        
        # 6. Thoát app ngay lập tức để giải phóng tài nguyên hệ thống cho tiến trình .bat ghi đè
        threading.Thread(target=lambda: os._exit(0)).start()
        
        return {"status": "success", "message": "Tiến trình cập nhật đã được khởi động."}
    except Exception as e:
        return {"status": "error", "message": f"Quá trình OTA thất bại: {str(e)}"}


# ==========================================
# KHỞI CHẠY KHUNG ỨNG DỤNG DESKTOP
# ==========================================

def start_fastapi():
    """Khởi chạy máy chủ nội bộ uvicorn cố định tại cổng 18999"""
    uvicorn.run(app, host="127.0.0.1", port=18999, log_level="info")

if __name__ == "__main__":
    # Phân giải đường dẫn tài nguyên thông minh (Giải quyết triệt để lỗi đường dẫn chạy file .exe)
    if getattr(sys, 'frozen', False):
        base_dir = sys._MEIPASS  # Thư mục giải nén tạm thời của PyInstaller (_internal)
    else:
        base_dir = os.path.abspath(".")

    dist_path = os.path.join(base_dir, "dist")

    # Kiểm tra sự tồn tại của thư mục tĩnh giao diện
    if os.path.exists(dist_path):
        app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")
        target_url = "http://127.0.0.1:18999"
    else:
        # Môi trường Development: Trỏ thẳng về cổng dev server hoạt động của Vite (cổng 3001)
        target_url = "http://localhost:3001"

    # Khởi chạy tiểu luồng Backend FastAPI
    server_thread = threading.Thread(target=start_fastapi, daemon=True)
    server_thread.start()

    # Tạo thời gian trễ ngắn tránh hiện tượng Race Condition trước khi wrapper gọi cổng mạng
    time.sleep(1.5)

    # Khởi dựng cửa sổ giao diện hệ điều hành bằng wrapper pywebview
    webview.create_window(
        title="Document Converter",
        url=target_url,
        width=1000,
        height=750,
        resizable=True
    )
    webview.start()