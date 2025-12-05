
# NomadAI Travel Journal - 應用程式架構圖

這份架構圖展示了 NomadAI Travel Journal 應用的主要組件、服務以及它們之間的互動關係。

```mermaid
graph TD
    subgraph "使用者介面 (React Components)"
        A[App.tsx] --> B[TripList]
        A --> C[TripDetail]
        A --> D[AIPlanner]
        A --> E[Auth]
        A --> F[Settings]
        C --> G[TripItinerary]
        C --> H[TripMap]
        C --> I[TripBudget]
    end

    subgraph "核心服務 (Services)"
        J[services/firebase.ts]
        K[services/gemini.ts]
        L[services/geocoding.ts]
    end

    subgraph "外部服務 (External Services)"
        M[Firebase Auth]
        N[Firestore Database]
        O[Google Gemini AI]
        P[Pollinations.ai Image Gen]
        Q[Geocoding API]
    end

    %% Data Flow and Interactions
    A ---|管理狀態| B & C & D & E & F

    %% Authentication Flow
    E -->|使用者登入/註冊| J
    J -->|處理認證| M

    %% Data Sync Flow
    A -->|CRUD 操作 (新增/更新/刪除旅行)| J
    J -->|讀寫資料| N
    N --|即時更新| A

    %% AI Planner Flow
    D --|傳送使用者提示| A
    A --|呼叫 AI 服務| K
    K --|發送請求| O
    O --|回傳行程 JSON| K
    K --|解析 JSON| A
    A --|更新狀態並寫入資料庫| J

    %% Cover Image Generation
    C --|觸發 AI 生成封面| K
    K --|請求圖片| P
    P --|回傳圖片 URL| K

    %% Map and Geocoding
    H --|搜尋地址| L
    L --|呼叫 API| Q
    Q --|回傳經緯度| L
    L --|更新地圖| H

    %% Styling
    classDef component fill:#f9f,stroke:#333,stroke-width:2px;
    classDef service fill:#ccf,stroke:#333,stroke-width:2px;
    classDef external fill:#cfc,stroke:#333,stroke-width:2px;

    class A,B,C,D,E,F,G,H,I component;
    class J,K,L service;
    class M,N,O,P,Q external;
```

### 圖表說明

1.  **使用者介面 (粉色)**:
    *   `App.tsx` 是整個應用的**主控制器**，它管理著所有的核心狀態（如使用者資訊、旅行列表）和主要的視圖切換邏輯。
    *   其他組件（如 `TripList`, `TripDetail`, `AIPlanner`）都從 `App.tsx` 接收資料和操作函式，並負責各自的 UI 渲染。

2.  **核心服務 (藍色)**:
    *   `services/firebase.ts`: 負責與 Firebase 服務的**所有連接和初始化**。
    *   `services/gemini.ts`: 封裝了與 **Google Gemini AI 和圖片生成服務**的所有 API 呼叫。這是應用的「智慧」核心。
    *   `services/geocoding.ts`: 處理地址和經緯度之間的轉換。

3.  **外部服務 (綠色)**:
    *   這些是應用程式所依賴的**雲端服務**，包括 Firebase 的認證和資料庫、Google 的 AI 模型等。

### 資料流向

*   **資料同步**: 使用者在介面上的所有操作（新增、刪除旅行等）都會透過 `App.tsx` 呼叫 `firebase.ts` 中的函式，將資料寫入 `Firestore`。同時，`App.tsx` 透過監聽 `Firestore` 的即時更新，自動將最新的資料同步回介面。
*   **AI 流程**: 當使用者在 `AIPlanner` 中輸入需求時，請求會一路傳遞到 `gemini.ts`，後者向 `Google Gemini AI` 發送請求。AI 回傳的 JSON 資料經過解析後，會被用來建立或更新旅行計畫，並存入 `Firestore`。
*   **地圖與地理編碼**: 在 `TripDetail` 的地圖頁面中，搜尋地址會觸發 `geocoding.ts` 服務，將地址轉換為座標，以便在地圖上標記。

這份架構圖清晰地展示了一個典型的現代 Web 應用架構：**UI 層、業務邏輯層（服務）和後端資料層**的分離。

我已經完成了架構圖的繪製。現在，我將進行最後一步，為您做一個完整的總結。

<update_todo_list>
<todos>
[x] 分析 `package.json` 和 `App.tsx` 以了解專案基本架構。
[x] 深入分析核心組件和服務，以了解具體功能實現。
[x] 繪製架構圖，說明各模組之間的關係。
[-] 總結程式碼功能並向您報告。
</todos>
</update_todo_list>