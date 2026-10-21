import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parse } from 'acorn';

test('bridge observes real bundled PlayerInfo score and gates restart to exactly one request', () => {
  const code = readFileSync(new URL('../public/cocos/src/project.js',import.meta.url),'utf8');
  const ast: any = parse(code, { ecmaVersion: 2020 });
  let factory: any;
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'Property' && node.key?.name === 'PlayerInfo') factory = node.value.elements[0];
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
  }
  walk(ast);
  assert.ok(factory);
  const output: any = {};
  const gameEvents: Record<string,Function> = {}; let pauses=0;
  const cc: any = { _RF: { push() {}, pop() {} }, game: { EVENT_SHOW:'show',on(name:string,fn:Function){gameEvents[name]=fn;},pause() {pauses++;}, resume() {} }, director: { on() {} }, Director: { EVENT_AFTER_SCENE_LAUNCH: 'launch' } };
  runInNewContext('(' + code.slice(factory.start,factory.end) + ')(null,{},output)',{ cc, output });
  const messages: any[] = [];
  let originalEnds = 0;
  class Manager { GameOver() { originalEnds++; } RestartGame() { throw new Error('ungated restart'); } }
  const listeners: Record<string, Function> = {};
  const win: any = { location: { origin: 'https://lab.test', hash: '#channel=abcdefghijklmnop12345678' },
    parent: { postMessage(m: any) { messages.push(m); } }, addEventListener(type: string, fn: Function) { listeners[type] = fn; } };
  runInNewContext(readFileSync(new URL('../public/cocos/kong-bridge.js',import.meta.url),'utf8'), { window:win, cc, URLSearchParams, Number, Object });
  win.KongBridge.install((name: string) => name === 'PlayerInfo' ? output : { default: Manager });
  output.default.score = 12;
  output.default.score += 9;
  assert.deepEqual(messages.filter(m=>m.type==='score').map(m=>m.score), [12,21]);
  const manager = new Manager();
  listeners.message({origin:'https://lab.test',source:win.parent,data:{source:'kong-parent',channel:'abcdefghijklmnop12345678',type:'pause'}});
  const oldPauses=pauses;
  assert.equal(typeof gameEvents.show,'function');
  gameEvents.show();
  assert.equal(pauses,oldPauses+1);
  manager.GameOver();
  assert.equal(messages.find(m=>m.type==='finished').score,21);
  assert.equal(originalEnds,1);
  manager.RestartGame(); manager.RestartGame();
  assert.equal(messages.filter(m=>m.type==='restart').length,1);
});
