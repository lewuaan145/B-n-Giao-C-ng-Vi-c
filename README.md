# Công việc hằng ngày — Web App

App nhập liệu công việc hằng ngày, thay thế file Excel, dữ liệu lưu trên Google Sheet,
web app chạy miễn phí trên GitHub Pages.

```
GitHub Pages (web app)  →  Google Apps Script (API)  →  Google Sheet (dữ liệu)
```

## Bước 1 — Tạo Google Sheet + Apps Script (chỉ làm 1 lần)

1. Vào [sheets.google.com](https://sheets.google.com), tạo 1 spreadsheet mới, đặt tên
   ví dụ **"Công việc hằng ngày — Data"**.
2. Trong sheet, vào menu **Extensions > Apps Script**.
3. Xoá hết code mẫu, dán toàn bộ nội dung file
   [`apps-script/Code.gs`](apps-script/Code.gs) vào.
4. Bấm **Save**, đặt tên project tuỳ ý.
5. Bấm **Deploy > New deployment**.
   - Chọn loại **Web app**.
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
   - Bấm **Deploy**. Lần đầu Google yêu cầu cấp quyền — chọn tài khoản của bạn,
     bấm **Advanced > Go to (tên project) (unsafe)** rồi **Allow** (đây là script
     của chính bạn nên an toàn).
6. Copy **Web app URL** (dạng `https://script.google.com/macros/s/xxxxx/exec`) —
   đây chính là "link" cần dùng ở bước 3.

   > Lưu ý: đây **không phải** link chia sẻ sheet thông thường (dạng
   > `docs.google.com/spreadsheets/...`). Link chia sẻ sheet không dùng để ghi dữ liệu
   > được — cần đi qua Apps Script Web App ở trên để app có quyền ghi vào Sheet.

7. Lần đầu app chạy, các sheet `QL_Data`, `QL_Items`, `CauHinh` sẽ **tự động được tạo**
   trong spreadsheet. Mở sheet `CauHinh` để **chỉnh danh sách công việc định kỳ**
   (mỗi dòng 1 mục) — sửa/thêm/xoá trực tiếp ở đây bất cứ lúc nào.

## Bước 2 — Đưa lên GitHub Pages

1. Tạo 1 repo mới trên GitHub (public), ví dụ `cong-viec-hang-ngay`.
2. Upload toàn bộ nội dung thư mục này lên repo.
3. Vào **Settings > Pages** của repo → **Source**: `Deploy from a branch` →
   branch `main`, thư mục `/ (root)` → **Save**.
4. Sau khoảng 1 phút, GitHub hiện link app, dạng:
   `https://<tên-github-của-bạn>.github.io/cong-viec-hang-ngay/`

## Bước 3 — Gắn link Google Sheet vào app (chỉ cần dán, không sửa code)

1. Mở link app vừa deploy. Lần đầu app sẽ tự mở màn **Cài đặt kết nối**.
2. Dán **Web app URL** đã copy ở Bước 1 vào ô, bấm **Lưu**.
3. Xong — link được lưu ngay trên trình duyệt đó. Ai mở app từ máy/trình duyệt khác
   cũng làm y vậy 1 lần (bấm ⚙ ở góc trên để mở lại màn Cài đặt bất cứ lúc nào).

Gửi link app cho các quản lý khác — không cần đăng nhập, ai có link đều truy cập
được (đúng theo lựa chọn "công khai").

## Cách dùng

- Mở app luôn hiện **ngày hôm nay**. Dùng `‹` `›` để xem ngày khác, nút **●** để
  quay về hôm nay.
- **Công việc định kỳ**: tick từng mục, bấm **Lưu công việc định kỳ** để ghi lại.
  Muốn đổi list mục định kỳ áp dụng cho mọi ngày sau này → sửa trực tiếp sheet `CauHinh`.
- **CTKM / Deadline / Phát sinh**: bấm nút **+ Thêm** để thêm 1 mục mới — gõ nội dung
  và **chọn ngày áp dụng** (mặc định là ngày đang xem, nhưng đổi được sang ngày khác,
  ví dụ thêm deadline cho 3 ngày sau ngay từ hôm nay). Mỗi mục thêm/tick/xoá đều **lưu
  ngay lập tức**, không cần bấm Lưu riêng.
- "Lịch sử gần đây" hiện các ngày đã có dữ liệu — bấm vào để mở lại ngày đó.

## Giới hạn cần biết

- App công khai (không mật khẩu) theo đúng lựa chọn ban đầu.
- Link Apps Script lưu theo **trình duyệt/thiết bị** (localStorage) — mỗi quản lý mở
  app lần đầu trên máy của họ cần dán link 1 lần.
- Dữ liệu lịch sử trong file Excel cũ **không tự động import** — báo lại nếu muốn
  mình viết thêm script chuyển dữ liệu cũ vào.
