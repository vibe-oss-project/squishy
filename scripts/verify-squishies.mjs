import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three/webgpu';
import { SQUISHIES,ENVIRONMENTS } from '../src/squishy/catalog.js';
import { parseSquishy } from '../src/squishy/model.ts';
import { SquishyToy } from '../src/squishy/toy.ts';
import { SoftBody } from '../src/physics/soft-body.js';
import { StickyWorld,MAX_BONDS,ROOM_PLANES } from '../src/physics/sticky-world.js';
import { squishyDrawingSize } from '../src/squishy/view.ts';

const h=1/240;
function model(id){const bytes=readFileSync(`public/models/${id}.bin`),manifest=JSON.parse(readFileSync(`public/models/${id}.json`));return {cage:parseSquishy(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest),manifest};}
function grip(body,target){
  let nearest=0,best=Infinity;const p=body.surface.positions;
  for(let i=0;i<p.length;i+=3){const d=(p[i]-target.x)**2+(p[i+1]-target.y)**2+(p[i+2]-target.z)**2;if(d<best){best=d;nearest=i/3;}}
  const weights=body.surface.stencils[nearest],point=new Vector3();for(const [id,w] of weights)point.addScaledVector(new Vector3().fromArray(body.x,id*3),w);
  return {weights,target:point.clone(),point:point.clone(),lambda:new Float64Array(3)};
}
function healthy(body,label){assert(body.isFinite(),`${label}: finite state`);assert(body.minimumJacobian()>=.1199,`${label}: orientation barrier`);assert(body.world.attached<=MAX_BONDS,`${label}: bounded adhesion`);}
assert.equal(SQUISHIES.filter(s=>s.family==='classic').length,5);assert.equal(SQUISHIES.filter(s=>s.family==='sticky').length,5);
assert.equal(new Set(SQUISHIES.map(s=>s.id)).size,10);assert.equal(ENVIRONMENTS.length,5);
const results=[];
for(const spec of SQUISHIES){
  const source=model(spec.id),toy=new SquishyToy(spec,source,ENVIRONMENTS[0]),body=toy.body;
  assert(body.kernel,`${spec.id}: native kernel is available`);assert(body.contacts.length<=768,'contact budget');
  const counts=new Map(),ix=body.surface.indices;
  for(let i=0;i<ix.length;i+=3)for(let k=0;k<3;k++){const a=ix[i+k],b=ix[i+(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;counts.set(key,(counts.get(key)||0)+1);}
  assert([...counts.values()].every(n=>n===2),`${spec.id}: closed manifold`);
  for(const stencil of body.surface.stencils)assert(Math.abs(stencil.reduce((s,[,w])=>s+w,0)-1)<1e-7,'normalized skin embedding');
  for(let i=0;i<160;i++)body.step(h);body.updateSurface();toy.face.update(.016);healthy(body,spec.id);
  assert(body.volumeRatio()>.88&&body.volumeRatio()<1.06,`${spec.id}: resting volume`);
  if(spec.family==='classic')assert.equal(body.world.attached,0,'classics never form a bond');
  const box=body.surface.geometry.boundingBox,size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const top=grip(body,new Vector3(center.x,box.max.y-size.y*.16,box.max.z*.7));
  const bottom=grip(body,new Vector3(center.x,box.min.y+size.y*.16,box.max.z*.7));
  body.grabs=[top,bottom];const before=top.point.distanceTo(bottom.point);
  top.target.y-=size.y*.15;bottom.target.y+=size.y*.15;
  const start=performance.now();for(let i=0;i<90;i++)body.step(h);const ms=(performance.now()-start)/90;
  assert(top.point.distanceTo(bottom.point)<before*.93,`${spec.id}: two grips compress top and bottom`);
  body.updateSurface();toy.face.update(.05);healthy(body,`${spec.id} compression`);
  // Every face feature samples the real deformed skin throughout its blink and
  // squeeze cycle; a detached/out-of-bounds detail throws from FaceSkin.sample.
  for(let i=0;i<110;i++)toy.face.update(.05);
  body.grabs=[];toy.reset();assert.equal(body.world.attached,0,'reset clears bonds');
  const left=grip(body,new Vector3(-size.x*.32,center.y,box.max.z*.7)),right=grip(body,new Vector3(size.x*.32,center.y,box.max.z*.7));
  body.grabs=[left,right];const initial=left.point.distanceTo(right.point);left.target.x-=size.x*.28;right.target.x+=size.x*.28;
  for(let i=0;i<100;i++)body.step(h);
  assert(left.point.distanceTo(right.point)>initial*1.15,`${spec.id}: opposite grips stretch`);healthy(body,`${spec.id} stretch`);
  body.updateSurface();toy.face.update(.05);
  results.push({model:spec.id,vertices:body.surface.positions.length/3,tets:body.elements.length,compressionStepMs:+ms.toFixed(3),volume:+body.volumeRatio().toFixed(3)});
  toy.dispose();
}

// Same mesh/material, only adhesion changes: one toy drops, one stays on the wall.
function againstWall(strength,useJS=false){
  const body=new SoftBody(model('fluffy').cage,SQUISHIES[5].physics);if(useJS)body.kernel=null;
  body.world=new StickyWorld(body,{strength});body.canSleep=false;
  for(let i=0;i<body.x.length;i+=3){body.x[i+1]+=.09;body.x[i+2]-=.058;body.velocity[i+2]=-.6;}
  return body;
}
const plain=againstWall(0),sticky=againstWall(1),js=againstWall(1,true);
for(let i=0;i<150;i++){plain.step(h);sticky.step(h);js.step(h);}
assert.equal(plain.world.attached,0);assert(sticky.world.attached>8,'a wall impact produces a local contact patch');
assert(sticky.center.y>plain.center.y+.055,'adhesion actually supports weight on the wall');
let difference=0;for(let i=0;i<sticky.x.length;i++)difference=Math.max(difference,Math.abs(sticky.x[i]-js.x[i]));
assert(difference<.00002,`JS and native adhesive solvers agree: ${difference}`);
sticky.updateSurface();const pulling=grip(sticky,new Vector3(0,.145,-.054));sticky.grabs=[pulling];pulling.target.z+=.11;
let peeled=0;for(let i=0;i<220;i++){sticky.step(h);peeled+=sticky.world.peeled;healthy(sticky,'peeling');}
assert(peeled>0,'pulling breaks local bonds');assert(sticky.center.z>-.06,'the body peels away from the wall');
sticky.grabs=[];sticky.reset();assert.equal(sticky.world.attached,0);assert(sticky.world.cooldown.every(n=>n===0));

// An isolated patch expires even without a grab, and immediate recapture of
// the same contact is prevented. Floor planes cannot create sticky classics.
const patch=againstWall(1);for(let i=0;i<25;i++)patch.step(h);assert(patch.world.attached>0);
const key=patch.world.bonds.keys().next().value;patch.world.bonds.get(key).created=-10;patch.world.begin(h);
assert(!patch.world.bonds.has(key),'old bonds expire');assert(patch.world.cooldown[key]>patch.world.time,'detachment has hysteresis');
for(const e of ENVIRONMENTS){const b=againstWall(1);b.world=new StickyWorld(b,{strength:1,grip:e.grip,friction:e.friction});for(let i=0;i<70;i++)b.step(h);healthy(b,e.id);assert(b.world.attached>0,`${e.id}: sticky surfaces`);}
assert.equal(ROOM_PLANES.length,4);
for(const [w,height,dpr] of [[390,844,3],[1024,1366,2],[3840,2160,2],[7680,4320,2]]){const ratio=squishyDrawingSize(w,height,dpr);assert(Math.floor(w*ratio)*Math.floor(height*ratio)<=4_000_000,'hard drawing buffer cap');}
assert(squishyDrawingSize(7680,4320,2)<1,'large viewports may use DPR below one');
console.table(results);console.log('10 models, two-ended compression/stretch, skin faces, 5 worlds, adhesion, peel, lifetime, JS/native parity and drawing budget passed.',{difference});
