import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSquishy } from '../src/squishy/model.ts';
import { SoftBody } from '../src/physics/soft-body.js';
import { StickyWorld,OPEN_PLANES,ROOM_PLANES } from '../src/physics/sticky-world.js';
import { SQUISHIES } from '../src/squishy/catalog.js';

const results=[];
for(const spec of SQUISHIES.filter(s=>!process.argv[2]||s.id===process.argv[2])){
  const bytes=readFileSync(`public/models/${spec.id}.bin`),manifest=JSON.parse(readFileSync(`public/models/${spec.id}.json`));
  const body=new SoftBody(parseSquishy(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest),spec.physics);
  body.world=new StickyWorld(body,{strength:spec.adhesion,planes:spec.family==='sticky'?ROOM_PLANES:OPEN_PLANES});
  const average=body.rest.reduce((sum,value,i)=>sum+(i%3===1?value:0),0)/body.mass.length;
  for(let i=0;i<2400;i++)body.step(1/240);
  const axis=[0,0,0];
  for(let i=0;i<body.x.length;i+=3)for(let a=0;a<3;a++)axis[a]+=(body.rest[i+1]-average)*(body.x[i+a]-body.center.getComponent(a));
  const upright=axis[1]/Math.hypot(...axis);
  results.push({toy:spec.id,upright:+upright.toFixed(3),sleeping:body.sleeping});
  body.surface.geometry.dispose();
}
console.table(results);
assert(results.every(r=>r.upright>.75),'untouched toys should stay upright and keep their faces visible for ten seconds');
