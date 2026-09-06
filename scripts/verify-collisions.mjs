import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSquishy } from '../src/squishy/model.ts';
import { SQUISHIES } from '../src/squishy/catalog.js';
import { SoftBody } from '../src/physics/soft-body.js';
import { StickyWorld,ROOM_PLANES } from '../src/physics/sticky-world.js';

for(const id of ['burger','fluffy','cheeks']){
  const spec=SQUISHIES.find(s=>s.id===id),bytes=readFileSync(`public/models/${id}.bin`),manifest=JSON.parse(readFileSync(`public/models/${id}.json`));
  const body=new SoftBody(parseSquishy(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest),spec.physics);
  body.world=new StickyWorld(body,{strength:spec.adhesion});body.canSleep=false;
  for(let i=0;i<body.x.length;i+=3){body.x[i]+=.06;body.x[i+1]+=.09;body.x[i+2]-=.04;body.velocity[i]=.6;body.velocity[i+1]=-.45;body.velocity[i+2]=-.8;}
  let depth=0,minimum=1;
  for(let i=0;i<180;i++){
    body.step(1/240);minimum=Math.min(minimum,body.lastMinJacobian);
    if(i%4===0){body.updateSurface();for(const plane of ROOM_PLANES)for(let v=plane.axis;v<body.surface.positions.length;v+=3)depth=Math.max(depth,plane.offset-plane.sign*body.surface.positions[v]);}
  }
  console.log(id,{maxPenetrationMm:depth*1000,minimumJacobian:minimum});
  assert(body.isFinite()&&minimum>=.1199,'a fast corner impact preserves orientation');
  assert(depth<.002,'the visible mesh stays within the corner contact tolerance');
}
