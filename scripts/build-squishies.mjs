import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Color,Vector3 } from 'three/webgpu';
import { SQUISHIES } from '../src/squishy/catalog.js';
import { sculpt } from '../src/squishy/shapes.js';
import { implicitMesh } from './implicit-mesh.mjs';
import { buildCage } from './model-cage.mjs';

mkdirSync('public/models',{recursive:true});
const sourceHash=createHash('sha256').update(readFileSync('src/squishy/shapes.js')).update(readFileSync('scripts/implicit-mesh.mjs')).update(readFileSync('scripts/build-squishies.mjs')).digest('hex');
for(const model of SQUISHIES) {
  const shape=sculpt(model.id),raw=implicitMesh(shape.sdf,shape.bounds,.026),p=raw.positions;
  let minY=Infinity,maxY=-Infinity;for(let i=1;i<p.length;i+=3){minY=Math.min(minY,p[i]);maxY=Math.max(maxY,p[i]);}
  // Keep the seal horizontal and roughly the same apparent size as the others.
  const scale=model.id==='seal'?.031:.07/(maxY-minY),bottom=minY;
  const colors=new Float32Array(p.length),v=new Vector3(),c=new Color();
  for(let i=0;i<p.length;i+=3){v.fromArray(p,i);c.set(shape.color(v));c.toArray(colors,i);p[i]*=scale;p[i+1]=(p[i+1]-bottom)*scale;p[i+2]*=scale;}
  let volume=0;const ix=raw.indices,edgeCounts=new Map();
  for(let i=0;i<ix.length;i+=3){
    const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;
    volume+=(p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1])+p[a+1]*(p[b+2]*p[c]-p[b]*p[c+2])+p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]))/6;
    for(let k=0;k<3;k++){const a=ix[i+k],b=ix[i+(k+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}
  }
  if(volume<=0||[...edgeCounts.values()].some(n=>n!==2))throw new Error(`${model.id}: non-manifold mesh`);
  const arrays={positions:new Float32Array(p),normals:new Float32Array(raw.normals),indices:new Uint32Array(ix),colors,...buildCage(p,scale,bottom,shape.sdf,volume,model.id==='burger'?.0085:.0075)};
  // Farthest-point contact quadrature: retain geometric extremes while placing
  // a hard budget on surface contacts. Visual resolution stays independent.
  const candidates=arrays.contacts,distances=new Float64Array(candidates.length).fill(Infinity),selected=[];
  let next=0;
  for(let n=0;n<Math.min(768,candidates.length);n++){
    const id=candidates[next];selected.push(id);distances[next]=-1;
    let farthest=-1;
    for(let j=0;j<candidates.length;j++)if(distances[j]>=0){
      const other=candidates[j],d=(p[id*3]-p[other*3])**2+(p[id*3+1]-p[other*3+1])**2+(p[id*3+2]-p[other*3+2])**2;
      distances[j]=Math.min(distances[j],d);if(distances[j]>farthest){farthest=distances[j];next=j;}
    }
  }
  arrays.contacts=new Uint32Array(selected);
  const chunks=[],layout={};let offset=0;
  for(const [name,array] of Object.entries(arrays)) {
    const padding=(8-offset%8)%8;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
    layout[name]={offset,length:array.length,type:array.constructor.name};chunks.push(Buffer.from(array.buffer));offset+=array.byteLength;
  }
  writeFileSync(`public/models/${model.id}.bin`,Buffer.concat(chunks));
  writeFileSync(`public/models/${model.id}.json`,JSON.stringify({id:model.id,sourceHash,source:model.source,scale,bottom,volume,face:shape.face,layout},null,2));
  console.log(`${model.id}: ${p.length/3} vertices, ${(offset/1048576).toFixed(2)} MB`);
}
