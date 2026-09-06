import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera,Vector3 } from 'three/webgpu';
import { SQUISHIES,ENVIRONMENTS } from '../src/squishy/catalog.js';
import { parseSquishy } from '../src/squishy/model.ts';
import { SquishyToy } from '../src/squishy/toy.ts';
import { SquishyGestures } from '../src/squishy/gestures.ts';
import { ToyMotion } from '../src/squishy/interaction.ts';
import { Input } from '../src/game/input.ts';
import { homeView } from '../src/squishy/view.ts';

const document=new globalThis.EventTarget();document.querySelector=()=>null;document.querySelectorAll=()=>[];
globalThis.document=document;globalThis.window=new globalThis.EventTarget();
const h=1/240;
const specimens=SQUISHIES.filter(s=>!process.argv[2]||s.id===process.argv[2]);
assert(specimens.length,'pass a valid toy ID, or omit it to test all ten');
function setup(spec,useJS=false){
  const bytes=readFileSync(`public/models/${spec.id}.bin`),manifest=JSON.parse(readFileSync(`public/models/${spec.id}.json`));
  const toy=new SquishyToy(spec,{cage:parseSquishy(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest),manifest},ENVIRONMENTS[0]);
  const body=toy.body;if(useJS)body.kernel=null;else assert(body.kernel,'native accelerator stays available for the finer mesh');
  for(let i=0;i<100;i++)body.step(h);body.updateSurface();
  const canvas=new globalThis.EventTarget(),captured=new Set();
  canvas.style={};canvas.ownerDocument=document;canvas.getRootNode=()=>document;canvas.getBoundingClientRect=()=>({left:0,top:0,width:900,height:900});
  canvas.classList={add(){},remove(){},toggle(){}};
  canvas.setPointerCapture=id=>captured.add(id);canvas.hasPointerCapture=id=>captured.has(id);canvas.releasePointerCapture=id=>captured.delete(id);
  const camera=new PerspectiveCamera(36,1,.001,50),mode=spec.family==='classic'?'squish':'grab';
  camera.position.set(0,.08,.24);
  const gestures=new SquishyGestures(body,spec.family==='sticky',()=>mode);
  const input=new Input(camera,canvas,body,toy.mesh,new ToyMotion(body),{unlock:async()=>{}},()=>{},()=>false,gestures);homeView(input,spec.family==='sticky');
  const event=(point,id=1,type='pointerdown',pointerType='mouse')=>{
    camera.updateMatrixWorld();const p=point.clone().project(camera);
    return {pointerId:id,pointerType,type,button:0,buttons:1,pressure:.5,clientX:(p.x+1)*450,clientY:(1-p.y)*450,preventDefault(){},stopImmediatePropagation(){}};
  };
  const advance=n=>{for(let i=0;i<n;i++){input.step(h);body.step(h);input.afterPhysicsStep();input.update(h);}body.updateSurface();assert(body.isFinite());assert(body.minimumJacobian()>=.1199);};
  const front=(dx=0,dy=0)=>{const b=body.surface.geometry.boundingBox,p=b.getCenter(new Vector3());p.x+=dx;p.y+=dy;p.z=b.max.z;return p;};
  return {toy,body,input,gestures,event,advance,front,captured,dispose(){input.dispose();toy.dispose();}};
}
const pressResults=[];
for(const spec of specimens.filter(s=>s.family==='classic')){
  const t=setup(spec),{body,input,event,advance,front}=t;
  assert.equal(body.world.planes.length,1,'classics have only the floor, with no invisible walls');
  assert(body.surface.positions.length/3>45000,'finer visible mesh');
  const start=front(),center=body.center.clone();input.begin({...event(start),shiftKey:true});
  assert.equal(input.handles.length,1,'one click is enough to squeeze');assert.equal(body.grabs.length,4,'one fingertip and a supporting palm');
  assert.equal(input.handles[0].pinned,false,'Shift does not create a hidden permanent pin in Squish mode');
  const finger=body.grabs[0],direction=new Vector3(0,-.15,-1).normalize(),before=finger.point.dot(direction);
  advance(105);
  const indentation=finger.point.dot(direction)-before;
  assert(indentation>.003,`${spec.id}: a stationary press makes a visible local dent (${indentation})`);
  assert(body.center.distanceTo(center)<.015,`${spec.id}: pressing does not throw the toy`);
  assert.equal(body.world.attached,0,'the supporting palm is not floor adhesion');
  input.end(event(start,1,'pointerup'));advance(2);assert.equal(body.grabs.length,0,'release removes all palm supports');assert.equal(t.captured.size,0);
  advance(220);assert(body.volumeRatio()>.90,`${spec.id}: foam recovers after a press`);
  body.reset();advance(80);
  const box=body.surface.geometry.boundingBox,size=box.getSize(new Vector3()),a=front(-size.x*.23),b=front(size.x*.23);
  input.begin(event(a,1,'pointerdown','touch'));input.begin(event(b,2,'pointerdown','touch'));
  assert.equal(input.handles.length,2,'two touch points remain independent');
  const [left,right]=input.handles,beforeSpan=left.point.distanceTo(right.point);
  input.pointerMove(event(a.clone().add(new Vector3(size.x*.11,0,0)),1,'pointermove','touch'));
  input.pointerMove(event(b.clone().add(new Vector3(-size.x*.11,0,0)),2,'pointermove','touch'));
  advance(100);assert(left.point.distanceTo(right.point)<beforeSpan*.9,`${spec.id}: two fingers compress from opposite sides`);
  input.end(event(a,1,'pointercancel','touch'));advance(2);assert.equal(input.handles.length,1,'lifting one finger preserves the second');
  input.clear();assert.equal(body.grabs.length,0,'cancellation clears the palm too');
  console.log('press',spec.id,{indentationMm:indentation*1000});pressResults.push({toy:spec.id,indentationMm:+(indentation*1000).toFixed(2)});t.dispose();
}
const wallResults=[];
for(const spec of specimens.filter(s=>s.family==='sticky')){
  const t=setup(spec),{body,input,event,advance,front}=t;
  const start=front();input.begin(event(start));assert.equal(input.handles.length,1);
  const wallPoint=new Vector3(.025,.155,-.14);
  input.pointerMove(event(wallPoint,1,'pointermove'));advance(160);
  input.end(event(wallPoint,1,'pointerup'));advance(55);
  assert.equal(input.handles.length,0);assert(body.world.wallAttached>=3,`${spec.id}: a real pointer drag and release sticks to the wall (${body.world.wallAttached})`);
  const clearance=body.surface.geometry.boundingBox.min.y;
  assert(clearance>.02,`${spec.id}: adhesive bonds support the entire toy above the floor (${clearance} m clearance, ${body.center.y} m center)`);
  const height=body.center.y;advance(180);assert(body.center.y>height-.035,`${spec.id}: adhesion lasts after releasing the pointer`);
  const mountedZ=body.center.z,mounted=front();input.begin(event(mounted));assert.equal(input.handles.length,1,`${spec.id}: the mounted toy can be picked again`);
  input.pointerMove(event(mounted.clone().add(new Vector3(-.07,.025,0)),1,'pointermove'));
  advance(150);console.log('wall gesture',spec.id,{mountedZ,currentZ:body.center.z,wallBonds:body.world.wallAttached});
  if(body.center.z<=mountedZ+.012)console.log('peel diagnostics',{grip:body.grabs.map(g=>({peel:g.peel,point:g.point,target:g.target})),bonds:[...body.world.bonds.values()].map(b=>({damage:b.damage,pull:body.world.openingTraction(b.anchor,body.world.planes[b.plane])}))});
  assert(body.center.z>mountedZ+.012,`${spec.id}: a new drag peels away from the wall`);
  wallResults.push({toy:spec.id,heldHeightCm:+(height*100).toFixed(2),peeledDistanceMm:+((body.center.z-mountedZ)*1000).toFixed(2)});t.dispose();
}
// Press supports take the same native route as finger grips. Verify both paths.
const native=setup(SQUISHIES[0]),js=setup(SQUISHIES[0],true);
for(const t of [native,js]){t.input.begin(t.event(t.front()));t.advance(80);}
let difference=0;for(let i=0;i<native.body.x.length;i++)difference=Math.max(difference,Math.abs(native.body.x[i]-js.body.x[i]));
assert(difference<.00002,'pressing agrees between JavaScript and WebAssembly');native.dispose();js.dispose();
console.table(pressResults);console.table(wallResults);console.log('Stationary presses, recovery, real multi-touch, open classic worlds, drag-to-stick, weight support, peeling and JS/native parity passed.',{difference});
