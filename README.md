# POC HTML5 Content

LMS(Learning Management System) 통합을 위한 HTML5 기반 인터랙티브 학습 콘텐츠 POC 프로젝트입니다.

## 📋 프로젝트 개요

이 프로젝트는 PostMessage API를 사용하여 학습 콘텐츠와 LMS 플레이어 간의 양방향 통신을 구현한 개념 증명(Proof of Concept)입니다. SCORM과 유사한 방식으로 학습 진행 상태, 이벤트 추적, Resume 기능 등을 제공합니다.

## ✨ 주요 기능

- **📖 멀티 페이지 학습** - 여러 씬(Scene)으로 구성된 학습 콘텐츠
- **💾 이어보기(Resume)** - 학습 진행 상태 저장 및 복원
- **🎥 비디오 학습** - MP4/YouTube 비디오 진행률 추적
- **📄 PDF 학습** - PDF 페이지 단위 렌더링 및 진도 추적
- **📝 퀴즈/평가** - 인터랙티브 평가 및 점수 추적
- **📊 학습 분석** - 실시간 이벤트 추적 및 로깅
- **✅ 완료 기준** - 자동 완료 판정 시스템
- **🔄 PostMessage 통신** - iframe 기반 안전한 양방향 통신

## 🏗️ 프로젝트 구조

```
poc-html5-content/
├── index.html                    # 프로젝트 소개 페이지
├── player/
│   └── player.html              # LMS 플레이어 시뮬레이터
├── content/                     # 기본 학습 콘텐츠
│   ├── index.html              # 멀티 씬 학습 콘텐츠
│   ├── sdk.js                  # PostMessage SDK
│   ├── style.css               # 스타일시트
│   └── manifest.json           # 콘텐츠 메타데이터
├── poc-mp4-html5/              # MP4 비디오 학습 POC
│   ├── index.html
│   ├── player.js
│   ├── sdk.js
│   └── style.css
├── poc-youtube-html5/          # YouTube 비디오 학습 POC
│   ├── index.html
│   ├── sdk.js
│   └── style.css
├── poc-pdf-html5/              # PDF 학습 POC
│   ├── index.html
│   ├── pdf.js
│   ├── sdk.js
│   ├── style.css
│   └── sample_pdf.pdf
└── moveron_html5_sample/       # 간단한 샘플 콘텐츠
    ├── index.html
    ├── sdk.js
    ├── style.css
    └── manifest.json
```

## 🚀 시작하기

### 1. 프로젝트 실행

브라우저에서 `index.html` 파일을 열거나, 로컬 웹 서버를 실행합니다:

```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server -p 8000
```

### 2. 플레이어 접속

브라우저에서 다음 URL로 접속:
- 프로젝트 소개: `http://localhost:8000/index.html`
- LMS 플레이어: `http://localhost:8000/player/player.html`

### 3. 샘플 콘텐츠 선택

플레이어 상단의 네비게이션 바에서 다양한 샘플 콘텐츠를 선택할 수 있습니다:
- **기본 콘텐츠** - 멀티 씬 학습 (소개 → 비디오 → 퀴즈)
- **MoverOn 샘플** - 간단한 이벤트 추적 샘플
- **POC MP4** - MP4 비디오 학습 및 진행률 추적
- **POC YouTube** - YouTube 비디오 임베드 학습
- **POC PDF** - PDF 페이지 단위 학습

## 📡 SDK API 문서

### 초기화

```javascript
mover.init({
  contentId: "your-content-id",
  contentVersion: "1.0.0"
});
```

### 이벤트 수신

```javascript
// 세션 정보 수신
mover.on("SESSION", (payload) => {
  console.log("Session ID:", payload.sessionId);
});

// Resume 데이터 수신
mover.on("RESUME_DATA", (payload) => {
  const { location, state } = payload;
  // 저장된 위치와 상태로 복원
});
```

### 이벤트 전송

```javascript
// 일반 이벤트 추적
mover.track("VIEW", { page: 1 });
mover.track("ANSWER", { 
  itemId: "q1", 
  response: "서울", 
  correct: true 
});

// 위치 저장 (북마크)
mover.setLocation("scene-2");

// 상태 저장
mover.saveState({ 
  currentPage: 2, 
  score: 100 
});
```

### Resume 기능

```javascript
// Resume 요청
mover.requestResume();

// 중단 및 저장
mover.suspend({
  location: "page-5",
  state: { progress: 50, answers: [...] }
});
```

### 완료 처리

```javascript
mover.complete({
  completion: true,      // 완료 여부
  success: true,         // 성공 여부
  scoreRaw: 85,         // 획득 점수
  scoreMax: 100,        // 만점
  totalTimeMs: 120000   // 총 학습 시간 (밀리초)
});
```

## 🔄 통신 프로토콜

### 메시지 구조

모든 메시지는 다음 구조를 따릅니다:

```javascript
{
  channel: "MOVERON_POC",  // 채널 식별자
  type: "EVENT",           // 메시지 타입
  meta: {                  // 콘텐츠 메타데이터
    contentId: "...",
    contentVersion: "..."
  },
  payload: { ... },        // 실제 데이터
  ts: 1234567890           // 타임스탬프
}
```

### 메시지 타입

#### 콘텐츠 → 플레이어

| 타입 | 설명 | Payload |
|------|------|---------|
| `READY` | 콘텐츠 로드 완료 | `{ userAgent }` |
| `EVENT` | 학습 이벤트 | `{ eventType, data }` |
| `LOCATION` | 위치 변경 | `{ location }` |
| `STATE` | 상태 저장 | `{ state }` |
| `SUSPEND` | 중단 및 저장 | `{ location, state }` |
| `RESUME_REQUEST` | Resume 요청 | `{}` |
| `COMPLETE` | 완료 처리 | `{ completion, success, scoreRaw, scoreMax, totalTimeMs }` |

#### 플레이어 → 콘텐츠

| 타입 | 설명 | Payload |
|------|------|---------|
| `SESSION` | 세션 정보 전달 | `{ sessionId }` |
| `RESUME_DATA` | Resume 데이터 전달 | `{ location, state }` |

## 📊 샘플 콘텐츠 상세

### 1. 기본 콘텐츠 (content/)

3개의 씬으로 구성된 멀티 페이지 학습 콘텐츠:

- **씬 1: 소개** - 텍스트 입력 및 메모 기능
- **씬 2: 비디오** - 모의 비디오 플레이어 (진행률 추적)
- **씬 3: 퀴즈** - 객관식 퀴즈 및 점수 처리

**완료 기준:**
- 모든 페이지 방문
- 퀴즈 정답
- 총 학습 시간 30초 이상

### 2. POC MP4 (poc-mp4-html5/)

HTML5 `<video>` 태그를 사용한 MP4 비디오 학습:

**기능:**
- 재생/일시정지/탐색
- 재생 속도 조절 (0.5x ~ 2.0x)
- 진행률 추적 (실제 시청 시간)
- Resume 기능 (마지막 재생 위치 복원)

**완료 기준:**
- 80% 이상 시청

### 3. POC YouTube (poc-youtube-html5/)

YouTube iframe API를 사용한 비디오 학습:

**기능:**
- YouTube 플레이어 임베드
- 재생 이벤트 추적
- 진행률 추적
- Resume 기능

**완료 기준:**
- 80% 이상 시청

### 4. POC PDF (poc-pdf-html5/)

PDF.js를 사용한 PDF 문서 학습:

**기능:**
- 페이지 단위 렌더링
- 페이지 네비게이션 (이전/다음)
- 줌 인/아웃 (60% ~ 250%)
- 페이지별 체류 시간 추적
- 방문 페이지 진도율 계산
- Resume 기능 (페이지, 줌, 스크롤 위치 복원)

**완료 기준:**
- 80% 이상 페이지 방문
- 총 학습 시간 30초 이상

**사용 라이브러리:**
- PDF.js v3.11.174 (CDN)

### 5. MoverOn 샘플 (moveron_html5_sample/)

최소한의 기능을 가진 간단한 샘플:

**기능:**
- 기본 이벤트 전송 (VIEW, ANSWER, SCORE)
- 완료 처리

## 🛠️ 개발 가이드

### 새로운 콘텐츠 만들기

1. **폴더 생성**
   ```bash
   mkdir my-content
   cd my-content
   ```

2. **SDK 복사**
   ```bash
   cp ../content/sdk.js ./
   ```

3. **HTML 작성**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>My Content</title>
   </head>
   <body>
     <h1>My Learning Content</h1>

     <script src="./sdk.js"></script>
     <script>
       // SDK 초기화
       mover.init({
         contentId: "my-content-001",
         contentVersion: "1.0.0"
       });

       // 세션 수신
       mover.on("SESSION", (payload) => {
         console.log("Session:", payload.sessionId);
       });

       // 이벤트 전송
       mover.track("VIEW", { page: 1 });
     </script>
   </body>
   </html>
   ```

4. **manifest.json 작성**
   ```json
   {
     "contentId": "my-content-001",
     "version": "1.0.0",
     "type": "HTML5",
     "entry": "index.html",
     "supports": ["POST_MESSAGE_SDK", "RESUME", "SCORE", "COMPLETE"]
   }
   ```

5. **플레이어에 등록**

   `player/player.html`의 네비게이션 바에 버튼 추가:
   ```html
   <button class="content-btn" data-src="../my-content/index.html">My Content</button>
   ```

### 디버깅

브라우저 개발자 도구(F12)를 열어 다음을 확인할 수 있습니다:

- **콘솔**: PostMessage 통신 로그
- **플레이어 로그**: 우측 패널에 실시간 이벤트 표시
- **네트워크**: API 호출 (실제 구현 시)

## 🔒 보안 고려사항

### PostMessage 보안

현재 POC에서는 `targetOrigin: "*"`를 사용하지만, 프로덕션 환경에서는 반드시 명시적인 origin을 지정해야 합니다:

```javascript
// ❌ 개발/POC용 (보안 취약)
window.parent.postMessage(msg, "*");

// ✅ 프로덕션용 (안전)
window.parent.postMessage(msg, "https://lms.example.com");
```

### 메시지 검증

수신한 메시지는 항상 검증해야 합니다:

```javascript
window.addEventListener("message", (e) => {
  // Origin 검증
  if (e.origin !== "https://trusted-lms.com") return;

  // 채널 검증
  if (e.data?.channel !== "MOVERON_POC") return;

  // 데이터 처리
  handleMessage(e.data);
});
```

## 📈 확장 가능성

### 실제 LMS 통합

플레이어의 `trackingApi` 함수를 실제 API 호출로 교체:

```javascript
async function trackingApi(type, payload) {
  const response = await fetch("/api/learning/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ type, ...payload })
  });
  return response.json();
}
```

### 데이터베이스 연동

Resume 데이터를 서버에 저장:

```javascript
// 저장
await fetch("/api/learning/resume", {
  method: "POST",
  body: JSON.stringify({
    sessionId,
    location,
    state
  })
});

// 불러오기
const resume = await fetch(`/api/learning/resume/${sessionId}`)
  .then(r => r.json());
```

## 🧪 테스트

### 수동 테스트 시나리오

1. **Resume 기능 테스트**
   - 콘텐츠 중간까지 진행
   - "중단(Resume 저장)" 버튼 클릭
   - 페이지 새로고침
   - "Resume 불러오기" 버튼 클릭
   - 저장된 위치로 복원되는지 확인

2. **완료 기준 테스트**
   - 완료 기준을 충족하지 않은 상태에서 "완료 처리" 클릭
   - 미완료 메시지 확인
   - 완료 기준 충족 후 다시 시도
   - 완료 처리 확인

3. **이벤트 추적 테스트**
   - 개발자 도구 콘솔 열기
   - 콘텐츠 내 다양한 액션 수행
   - 플레이어 로그에 이벤트가 기록되는지 확인

## 📝 라이선스

이 프로젝트는 Apache License 2.0 하에 배포됩니다.

```
Copyright 2025 POC HTML5 Content Project

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🤝 기여

이슈 및 개선 제안은 환영합니다!

기여하실 때는 다음 사항을 준수해 주세요:
- Apache License 2.0 조건을 따릅니다
- 코드 스타일 가이드를 준수합니다
- 의미있는 커밋 메시지를 작성합니다

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록하거나 아래 연락처로 문의해 주세요.

**회사명:** MoverOn Co., Ltd.
**홈페이지:** [https://www.moveron.co.kr/](https://www.moveron.co.kr/)
**연락처:** [contact@moveron.co.kr](mailto:contact@moveron.co.kr)

---

**Developed by MoverOn Co., Ltd. - Innovating Learning Experience**

Licensed under Apache License 2.0 | © 2025 MoverOn Co., Ltd.

