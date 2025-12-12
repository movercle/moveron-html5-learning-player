(() => {
  const logEl = document.getElementById("log");
  const sessionBadge = document.getElementById("sessionBadge");
  const statusBadge = document.getElementById("statusBadge");

  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnSuspend = document.getElementById("btnSuspend");
  const btnResume = document.getElementById("btnResume");
  const btnComplete = document.getElementById("btnComplete");

  const pageNowEl = document.getElementById("pageNow");
  const pageTotalEl = document.getElementById("pageTotal");
  const zoomLabelEl = document.getElementById("zoomLabel");

  const progressEl = document.getElementById("progress");
  const totalTimeEl = document.getElementById("totalTime");
  const pageTimeEl = document.getElementById("pageTime");

  const viewer = document.getElementById("viewer");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const PDF_URL = window.PDF_URL;

  const state = {
    pdf: null,
    page: 1,
    total: 0,
    scale: 1.0,
    // 학습 시간
    totalSec: 0,
    pageSec: 0,
    timer: null,
    // 진도(방문 페이지)
    visited: new Set(),
    // Resume
    scrollTop: 0,
    lastProgressSentAt: 0
  };

  function log(msg, obj) {
    const line = obj ? `${msg} ${JSON.stringify(obj)}` : msg;
    logEl.textContent = `${new Date().toLocaleTimeString()} ${line}\n` + logEl.textContent;
  }

  function setZoomLabel() {
    zoomLabelEl.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function updateProgressUI() {
    const visitedCount = state.visited.size;
    const pct = state.total ? Math.round((visitedCount / state.total) * 100) : 0;
    progressEl.textContent = `${pct}%`;
    totalTimeEl.textContent = `${state.totalSec}s`;
    pageTimeEl.textContent = `${state.pageSec}s`;
  }

  function startTimer() {
    if (state.timer) return;
    state.timer = setInterval(() => {
      state.totalSec += 1;
      state.pageSec += 1;
      updateProgressUI();

      // 10초마다 진행 이벤트 전송(과도한 트래픽 방지)
      if (state.totalSec - state.lastProgressSentAt >= 10) {
        sendProgress();
        state.lastProgressSentAt = state.totalSec;
      }
    }, 1000);
  }

  function resetPageTimer() {
    state.pageSec = 0;
  }

  function markVisit(page) {
    state.visited.add(page);
    mover.track("PDF_PAGE_VIEW", { page, total: state.total });
  }

  function sendProgress() {
    const visitedCount = state.visited.size;
    const visitedRatio = state.total ? (visitedCount / state.total) : 0;
    mover.track("PROGRESS", {
      page: state.page,
      total: state.total,
      visitedCount,
      visitedRatio,
      totalSec: state.totalSec,
      pageSec: state.pageSec
    });

    // 상태 저장(Resume)
    mover.saveState({
      page: state.page,
      scale: state.scale,
      scrollTop: viewer.scrollTop,
      visited: Array.from(state.visited),
      totalSec: state.totalSec
    });
  }

  async function renderPage(page) {
    if (!state.pdf) return;
    state.page = Math.max(1, Math.min(page, state.total));

    resetPageTimer();
    pageNowEl.textContent = String(state.page);

    const pdfPage = await state.pdf.getPage(state.page);
    const viewport = pdfPage.getViewport({ scale: state.scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await pdfPage.render({ canvasContext: ctx, viewport }).promise;

    // 방문 처리 + UI
    markVisit(state.page);
    updateProgressUI();

    // 페이지 이동 이벤트
    mover.track("PDF_PAGE_CHANGE", { page: state.page, total: state.total, scale: state.scale });
  }

  async function loadPdf() {
    log("PDF_LOAD_START", { url: PDF_URL });

    try {
      const loadingTask = window.pdfjsLib.getDocument(PDF_URL);
      state.pdf = await loadingTask.promise;
      state.total = state.pdf.numPages;

      pageTotalEl.textContent = String(state.total);
      setZoomLabel();

      mover.track("PDF_READY", { total: state.total });
      log("PDF_READY", { total: state.total });

      await renderPage(1);
      startTimer();
    } catch (err) {
      console.error("PDF Load Error:", err);
      log("PDF_LOAD_ERROR_DETAIL", { error: err.message, stack: err.stack });
      throw err;
    }
  }

  // --- SDK init ---
  mover.init({ contentId: "pdf-poc-001", contentVersion: "1.0.0" });

  mover.on("SESSION", (p) => {
    sessionBadge.textContent = `session: ${p.sessionId}`;
    statusBadge.textContent = `status: RUNNING`;
  });

  mover.on("RESUME_DATA", async (p) => {
    const s = p?.state;
    if (!s) return;

    log("RESUME_DATA", { page: s.page, scale: s.scale, scrollTop: s.scrollTop });

    if (typeof s.scale === "number") state.scale = s.scale;
    if (typeof s.totalSec === "number") state.totalSec = s.totalSec;

    if (Array.isArray(s.visited)) {
      state.visited = new Set(s.visited.map(Number).filter(n => Number.isFinite(n)));
    }

    // PDF가 아직 로드 전이면 로드 후 이동
    if (!state.pdf) await loadPdf();

    if (typeof s.page === "number") await renderPage(s.page);
    if (typeof s.scrollTop === "number") {
      // 렌더링 후 적용
      setTimeout(() => viewer.scrollTop = s.scrollTop, 50);
    }
  });

  // --- Controls ---
  btnPrev.onclick = () => renderPage(state.page - 1);
  btnNext.onclick = () => renderPage(state.page + 1);

  btnZoomIn.onclick = async () => {
    state.scale = Math.min(2.5, Math.round((state.scale + 0.1) * 10) / 10);
    setZoomLabel();
    await renderPage(state.page);
  };

  btnZoomOut.onclick = async () => {
    state.scale = Math.max(0.6, Math.round((state.scale - 0.1) * 10) / 10);
    setZoomLabel();
    await renderPage(state.page);
  };

  // 스크롤 변경 시(자주 저장하면 과도하니, 1초 디바운스)
  let scrollDebounce = null;
  viewer.addEventListener("scroll", () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      mover.track("PDF_SCROLL", { page: state.page, scrollTop: viewer.scrollTop });
      mover.saveState({
        page: state.page,
        scale: state.scale,
        scrollTop: viewer.scrollTop,
        visited: Array.from(state.visited),
        totalSec: state.totalSec
      });
    }, 1000);
  });

  btnSuspend.onclick = () => {
    mover.suspend({
      location: `page-${state.page}`,
      state: {
        page: state.page,
        scale: state.scale,
        scrollTop: viewer.scrollTop,
        visited: Array.from(state.visited),
        totalSec: state.totalSec
      }
    });
    statusBadge.textContent = "status: SUSPENDED";
    alert(`중단 저장: page=${state.page}`);
  };

  btnResume.onclick = () => mover.requestResume();

  // 완료 기준 예시: 방문 페이지 비율 80% + 총 학습 30초
  btnComplete.onclick = () => {
    const visitedRatio = state.total ? (state.visited.size / state.total) : 0;
    const completed = (visitedRatio >= 0.8) && (state.totalSec >= 30);

    mover.complete({
      completion: completed,
      success: completed,
      scoreRaw: completed ? 100 : 0,
      scoreMax: 100,
      totalTimeMs: state.totalSec * 1000,
      detail: { visitedRatio, visitedCount: state.visited.size, totalPages: state.total }
    });

    statusBadge.textContent = completed ? "status: COMPLETED" : "status: INCOMPLETE";
    alert(completed ? "완료 처리되었습니다." : "완료 기준 미달(페이지 80% + 30초)");
  };

  // 시작
  loadPdf().catch(err => {
    log("PDF_LOAD_ERROR", { message: String(err) });
    statusBadge.textContent = "status: ERROR";
    alert("PDF 로드 실패: CORS/혼합콘텐츠/URL 접근 여부를 확인해 주세요.");
  });
})();
