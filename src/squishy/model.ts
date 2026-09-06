import { BufferAttribute,BufferGeometry,DynamicDrawUsage } from 'three/webgpu';
import type { ModelManifest } from '../physics/baby-cage.ts';

export interface SquishyManifest extends ModelManifest {
  id:string;scale:number;bottom:number;
  face:{x:number;y:number;eye:number;noseY:number;mouthY:number;mouth:string;eyes:string;ink:string;nose:string;blush:number};
}
export function parseSquishy(buffer:ArrayBuffer,manifest:SquishyManifest) {
  const get=<T extends Float32Array|Float64Array|Uint32Array>(name:string,Ctor:{new(buffer:ArrayBuffer,offset:number,length:number):T})=>{
    const entry=manifest.layout[name];return new Ctor(buffer,entry.offset,entry.length);
  };
  const positions=get('positions',Float32Array).slice(),normals=get('normals',Float32Array),indices=get('indices',Uint32Array);
  const bindingIds=get('bindingIds',Uint32Array),bindingWeights=get('bindingWeights',Float64Array);
  const stencils:[number,number][][]=Array.from({length:positions.length/3},(_,i)=>Array.from({length:4},(_,k)=>[bindingIds[i*4+k],bindingWeights[i*4+k]]));
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(positions,3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('normal',new BufferAttribute(normals.slice(),3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('color',new BufferAttribute(get('colors',Float32Array),3));
  geometry.setIndex(new BufferAttribute(indices,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const t=get('tets',Uint32Array),tets=Array.from({length:t.length/4},(_,i)=>Array.from(t.subarray(i*4,i*4+4)));
  return {pos:get('particles',Float64Array),tets,volumes:get('volumes',Float64Array),totalVolume:manifest.volume,
    contactBindings:Array.from(get('contacts',Uint32Array),id=>stencils[id]),
    surface:{geometry,positions,indices,stencils,bindingIds,bindingWeights,restNormals:normals,tetIds:get('tetIds',Uint32Array)},
  };
}
export async function loadSquishy(id:string,signal?:AbortSignal) {
  const [binary,metadata]=await Promise.all([fetch(`/models/${id}.bin`,{signal}),fetch(`/models/${id}.json`,{signal})]);
  if(!binary.ok||!metadata.ok)throw new Error(`Could not load Squishy ${id}.`);
  const manifest=await metadata.json() as SquishyManifest;
  return {cage:parseSquishy(await binary.arrayBuffer(),manifest),manifest};
}
