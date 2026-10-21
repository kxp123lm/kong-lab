import {test} from 'node:test';
import assert from 'node:assert/strict';
import { ScoreJournal, memoryStorage } from '../src/lib/score-journal';
import { createPlayerInitializer } from '../src/lib/player-initializer';
test('an idle tab never erases another tab pending offline score',async()=>{
 const storage=memoryStorage();const a=new ScoreJournal(storage),b=new ScoreJournal(storage);
 a.push({token:'game-one',score:70,finished:false});
 await b.flush(async()=>false);
 assert.equal(new ScoreJournal(storage).items()[0].score,70);
});
test('old acknowledgement cannot erase a newer cross-tab score or finish event',()=>{
 const storage=memoryStorage();const a=new ScoreJournal(storage),b=new ScoreJournal(storage);
 a.push({token:'game-one',score:40,finished:false});const sent=b.items()[0];
 a.push({token:'game-one',score:90,finished:true});b.ack(sent);
 assert.equal(a.items()[0].score,90);assert.equal(a.items()[0].finished,true);
 b.ack({token:'game-one',score:90,finished:true});assert.equal(a.items().length,0);
 a.push({token:'game-two',score:0,finished:false});assert.equal(b.items().length,1);
});
test('concurrent initial player reads share one response before start',async()=>{
 let calls=0;let resolve!:(v:any)=>void;
 const init=createPlayerInitializer<{id:string}>(()=>{calls++;return new Promise(r=>resolve=r);});
 const first=init();const second=init();
 assert.equal(calls,1);resolve({id:'same-player'});
 assert.equal((await first).id,(await second).id);
});
