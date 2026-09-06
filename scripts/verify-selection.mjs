import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene,PerspectiveCamera,Mesh } from 'three/webgpu';
import { ToySelection } from '../src/squishy/selection.ts';
import { PlaygroundWorld } from '../src/squishy/world.ts';
import { SQUISHIES,ENVIRONMENTS } from '../src/squishy/catalog.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const originalFetch=globalThis.fetch,originalRAF=globalThis.requestAnimationFrame;
let delayedId='',fetchStarted=deferred(),fetchCount=0,compileGate=null,compileStarted=deferred(),activeCompiles=0,maxCompiles=0;
globalThis.requestAnimationFrame=fn=>{globalThis.queueMicrotask(()=>fn(performance.now()));return 1;};
globalThis.fetch=async(url,{signal}={})=>{
  fetchCount++;
  if(url.includes(`/${delayedId}.`)&&delayedId){
    fetchStarted.resolve();
    await new Promise((_,reject)=>{
      const abort=()=>reject(new globalThis.DOMException('Aborted','AbortError'));
      if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
    });
  }
  return new globalThis.Response(readFileSync(`public${url}`));
};
const scene=new Scene(),camera=new PerspectiveCamera(),commits=[];
const renderer={compileAsync:async()=>{
  activeCompiles++;maxCompiles=Math.max(maxCompiles,activeCompiles);compileStarted.resolve();
  try{if(compileGate)await compileGate.promise;}finally{activeCompiles--;}
}};
const selection=new ToySelection(renderer,scene,camera);
const choose=i=>selection.select(SQUISHIES[i],()=>ENVIRONMENTS[0],()=>{},toy=>commits.push(toy.spec.id));
try {
  await Promise.all([choose(0),choose(1),choose(5)]);
  assert.deepEqual(commits,['fluffy'],'only the latest queued selection commits');assert.equal(fetchCount,2,'superseded queued requests do not fetch');
  const first=selection.toy;let firstDisposed=false;first.mesh.geometry.addEventListener('dispose',()=>{firstDisposed=true;});
  delayedId='bunny';fetchStarted=deferred();const slow=choose(6);await fetchStarted.promise;
  const faster=choose(7);await Promise.all([slow,faster]);delayedId='';
  assert.equal(selection.toy.spec.id,'seal','slow aborted downloads cannot overwrite a newer choice');assert(firstDisposed,'previous GPU geometry is disposed');
  assert.equal(scene.children.length,1,'one toy remains in the scene');
  compileGate=deferred();compileStarted=deferred();const compiling=choose(8);await compileStarted.promise;
  const obsolete=scene.children[0];let obsoleteDisposed=false;obsolete.children[0].geometry.addEventListener('dispose',()=>{obsoleteDisposed=true;});
  const newer=choose(9);let worldChanged=false;const worldChange=selection.changeWorld(()=>{worldChanged=true;});
  const gate=compileGate;compileGate=null;gate.resolve();await Promise.all([compiling,newer,worldChange]);
  assert.equal(selection.toy.spec.id,'cheeks');assert(obsoleteDisposed,'a canceled compiling model is disposed');
  assert(!commits.includes('chick'),'stale compilation cannot commit');assert(worldChanged,'queued environment changes complete');
  assert.equal(maxCompiles,1,'GPU compilation is serialized');assert.equal(scene.children.length,1);assert(!selection.busy);
  delayedId='panda';fetchStarted=deferred();const disposedRequest=choose(0);await fetchStarted.promise;selection.dispose();await disposedRequest;
  assert.equal(selection.toy,null);assert.equal(scene.children.length,0,'teardown never reattaches a stale toy');
  const worldScene=new Scene(),world=new PlaygroundWorld(worldScene);
  for(const environment of ENVIRONMENTS){
    world.set(environment,true);let meshes=0;
    world.group.traverse(object=>{if(object instanceof Mesh){meshes++;const positions=object.geometry.attributes.position.array;assert(positions.every(Number.isFinite),'environment geometry is finite');assert(object.material.isNodeMaterial,'environments use WebGPU node materials');}});
    assert(meshes>10,`${environment.id}: complete environment geometry`);
    const walls=[];world.group.traverse(object=>{if(object instanceof Mesh&&object.geometry.parameters?.height===40&&Math.abs(object.rotation.x)<.01)walls.push(object);});
    assert.equal(walls.length,3,'sticky worlds have three tall visible walls');
    world.follow(100);for(const wall of walls)assert(Math.abs(wall.position.y-100)<20,'walls cover the camera even far above the initial room');
    world.set(environment,false);
    const vertical=[];world.group.traverse(object=>{if(object instanceof Mesh&&object.geometry.parameters?.height===40&&Math.abs(object.rotation.x)<.01)vertical.push(object);});
    assert.equal(vertical.length,0,'classic worlds have no visible vertical walls');
  }
  world.dispose();assert.equal(worldScene.children.length,0,'environment disposal removes lights and geometry');
  console.log('Latest choice, aborted fetch, stale compilation, serialized world changes, resource cleanup and 5 WebGPU environment graphs passed.');
} finally {
  selection.dispose();globalThis.fetch=originalFetch;globalThis.requestAnimationFrame=originalRAF;
}
