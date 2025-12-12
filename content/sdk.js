/**
 * Copyright 2025 POC HTML5 Content Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function () {
  const CHANNEL = "MOVERON_POC";
  const listeners = new Map();
  let meta = { contentId: "", contentVersion: "" };

  function emit(type, payload) {
    const arr = listeners.get(type) || [];
    arr.forEach(fn => {
      try { fn(payload); } catch (e) {}
    });
  }

  function send(type, payload) {
    window.parent?.postMessage({
      channel: CHANNEL,
      type,
      meta,
      payload,
      ts: Date.now()
    }, "*");
  }

  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (!msg || msg.channel !== CHANNEL) return;

    if (msg.type === "SESSION") emit("SESSION", msg.payload);
    if (msg.type === "RESUME_DATA") emit("RESUME_DATA", msg.payload);
  });

  window.mover = {
    init: (m) => {
      meta = { ...meta, ...m };
      send("READY", { userAgent: navigator.userAgent });
    },
    on: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    track: (eventType, data) => {
      send("EVENT", { eventType, data });
    },
    setLocation: (location) => {
      send("LOCATION", { location });
    },
    saveState: (state) => {
      send("STATE", { state });
    },
    requestResume: () => {
      send("RESUME_REQUEST", {});
    },
    suspend: ({ location, state }) => {
      send("SUSPEND", { location, state });
    },
    complete: ({ completion, success, scoreRaw, scoreMax, totalTimeMs }) => {
      send("COMPLETE", { completion, success, scoreRaw, scoreMax, totalTimeMs });
    }
  };
})();
