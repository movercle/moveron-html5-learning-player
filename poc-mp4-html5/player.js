(() => {
  const logEl = document.getElementById("log");
  const video = document.getElementById("video");

  const btnPlay = document.getElementById("btnPlay");
  const btnPause = document.getElementById("btnPause");
  const btnMute = document.getElementById("btnMute");
  const btnFs = document.getElementById("btnFs");
  const seek = document.getElementById("seek");
  const rate = document.getElementById("rate");

  const curEl = document.getElementById("cur");
  const durEl = document.getElementById("dur");
  const ratioEl = document.getElementById("ratio");
  const watchedEl = document.getElementById("watched");

  const btnSuspend = document.getElementById("btnSuspend");
  const btnResume = document.getElementById("btnResume");
  const btnComplete = document.getElementById("btnComplete");

  const sessionBadge = document.getElementById("sessionBadge");
  const statusBadge = document.getElementById("statusBadge");

  const state = {
    position: 0,
    duration: 0,
    // 누적 시청(단순 추정): PLAYING 상태에서 시간 증가
    watchedSeconds: 0,
    lastTickAt: 0,
    sentProgressAt: 0
  };

  const fmt = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const log = (msg, obj) => {
    const line = obj ? `${msg} ${JSON.stringify(obj)}` : msg;
    logEl.textContent = `${new Date().toLocaleTimeString()} ${line}\n` + logEl.textContent;
  };

  // --- SDK init ---
  mover.init({ contentId: "mp4-poc-001", contentVersion: "1.0.0" });

  mover.on("SESSION", (p) => {
    sessionBadge.textContent = `session: ${p.sessionId}`;
    statusBadge.textContent = `status: RUNNING`;
  });

  mover.on("RESUME_DATA", (p) => {
    const pos = p?.state?.position;
    if (typeof pos === "number" && !Number.isNaN(pos)) {
      log("RESUME_DATA", { position: pos });
      // 메타데이터 로드 후 seek 가능한 경우가 많아서, loadedmetadata 후 적용
      const apply = () => {
        video.currentTime = Math.min(pos, video.duration || pos);
        state.position = video.currentTime;
        updateUI();
      };
      if (video.readyState >= 1) apply();
      else video.addEventListener("loadedmetadata", apply, { once: true });
    }
  });

  // --- video events ---
  video.addEventListener("loadedmetadata", () => {
    state.duration = video.duration || 0;
    durEl.textContent = fmt(state.duration);
    mover.track("VIDEO_READY", { duration: state.duration });
    log("VIDEO_READY", { duration: state.duration });
  });

  video.addEventListener("play", () => {
    state.lastTickAt = Date.now();
    mover.track("VIDEO_PLAY", { position: video.currentTime });
    log("VIDEO_PLAY", { position: Math.floor(video.currentTime) });
  });

  video.addEventListener("pause", () => {
    mover.track("VIDEO_PAUSE", { position: video.currentTime });
    log("VIDEO_PAUSE", { position: Math.floor(video.currentTime) });
  });

  video.addEventListener("ended", () => {
    mover.track("VIDEO_ENDED", { position: state.duration });
    log("VIDEO_ENDED");
  });

  video.addEventListener("timeupdate", () => {
    state.position = video.currentTime;
    updateUI();

    // 5초마다 progress 이벤트 전송
    const now = Math.floor(state.position);
    if (now - state.sentProgressAt >= 5) {
      const watchedRatio = state.duration ? (state.position / state.duration) : 0;
      mover.track("VIDEO_PROGRESS", {
        position: Math.floor(state.position),
        duration: Math.floor(state.duration),
        watchedRatio
      });
      state.sentProgressAt = now;
    }

    // 상태 저장(너무 자주 저장하지 않도록 3초 단위)
    if (now % 3 === 0) {
      mover.saveState({ position: state.position });
    }
  });

  // 누적 시청(PLAYING 동안만 증가) - 단순 추정
  setInterval(() => {
    if (!video.paused && !video.ended) {
      const now = Date.now();
      const delta = (now - (state.lastTickAt || now)) / 1000;
      state.lastTickAt = now;
      if (delta > 0 && delta < 2) state.watchedSeconds += delta;
      watchedEl.textContent = `${Math.floor(state.watchedSeconds)}s`;
    }
  }, 1000);

  // --- controls ---
  btnPlay.onclick = () => video.play();
  btnPause.onclick = () => video.pause();

  btnMute.onclick = () => {
    video.muted = !video.muted;
    btnMute.textContent = video.muted ? "음소거해제" : "음소거";
    mover.track(video.muted ? "VIDEO_MUTED" : "VIDEO_UNMUTED", {});
  };

  rate.onchange = () => {
    video.playbackRate = Number(rate.value);
    mover.track("VIDEO_RATE", { rate: video.playbackRate });
  };

  seek.addEventListener("input", () => {
    if (!state.duration) return;
    const ratio = Number(seek.value) / 1000;
    const target = ratio * state.duration;
    curEl.textContent = fmt(target);
  });

  seek.addEventListener("change", () => {
    if (!state.duration) return;
    const ratio = Number(seek.value) / 1000;
    const target = ratio * state.duration;
    video.currentTime = target;
    mover.track("VIDEO_SEEK", { position: Math.floor(target) });
  });

  btnFs.onclick = async () => {
    const shell = document.querySelector(".playerShell");
    try {
      if (!document.fullscreenElement) await shell.requestFullscreen();
      else await document.exitFullscreen();
    } catch (e) {
      log("FULLSCREEN_ERROR", { message: String(e) });
    }
  };

  // --- Resume / Complete ---
  btnSuspend.onclick = () => {
    mover.suspend({
      location: "video",
      state: { position: video.currentTime }
    });
    statusBadge.textContent = "status: SUSPENDED";
    alert(`중단 위치 저장: ${Math.floor(video.currentTime)}초`);
  };

  btnResume.onclick = () => mover.requestResume();

  btnComplete.onclick = () => {
    const ratio = state.duration ? (video.currentTime / state.duration) : 0;
    const completed = ratio >= 0.8; // 예: 80% 이상 시청

    mover.complete({
      completion: completed,
      success: completed,
      scoreRaw: completed ? 100 : 0,
      scoreMax: 100,
      totalTimeMs: Math.floor(state.watchedSeconds * 1000)
    });

    statusBadge.textContent = completed ? "status: COMPLETED" : "status: INCOMPLETE";
    alert(completed ? "완료 처리되었습니다." : "시청률(80%)이 부족합니다.");
  };

  function updateUI() {
    curEl.textContent = fmt(state.position);
    if (state.duration) {
      const ratio = Math.min(1, state.position / state.duration);
      seek.value = String(Math.floor(ratio * 1000));
      ratioEl.textContent = `${Math.round(ratio * 100)}%`;
    }
  }
})();
