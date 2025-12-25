# 日文複習測驗（GitHub + Vercel + Render + Google Sheets）

此專案分成兩個資料夾：
- `api/`：Express API（部署到 Render）
- `web/`：Next.js 前端（部署到 Vercel）

## 功能
- 登入：本名 + 學號（此組資料會對應到同一份進度/錯題）
- 題庫：讀取你提供的 Google Sheet（A~E欄）
- 出題規則：每次 25 題（每題 4 分），**不會出現已做過的題目**，直到你按「進度重置」
- 作答反饋：對=綠底 / 錯=紅底 + 顯示正確答案(平假名) + 中文 + 單字原貌(第5欄)
- 錯題庫：錯的題目自動進入錯題庫；答對後會標記為已解決（PDF 只匯出未解決錯題）
- 助詞藍字：挖空題句子用 kuromoji 斷詞，pos=助詞 會套藍色
- PDF：可匯出錯題表（若要確保日文/中文不亂碼，請設定 CJK 字型，見 `api/README.md`）

## Google Sheet 結構
- A: 平假名答案
- B: 答案中文
- C: 例句挖空（題目）
- D: 例句中文（題目一起顯示）
- E: 單字原貌（顯示於答案區）

> 你提到「同一個答案有多題，但 A 欄只寫一次」：API 會把 A/B/E 以 **向下延用** 的方式補齊。
> 你提到「只有 A/B/E」：會視為「單字題」，題目= B，答案= A。

## 你需要做的事（部署流程簡版）
1) 建立 Google Cloud Service Account + 開啟 Sheets API
2) 把題庫 Spreadsheet 分享給 service account 的 `client_email`（編輯權限）
3) Deploy `api/` 到 Render，設定環境變數
4) Deploy `web/` 到 Vercel，設定 `NEXT_PUBLIC_API_BASE`

## Render 睡眠（Keep Alive）
我在回覆裡提供兩個免付費方案：
- Google Apps Script 每 10 分鐘 ping `/health`
- GitHub Actions schedule ping

