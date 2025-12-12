(function(){
  const CHANNEL = "MOVERON_POC";
  let meta = {};

  function send(type, payload) {
    window.parent?.postMessage({ channel: CHANNEL, type, meta, payload }, "*");
  }

  window.mover = {
    init: function(m) {
      meta = m;
      send("READY", {});
    },
    track: function(eventType, data) {
      send("EVENT", { eventType, data });
    },
    complete: function(data) {
      send("COMPLETE", data);
    }
  };
})();
