/* KONG LAB integration. Original game and assets remain under Mulan PSL v2. */
(function () {
  'use strict';
  var channel = new URLSearchParams(window.location.hash.slice(1)).get('channel');
  var installed = false, restarting = false, ended = false, requestedPause = false;
  function send(type, score) {
    if (!channel || window.parent === window) return;
    window.parent.postMessage({ source:'kong-cocos', channel:channel, type:type, score:score }, window.location.origin);
  }
  window.KongBridge = { install:function (requireModule) {
    if (installed) return;
    installed = true;
    var player = requireModule('PlayerInfo').default;
    var value = player.score;
    Object.defineProperty(player,'score',{
      configurable:true, enumerable:true,
      get:function () { return value; },
      set:function (next) { value = next; if (Number.isSafeInteger(next) && next >= 0) send('score',next); }
    });
    var manager = requireModule('GameManager').default.prototype;
    var originalEnd = manager.GameOver;
    manager.GameOver = function () {
      if (!ended) { ended = true; send('finished',player.score); }
      return originalEnd.apply(this,arguments);
    };
    manager.RestartGame = function () {
      if (restarting) return;
      restarting = true;
      cc.game.pause();
      send('restart',player.score);
    };
    // Cocos' own EVENT_SHOW listener resumes the engine. Reapply the user's pause afterwards.
    cc.game.on(cc.game.EVENT_SHOW,function () { if (requestedPause || restarting) cc.game.pause(); });
    cc.director.on(cc.Director.EVENT_AFTER_SCENE_LAUNCH,function () {
      // Only third-party buttons. MainGameUi.adsButton is an original gameplay tool.
      var Failed = requireModule('FailedUi').default;
      var ui = Failed.Instance;
      if (ui) ['adsButton2','bannerButton','moreGameBtn'].forEach(function (key) { if (ui[key]) ui[key].active = false; });
      send('ready',player.score);
    });
    window.addEventListener('message',function (event) {
      if (event.origin !== window.location.origin || event.source !== window.parent || !event.data || event.data.channel !== channel || event.data.source !== 'kong-parent') return;
      if (event.data.type === 'pause') { requestedPause = true; cc.game.pause(); send('paused',player.score); }
      if (event.data.type === 'resume' && !ended && !restarting) { requestedPause = false; cc.game.resume(); }
    });
  }};
}());
