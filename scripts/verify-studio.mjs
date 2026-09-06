import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Scene,Mesh,Box3 } from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PastelStudio } from '../src/squishy/studio.ts';
import { PlaygroundWorld } from '../src/squishy/world.ts';
import { WorldLight } from '../src/squishy/world-light.ts';
import { ENVIRONMENTS } from '../src/squishy/catalog.js';

const bytes=readFileSync('public/environments/pastel-studio.glb');
assert(bytes.byteLength<3_000_000,'studio must fit the three-megabyte uncompressed geometry budget');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const studio=new PastelStudio(gltf.scene),geometries=new Set(),materials=new Set();
let floors=0,vertices=0;
studio.group.updateMatrixWorld(true);
studio.group.traverse(object=>{
  if(!(object instanceof Mesh))return;
  const {position,normal,color}=object.geometry.attributes;
  assert(position.array.every(Number.isFinite)&&normal.array.every(Number.isFinite),'valid exported positions and smooth normals');
  assert(color&&color.count===position.count,'every vertex carries baked studio color');
  assert(object.material.isNodeMaterial&&object.material.vertexColors,'WebGPU material preserves baked shading');
  assert(!object.material.transparent,'no overlapping translucent floor passes');
  geometries.add(object.geometry);materials.add(object.material);vertices+=position.count;
  if(object.userData.studioPart==='floor'){
    floors++;
    const box=new Box3().setFromObject(object);
    assert(Math.abs(box.min.y)<1e-7&&Math.abs(box.max.y)<1e-7,'the inlay and floor are exactly one continuous plane');
    assert(box.max.x>=19.9&&box.min.x<=-19.9,'floor covers distant throws');
    for(let i=0;i<normal.count;i++)assert(normal.getY(i)>.999,'the entire floor faces the camera and the light');
  }
});
assert.equal(floors,1);
for(const sticky of [false,true]){
  studio.setSticky(sticky);let active=0;
  studio.group.traverseVisible(object=>{if(object instanceof Mesh){active++;assert(['floor',sticky?'sticky':'open'].includes(object.userData.studioPart),'inactive props never cast ghost shadows');}});
  assert(active<=12,'bounded environment draw calls per mode');
}
let freedGeometry=0,freedMaterial=0;
for(const geometry of geometries)geometry.addEventListener('dispose',()=>freedGeometry++);
for(const material of materials)material.addEventListener('dispose',()=>freedMaterial++);
studio.dispose();assert.equal(freedGeometry,geometries.size);assert.equal(freedMaterial,materials.size);

const scene=new Scene(),light=new WorldLight(scene),initial=light.key.position.clone().sub(light.key.target.position);
const start=light.key.position.clone();
for(const height of [.07,.08,.14,.16]){light.follow(height);assert(light.key.position.equals(start),'idle camera settling cannot move the floor shadow');}
for(const height of [.2,.27,.6,1,5,100]){
  light.follow(height);
  assert(light.key.position.clone().sub(light.key.target.position).distanceTo(initial)<1e-12,'light direction is constant during high throws');
}
const a=light.key.target.position.clone();light.follow(100+1e-7);
assert(light.key.target.position.distanceTo(a)<1e-8,'subtexel camera movements do not shimmer');
light.dispose();assert.equal(scene.children.length,0);

const fetch=globalThis.fetch;
globalThis.fetch=async url=>new globalThis.Response(readFileSync(`public${url}`));
const world=new PlaygroundWorld(scene);
try{
  await world.load();
  for(const spec of ENVIRONMENTS)for(const sticky of [false,true]){
    world.set(spec,sticky);world.group.updateMatrixWorld(true);
    let surface=0;
    world.group.traverseVisible(object=>{
      if(!(object instanceof Mesh))return;
      const box=new Box3().setFromObject(object);
      if(box.max.x-box.min.x>1&&Math.abs(box.min.y)<1e-7&&Math.abs(box.max.y)<1e-7)surface++;
      assert(!(object.geometry.type==='CircleGeometry'),'no almost-coplanar floor disks');
    });
    assert.equal(surface,1,`${spec.name}: one rendered ground surface`);
  }
}finally{world.dispose();globalThis.fetch=fetch;}
assert.equal(scene.children.length,0);
console.log(`Blender GLB: ${vertices} vertices, ${bytes.byteLength} bytes. Baked colors, single floor, mode visibility, disposal, and stable high-throw light passed.`);
