# Student Task Manager – Performance Testing with k6

Du an kiem thu hieu nang REST API he thong Quan ly Nhiem vu Sinh vien (Student Task Manager) su dung cong cu Grafana k6, phuc vu hoc phan Kiem thu Phan mem (SWT301).

---

## 1. Tong quan du an

Dua tren he thong REST API hien co cua Student Task Manager chay tai dia chi `http://localhost:3000`, du an nay thuc hien kiem thu hieu nang (Performance Testing) doc lap bang cong cu k6 voi cac muc tai mo phong vua phai gom 5, 10 va 20 nguoi dung ao (Virtual Users - VUs).

Cac tieu chi danh gia chinh bao gom:
- Thoi gian phan hoi (Response Time: Avg, Med, P90, P95, P99, Max).
- Nang luc xu ly he thong (Throughput: Requests per second - RPS).
- Ty le phat sinh loi (Error Rate: Ty le request that bai hoac HTTP status khac 2xx).
- Tinh dung dan cua ma trang thai HTTP (HTTP Status Code: 200 OK, 201 Created).
- Kha nang chiu tai va hoi phuc khi tai tang dot bien.

Toan bo qua trinh kiem thu duoc tu dong hoa, co co che danh gia PASS/FAIL theo nguong SLA ro rang va tu dong xuat bao cao HTML/JSON truc quan, chuyen nghiep.

---

## 2. Cau truc thu muc du an

```text
student-task-manager-performance-testing/
│
├── bin/
│   └── k6.exe                     Ung dung k6 portable san sang thuc thi
│
├── config/
│   └── environment.js             Cau hinh endpoint, tai khoan test va nguong SLA
│
├── data/
│   └── test-payloads.js           Du lieu mau dong cho cac request POST va PUT
│
├── scripts/
│   ├── 01_smoke_test.js           Kich ban 1: Smoke Testing (5 VUs)
│   ├── 02_load_test.js            Kich ban 2: Load Testing (10 VUs)
│   ├── 03_stress_test.js          Kich ban 3: Stress Testing (20 VUs)
│   └── full_flow_test.js          Kich ban bo sung: Full Flow CRUD Test (10 VUs)
│
├── utils/
│   ├── api-client.js              Module goi REST API chuan hoa cho k6
│   └── reporter.js                Trinh xuat bao cao HTML va JSON toi gian, chuyen nghiep
│
├── reports/                       Thu muc chua cac bao cao sau khi thuc thi test
│   ├── smoke-test-report.html
│   ├── smoke-test-summary.json
│   ├── load-test-report.html
│   ├── load-test-summary.json
│   ├── stress-test-report.html
│   ├── stress-test-summary.json
│   ├── full-flow-test-report.html
│   └── full-flow-test-summary.json
│
├── run-smoke-test.bat             File chay nhanh Smoke Test tren Windows (Batch)
├── run-load-test.bat              File chay nhanh Load Test tren Windows (Batch)
├── run-stress-test.bat            File chay nhanh Stress Test tren Windows (Batch)
├── run-all-tests.bat              File chay toan bo 3 kich ban lien tiep (Batch)
│
├── run-smoke-test.ps1             File chay Smoke Test (PowerShell)
├── run-load-test.ps1              File chay Load Test (PowerShell)
├── run-stress-test.ps1            File chay Stress Test (PowerShell)
├── run-all-tests.ps1              File chay toan bo suite test (PowerShell)
├── start-api-server.bat           File ho tro khoi dong API Server tren port 3000
├── start-api-server.ps1           File ho tro khoi dong API Server bang PowerShell
│
├── package.json                   Khai bao thong tin du an va cac lenh npm scripts
├── .gitignore                     Cau hinh loai tru file rac va binary lon
├── README.md                      Tai lieu huong dan du an chi tiet
└── BAO_CAO_HIEU_NANG.md           Bao cao phan tich so lieu thuc te cho giang vien
```

---

## 3. Cac khai niem cot loi ve kiem thu hieu nang

Trong kiem thu hieu nang voi k6, cac thuat ngu ky thuat duoc ap dung nhu sau:

1. Virtual Users (VUs):
   Nguoi dung ao. Moi VU la mot tien trinh doc lap thuc thi lien tuc cac vong lap (iterations) trong kich ban kiem thu, mo phong hanh vi thuc te cua sinh vien khi su dung he thong.

2. Response Time (Thoi gian phan hoi):
   Khoang thoi gian tinh tu luc client bat dau gui yeu cau HTTP cho den khi nhan toan bo goi tin phan hoi tu may chu (`http_req_duration`).
   - Average (avg): Thoi gian phan hoi trung binh.
   - Median (med / p50): Muc thoi gian ma 50% request co toc do phan hoi nhanh hon.
   - 90th Percentile (p90): 90% tong so request phan hoi nhanh hon moc nay.
   - 95th Percentile (p95): 95% tong so request phan hoi nhanh hon moc nay (chi so SLA quan trong nhat trong cong nghiep phan mem).
   - 99th Percentile (p99): 99% tong so request phan hoi nhanh hon moc nay, giup phat hien cac yeu cau bi tre bat thuong (outliers).

3. Throughput (Nang luc xu ly):
   So luong yeu cau HTTP ma he thong dap ung thanh cong tren moi giay (Requests per Second - RPS). Chi so nay phan anh nang suat phuc vu cua he thong duoi tai.

4. Error Rate (Ty le loi):
   Ty le phan tram so request gap loi ket noi mang hoac tra ve ma trang thai HTTP loi (status >= 400). He thong on dinh phai duy tri ty le nay o muc 0% hoac duoi nguong SLA (< 1%).

5. Thresholds (Nguong danh gia):
   Cac tieu chi ky thuat dat ra truoc khi kiem thu. Neu he thong vi pham bat ky nguong nao (vi du P95 > 400ms hoac Error Rate > 1%), k6 se tu dong danh dau ket qua la FAIL.

---

## 4. Mo ta chi tiet cac kich ban kiem thu

### Kich ban 1: Smoke Testing (Kiem thu khoi tao / kiem thu tinh san sang)
- File thuc thi: `scripts/01_smoke_test.js`
- So nguoi dung ao: 5 VUs.
- Thoi gian chay: 20 giay (5s ramp-up -> 10s duy tri -> 5s ramp-down).
- Muc tieu: Xac minh tinh san sang cua may chu API va dam bao tat ca cac endpoint co ban (Health, Login, Get Tasks, Get Detail, Create Task) hoat dong chinh xac truoc khi kiem thu tai lon hon.
- Nguong SLA:
  - `http_req_failed`: rate < 0.01 (ty le loi < 1%)
  - `http_req_duration`: p(95) < 300ms, p(99) < 500ms

### Kich ban 2: Load Testing (Kiem thu tai thong thuong)
- File thuc thi: `scripts/02_load_test.js`
- So nguoi dung ao: 10 VUs.
- Thoi gian chay: 40 giay (10s ramp-up -> 20s duy tri on dinh -> 10s ramp-down).
- Muc tieu: Danh gia hieu nang he thong o muc tai van hanh tieu chuan theo thiet ke khi 10 sinh vien dong thoi dang nhap, tra cuu, loc danh sach va them/sua nhiem vu hoc tap.
- Nguong SLA:
  - `http_req_failed`: rate < 0.01 (ty le loi < 1%)
  - `http_req_duration`: p(90) < 250ms, p(95) < 400ms
  - `http_reqs`: rate > 10 req/s

### Kich ban 3: Stress Testing (Kiem thu do chiu tai toi han)
- File thuc thi: `scripts/03_stress_test.js`
- So nguoi dung ao: 20 VUs.
- Thoi gian chay: 60 giay (10s ramp-up 10 VUs -> 15s tang dot bien len 20 VUs -> 20s duy tri dinh tai -> 15s giam tai ve 0).
- Muc tieu: Tim kiem diem nghan (bottleneck), kiem tra do on dinh cua backend khi tai tang gap doi muc thong thuong, xac dinh xem he thong co bi crash hoac phat sinh loi 5xx khong, va kiem tra kha nang tu phuc hoi sau khi het tai cao.
- Nguong SLA:
  - `http_req_failed`: rate < 0.05 (ty le loi < 5%)
  - `http_req_duration`: p(95) < 800ms, avg < 400ms

### Kich ban 4: Full Flow CRUD Testing (Kiem thu toan bo vong doi REST API)
- File thuc thi: `scripts/full_flow_test.js`
- So nguoi dung ao: 10 VUs.
- Thoi gian chay: 25 giay.
- Muc tieu: Kiem tra hieu nang va tinh toan ven du lieu khi mo phong tron ven 100% cac phuong thuc HTTP: GET (danh sach, chi tiet, filter), POST (login, tao task), PUT (cap nhat task), DELETE (xoa task).

---

## 5. Bang tong hop ket qua kiem thu thuc te

Toan bo so lieu duoi day duoc ghi nhan truc tiep tu qua trinh thuc thi k6 tren REST API `http://localhost:3000`:

| Thong so do luong | Smoke Test (5 VUs) | Load Test (10 VUs) | Stress Test (20 VUs) | Full Flow (10 VUs) |
|---|---|---|---|---|
| So VUs toi da | 5 VUs | 10 VUs | 20 VUs | 10 VUs |
| Thoi gian chay | 20.7 giay | 41.5 giay | 60.3 giay | 25.2 giay |
| Tong so request | 240 requests | 1,274 requests | 8,022 requests | 3,608 requests |
| So chu ky lap (Iterations) | 48 chu ky | 182 chu ky | 1,146 chu ky | 451 chu ky |
| Throughput trung binh | 11.6 req/s | 30.7 req/s | 133.0 req/s | 143.1 req/s |
| Response Time Trung binh | 1.84 ms | 1.73 ms | 2.46 ms | 2.77 ms |
| Response Time P90 | 2.97 ms | 2.70 ms | 5.29 ms | 6.25 ms |
| Response Time P95 | 3.38 ms | 3.32 ms | 8.26 ms | 9.10 ms |
| Response Time P99 | 3.79 ms | 4.88 ms | 14.88 ms | 17.07 ms |
| Response Time Max | 4.46 ms | 18.79 ms | 48.16 ms | 42.32 ms |
| Ty le loi (Error Rate) | 0.00% (0/240) | 0.00% (0/1,274) | 0.00% (0/8,022) | 0.00% (0/3,608) |
| Ma phan hoi HTTP Status | 200, 201 (100%) | 200, 201 (100%) | 200, 201 (100%) | 200, 201 (100%) |
| Danh gia ket qua SLA | PASS (DAT) | PASS (DAT) | PASS (DAT) | PASS (DAT) |

---

## 6. Huong dan chay demo cho giang vien

### Buoc 1: Dam bao API Server dang hoat dong tren cong 3000
Mo mot cua so terminal hoac chay tap tin khoi dong:
```powershell
.\start-api-server.bat
```
Hoac su dung lenh PowerShell:
```powershell
.\start-api-server.ps1
```
Kiem tra ket noi:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet
```
Neu tra ve `True`, API Server da san sang tiep nhan yeu cau.

### Buoc 2: Chay cac kich ban kiem thu

#### Cach 1: Su dung tap tin Batch (.bat) – Nhanh nhat tren Windows
Nguoi dung chi can click dup chuot vao cac file:
- `run-smoke-test.bat`: Chay Smoke Test (5 VUs).
- `run-load-test.bat`: Chay Load Test (10 VUs).
- `run-stress-test.bat`: Chay Stress Test (20 VUs).
- `run-all-tests.bat`: Tu dong chay lien tiep ca 3 kich ban va tong hop ket qua.

#### Cach 2: Su dung PowerShell Script (.ps1)
Mo PowerShell tai thu muc du an va chay:
```powershell
# Chay Smoke Test (5 VUs)
.\run-smoke-test.ps1

# Chay Load Test (10 VUs)
.\run-load-test.ps1

# Chay Stress Test (20 VUs)
.\run-stress-test.ps1

# Chay toan bo suite test
.\run-all-tests.ps1
```

#### Cach 3: Su dung npm scripts
```bash
# Chay toan bo test
npm test

# Chay tung kich ban rieng le
npm run test:smoke
npm run test:load
npm run test:stress
npm run test:full
```

### Buoc 3: Xem bao cao hieu nang truc quan
Sau khi chay xong moi kich ban, he thong tu dong sinh file bao cao HTML va JSON trong thu muc `reports/`.

De mo bao cao truc tiep tren trinh duyet:
```powershell
# Mo bao cao Smoke Test
Start-Process reports\smoke-test-report.html

# Mo bao cao Load Test
Start-Process reports\load-test-report.html

# Mo bao cao Stress Test
Start-Process reports\stress-test-report.html
```
Hoac su dung npm script:
```bash
npm run report:load
```

---

## 7. Dashboard bao cao hieu nang

Giao dien thong nhat cho toan bo project nam tai reports/index.html. Mo truc tiep bang trinh duyet, khong can web server hay ket noi Internet.

Dung lai giao dien tu JSON summary da co (khong chay lai k6):

    npm run report:build

Dung bao cao va mo dashboard tren Windows:

    npm run report

- Trang tong quan: so sanh P95 / RPS, tong request, muc VU ghi nhan, ty le loi va ket qua SLA cua 4 kich ban.
- Trang chi tiet: chi so chinh, phan bo response time, thong tin lan chay, bang SLA va functional checks.
- Tim kiem / loc functional checks theo ket qua; doi giao dien sang / toi; tai JSON goc va in / luu PDF qua hop tho in cua trinh duyet.
- Hien thi thich ung tren desktop, tablet va dien thoai; bang rong co the cuon ngang.
- P99 khong co trong summary se hien thi N/A, khong thay bang 0. VUs ghi nhan lay tu vus.max; VUs cap phat duoc trinh bay rieng.

Khi chay k6, handleSummary tu dong cap nhat trang chi tiet, JSON goc, reports/index.html va tap tin *-data.js tuong ung. Tai lai dashboard de xem du lieu moi. Giu cac file trong cung thu muc reports/ khi sao chep hoac chia se; tap tin du lieu giup dashboard chay ca khi mo bang file://.

report:build can Node.js 18 tro len va khong can cai npm dependencies. Lenh nay giu nguyen JSON summary; neu chua co metadata lan chay, bao cao ghi "Du lieu kiem thu da luu". Khi dung lai tu summary cua dich khac, dat bien moi truong BASE_URL cho dung dich kiem thu.

PASS/FAIL tong the phan anh thresholds do k6 danh gia. Functional checks duoc thong ke rieng. So lieu tren dashboard la summary cua cac lan chay doc lap, khong phai chuoi thoi gian hay ket qua mot bai chay dong thoi.

---

### Cap nhat giao dien phan tich

- Bo cuc gon hon, uu tien P95 / throughput / error rate; mau canh bao thay doi theo ty le loi.
- Bieu do co truc do, tooltip khi di chuot hoac focus bang ban phim; chon Avg, P90, P95, Max va RPS.
- Che do so sanh hai kich ban co bang doi chieu va chenh lech B so voi A. Muc tai va thoi gian nghi khac nhau nen khong xem chenh lech la danh gia o tai tuong duong.
- Functional checks duoc nhom theo Health / Login / Read / Create / Update / Delete. Nhom va dong co loi duoc dua len dau, co the mo / thu gon tung nhom hoac tat ca.
- Tim kiem va loc tu dong mo nhom phu hop; khi in, mo toan bo checks va khoi phuc trang thai xem sau khi in.

## 8. Huong dan dua du an len GitHub repository rieng

De dua du an nay len repository GitHub ca nhan, thuc hien cac lenh sau tu thu muc goc cua du an:

```bash
# 1. Khoi tao git repository cuc bo
git init

# 2. Them toan bo ma nguon va file vao staging
git add .

# 3. Tao commit dau tien
git commit -m "Khoi tao du an kiem thu hieu nang voi k6 cho Student Task Manager - SWT301"

# 4. Doi ten nhanh chinh thanh main
git branch -M main

# 5. Gan dia chi remote repository tren GitHub cua ban
# (Thay the URL bang link repo GitHub ca nhan cua ban)
git remote add origin https://github.com/<your-username>/student-task-manager-performance-testing.git

# 6. Day ma nguon len GitHub
git push -u origin main
```

---

## 9. Thong tin hoc phan

- Mon hoc: Kiem thu Phan mem (Software Testing - SWT301)
- Chu de: Performance Testing voi Grafana k6
- He thong kiem thu: Student Task Manager REST API
- Tieu chuan trinh bay: Khong su dung icon/emoji trang tri, tap trung vao so lieu ky thuat thuc te, ro rang, de bao ve truoc giang vien.
