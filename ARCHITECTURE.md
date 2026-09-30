# ToeicQuest 架構說明

## 現階段

第一階段以低風險為原則，保持直接雙擊 `index.html` 即可使用，不導入建置工具或框架。

目前主要導覽已將「陣容」與「卡庫」拆成兩個獨立頁籤：陣容頁負責先發與替補配置，卡庫頁負責篩選、排序、圖鑑及卡片指派。

單字錯題資料儲存在 `state.toeic.wrongAnswers`，與其他遊戲進度一起保存於瀏覽器。每筆包含單字、詞性、翻譯、例句、答錯次數、最近錯誤時間及連續答對次數。

```text
ToeicQuest/
├─ index.html
├─ css/
│  └─ styles.css
├─ data/
│  └─ toeic1000.js
└─ js/
   ├─ app.js
   ├─ bootstrap.js
   └─ season-journey.js
```

`season-journey.js` 是目前第一個獨立出來的主要玩法模組。它在舊程式載入後接管賽季頁面，但仍沿用既有的陣容、Box Score、季後賽及存檔函式，以降低一次大改造成網站無法啟動的風險。

新版狀態主要放在：

- `state.seasonEnergy`：體力球數量與下一次自然恢復時間。
- `state.seasonJourney`：球隊名稱、當前場次、82 場賽程、戰績、Play-In 與球季歷史。
- 球員卡的 `badgeJourney`：徽章觸發次數、熟練度與已解鎖 Moment。
- 球員卡的 `achievementBacks`：六種榮譽卡背及目前展示卡背。

賽季模組也負責管理員快速模擬、一般玩家掛機流程，以及單字測驗滿分後的體力獎勵。掛機狀態只存在本次頁面工作階段；重新整理會安全停止，不會在背景繼續扣除體力。

球員的 `morale` 是上一場 Box Score 產生的暫時狀態，只能為 -1、0、+1。比賽計算會使用士氣後的有效 OVR，但不會寫回卡片永久 `ovr`；下一場結束後會重新計算。

## 下一階段建議

`js/app.js` 目前仍然很大。後續應一次只拆一項功能，並在每次拆分後測試：

```text
js/
├─ core/
│  ├─ state.js
│  ├─ storage.js
│  └─ utils.js
├─ ui/
│  ├─ modal.js
│  ├─ notification.js
│  ├─ navigation.js
│  └─ render.js
├─ features/
│  ├─ vocabulary.js
│  ├─ study-log.js
│  ├─ inventory.js
│  ├─ lineup.js
│  ├─ gacha.js
│  ├─ market.js
│  ├─ season.js
│  ├─ playoffs.js
│  ├─ quests.js
│  └─ three-point.js
├─ app.js
└─ bootstrap.js
```

建議順序是：通知介面、存檔工具、單字功能、學習紀錄、球員背包、陣容、抽卡、球季、季後賽。先維持傳統 `<script>` 載入順序，等所有功能都有測試後，再評估轉成 ES Modules。

## 修改原則

- HTML 只負責頁面結構。
- CSS 只負責外觀與動畫。
- `data` 只放靜態資料。
- 每個功能檔只處理一個領域。
- 共用狀態只能由明確的存檔與更新函式修改。
- 使用者輸入放進 HTML 前必須先轉義，避免內容破壞頁面。
