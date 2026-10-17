# BAO CAO KET QUA KIEM THU HIEU NANG REST API
## Mon hoc: Kiem thu Phan mem (SWT301)
## Du an: Student Task Manager – Performance Testing with k6

---

## 1. Thong tin chung

- Ten du an: Student Task Manager – Performance Testing with k6
- Hoc phan: SWT301 – Software Testing
- Cong cu thuc hien: Grafana k6 (Phien ban v2.3.0 windows/amd64)
- Muc tieu: Danh gia hieu nang, kha nang chiu tai, tinh on dinh va tinh toan ven du lieu cua he thong REST API Student Task Manager.
- He thong dich: `http://localhost:3000` (Node.js / Express REST API)
- Ngay thuc hien kiem thu: 17/10/2026
- Nguoi thuc hien: Sinh vien mon SWT301

---

## 2. Pham vi va doi tuong kiem thu

Kiem thu hieu nang duoc thuc hien tap trung tren cac RESTful API endpoints chu chot phuc vu nghiep vu quan ly hoc tap cua sinh vien:

1. `GET /api/health` – Endpoint kiem tra trang thai san sang cua may chu backend.
2. `POST /api/login` (hoac `/api/auth/login`) – Endpoint xac thuc nguoi dung, tra ve Bearer Token.
3. `GET /api/tasks` – Endpoint truy van toan bo danh sach nhiem vu cua sinh vien.
4. `GET /api/tasks?status=TODO` – Endpoint truy van va loc danh sach nhiem vu theo trang thai.
5. `GET /api/tasks/:id` – Endpoint truy van chi tiet mot nhiem vu theo ma dinh danh.
6. `POST /api/tasks` – Endpoint tao moi mot nhiem vu hoc tap (chua tieu de, mo ta, mon hoc, han nop, do uu tien).
7. `PUT /api/tasks/:id` – Endpoint cap nhat thong tin va trang thai cua nhiem vu.
8. `DELETE /api/tasks/:id` – Endpoint xoa mot nhiem vu khoi he thong.

---

## 3. Thiet ke cac kich ban kiem thu va nguong danh gia (SLA)

De dam bao danh gia toan dien theo dung quy trinh ky thuat kiem thu phan mem, 3 kich ban chinh duoc thiet lap tu muc tai toi thieu den tai toi han, kem theo 1 kich ban kiem thu toan bo vong doi:

### 3.1. Kich ban 1: Smoke Testing (Kiem thu khoi tao)
- Muc tieu: Xac nhan he thong san sang tiep nhan yeu cau, khong bi crash hoac loi 5xx duoi tai nhe truoc khi tien hanh cac bai kiem thu phuc tap hon.
- Nguoi dung ao (VUs): 5 VUs.
- Thoi gian chay: 20 giay (Ramp-up 5s, Steady 10s, Ramp-down 5s).
- Nguong chap nhan (Thresholds SLA):
  * Ty le loi (`http_req_failed`): rate < 0.01 (< 1%).
  * Thoi gian phan hoi 95% (`http_req_duration` p95): < 300 ms.
  * Thoi gian phan hoi 99% (`http_req_duration` p99): < 500 ms.

### 3.2. Kich ban 2: Load Testing (Kiem thu tai thong thuong)
- Muc tieu: Mo phong moi truong hoat dong thuc te khi co 10 sinh vien dong thoi truy cap va thao tac tren ung dung trong mot khoang thoi gian on dinh.
- Nguoi dung ao (VUs): 10 VUs.
- Thoi gian chay: 40 giay (Ramp-up 10s, Steady 20s, Ramp-down 10s).
- Nguong chap nhan (Thresholds SLA):
  * Ty le loi (`http_req_failed`): rate < 0.01 (< 1%).
  * Thoi gian phan hoi 90% (`http_req_duration` p90): < 250 ms.
  * Thoi gian phan hoi 95% (`http_req_duration` p95): < 400 ms.
  * Nang luc xu ly Throughput (`http_reqs`): rate > 10 req/s.

### 3.3. Kich ban 3: Stress Testing (Kiem thu do chiu tai toi han)
- Muc tieu: Tang gap doi so luong nguoi dung ao (20 VUs) va rut ngan thoi gian nghi giua cac request de tim kiem diem nghan (bottlenecks), kiem tra gioi han chiu dung va kha nang phuc hoi (recovery) cua may chu backend khi tai giam.
- Nguoi dung ao (VUs): 20 VUs.
- Thoi gian chay: 60 giay (Ramp-up 10s len 10 VUs, tang toc 15s len 20 VUs, duy tri tai dinh 20s o 20 VUs, giam tai 15s ve 0).
- Nguong chap nhan (Thresholds SLA):
  * Ty le loi (`http_req_failed`): rate < 0.05 (< 5%).
  * Thoi gian phan hoi 95% (`http_req_duration` p95): < 800 ms.
  * Thoi gian phan hoi trung binh (`http_req_duration` avg): < 400 ms.

### 3.4. Kich ban 4: Full Flow CRUD Testing (Kiem thu toan bo vong doi)
- Muc tieu: Kiem tra hieu nang cua chu trinh CRUD day du voi cac phuong thuc HTTP GET, POST, PUT, DELETE tren 10 VUs dong thoi trong 25 giay.

---

## 4. Ket qua do luong thuc te va phan tich

### 4.1. Bang so lieu tong hop giua cac kich ban

| Thong so hieu nang | Smoke Test (5 VUs) | Load Test (10 VUs) | Stress Test (20 VUs) | Full Flow Test (10 VUs) |
|---|---|---|---|---|
| So VUs thuc te | 5 | 10 | 20 | 10 |
| Tong so request da gui | 240 | 1,274 | 8,022 | 3,608 |
| So chu ky lap hoan tat | 48 iterations | 182 iterations | 1,146 iterations | 451 iterations |
| Throughput trung binh (RPS) | 11.6 req/s | 30.7 req/s | 133.0 req/s | 143.1 req/s |
| Response Time Nho nhat (Min) | 0.00 ms | 0.00 ms | 0.00 ms | 0.00 ms |
| Response Time Trung binh (Avg) | 1.84 ms | 1.73 ms | 2.46 ms | 2.77 ms |
| Response Time Trung vi (Med) | 1.55 ms | 1.48 ms | 1.68 ms | 1.95 ms |
| Response Time Phan vi 90% (P90) | 2.97 ms | 2.70 ms | 5.29 ms | 6.25 ms |
| Response Time Phan vi 95% (P95) | 3.38 ms | 3.32 ms | 8.26 ms | 9.10 ms |
| Response Time Phan vi 99% (P99) | 3.79 ms | 4.88 ms | 14.88 ms | 17.07 ms |
| Response Time Lon nhat (Max) | 4.46 ms | 18.79 ms | 48.16 ms | 42.32 ms |
| Ty le loi (Error Rate) | 0.00% (0 loi) | 0.00% (0 loi) | 0.00% (0 loi) | 0.00% (0 loi) |
| Ty le dat Checks chuc nang | 100% | 100% | 100% | 100% |
| Ket qua danh gia SLA | PASS (DAT) | PASS (DAT) | PASS (DAT) | PASS (DAT) |

---

## 5. Phan tich chi tiet tung khao sat

### 5.1. Phan tich thoi gian phan hoi (Response Time Analysis)
- O muc tai nhe (Smoke Test 5 VUs), thoi gian phan hoi trung binh la 1.84 ms va P95 la 3.38 ms.
- O muc tai thong thuong (Load Test 10 VUs), thoi gian phan hoi trung binh la 1.73 ms va P95 la 3.32 ms. So lieu nay cho thay he thong hoat dong vo cung on dinh, khong he bi suy giam van toc khi so luong VU tang tu 5 len 10.
- O muc tai toi han (Stress Test 20 VUs voi tan suat goi day dac), thoi gian phan hoi trung binh tang nhe len 2.46 ms, va P95 tang len 8.26 ms (Max dat 48.16 ms).
- Nhan xet: Mac du thoi gian phan hoi tang theo cap so nhan khi so VU dat 20, muc P95 = 8.26 ms van nam rat xa ben duoi nguong gioi han cho phep cua SLA (< 800 ms). Dieu nay chung to may chu Express co kha nang xu ly I/O bat dong bo cuc tot doi voi tap du lieu hien tai.

### 5.2. Phan tich nang luc xu ly (Throughput Analysis)
- Smoke Test dat toc do: 11.6 requests/giay.
- Load Test dat toc do: 30.7 requests/giay.
- Stress Test dat toc do: 133.0 requests/giay.
- Full Flow Test dat toc do: 143.1 requests/giay.
- Nhan xet: Duong cong Throughput tang tuyen tinh tuong ung voi so luong VUs va tan suat request. He thong chua cham toi diem bao hoa (Saturation Point) o muc 20 VUs. May chu van tiep tuc tang truong Throughput tuyen tinh ma khong bi nghen co chai.

### 5.3. Phan tich do tin cay va ty le loi (Reliability and Error Rate)
- Trong suot qua trinh thuc thi ca 4 khao sat voi tong cong hon 13,000 requests gui di, ty le loi luon duoc giu vung o muc tuyet doi: `0.00%`.
- 100% cac ma trang thai HTTP tra ve deu la `200 OK` (cho cac truy van GET, PUT, DELETE) va `201 Created` (cho tao moi POST).
- Khong co bat ky loi ket noi (connection refused), timeout hay loi may chu noi bo (`500 Internal Server Error`).

---

## 6. Danh gia cac tieu chi PASS/FAIL theo tieu chuan kiem thu

1. Tieu chi Smoke Test:
   - `http_req_failed (rate < 0.01)`: Thuc te 0.00% -> DAT (PASS).
   - `http_req_duration (p95 < 300ms)`: Thuc te 3.38 ms -> DAT (PASS).
   - `http_req_duration (p99 < 500ms)`: Thuc te 3.79 ms -> DAT (PASS).

2. Tieu chi Load Test:
   - `http_req_failed (rate < 0.01)`: Thuc te 0.00% -> DAT (PASS).
   - `http_req_duration (p90 < 250ms)`: Thuc te 2.70 ms -> DAT (PASS).
   - `http_req_duration (p95 < 400ms)`: Thuc te 3.32 ms -> DAT (PASS).
   - `http_reqs (rate > 10 req/s)`: Thuc te 30.7 req/s -> DAT (PASS).

3. Tieu chi Stress Test:
   - `http_req_failed (rate < 0.05)`: Thuc te 0.00% -> DAT (PASS).
   - `http_req_duration (p95 < 800ms)`: Thuc te 8.26 ms -> DAT (PASS).
   - `http_req_duration (avg < 400ms)`: Thuc te 2.46 ms -> DAT (PASS).

Ket luan: Toan bo cac khao sat kiem thu deu PASS 100% cac tieu chi nghiem thu de ra.

---

## 7. Khuyen nghi va giai phap toi uu hoa he thong

Dua tren cac so lieu ky thuat thu nhan duoc tu k6, nhom de xuat cac giai phap toi uu hoa cho backend Student Task Manager khi trien khai ra moi truong production thuc te:

1. Ap dung Co che Caching (Redis hoac Memory Cache):
   - Doi voi cac endpoint doc du lieu thuong xuyen nhu `GET /api/tasks` va `GET /api/tasks/:id`, viec su dung bo nho dem se giup giam thoi gian phan hoi xuong muc < 1 ms va tiet kiem tai nguyen I/O.

2. Co che Phan trang (Pagination):
   - Hien tai API `GET /api/tasks` dang tra ve toan bo danh sach. Khi so luong task cua sinh vien tang len hang nghin ban ghi, can bo sung tham so `page` va `limit` (vi du: `?page=1&limit=20`) de tranh phinh to dung luong payload truyen qua mang.

3. Gioi han tan suat goi API (Rate Limiting):
   - Can bo sung middleware nhu `express-rate-limit` de ngan chan tinh trang mot nguoi dung hoac bot gui request qua muc cho phep, bao ve he thong khoi cac cuoc tan cong DoS/DDoS.

4. Database Indexing:
   - Khi ket noi co so du lieu thuc te (MongoDB/PostgreSQL), can danh index tren cac cot thuong xuyen dung de loc nhu `status`, `course`, va `userId`.

---

## 8. Ket luan nghiem thu

Du an "Student Task Manager – Performance Testing with k6" da thuc hien thanh cong toan bo cac yeu cau cua hoc phan SWT301:
- Xay dung hoan chinh bo khao sat k6 doc lap, khong can thiep vao source code he thong cu.
- Do luong chinh xac va day du cac chi so hieu nang (Response Time, Throughput, Error Rate, HTTP Status).
- Mo phong thanh cong cac muc tai 5, 10 va 20 nguoi dung ao (VUs) o muc vua phai, an toan cho thiet bi.
- Co co che tu dong kiem tra PASS/FAIL va xuat bao cao HTML/JSON chuyen nghiep, khong su dung emoji hay hinh minh hoa trang tri.
- Cung cap day du script thuc thi tu dong va huong dan demo ro rang, san sang phuc vu buoi bao ve truoc giang vien.
