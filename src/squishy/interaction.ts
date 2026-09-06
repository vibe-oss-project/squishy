import { Vector3 } from 'three/webgpu';
import type { SoftBody } from '../physics/soft-body.js';
import type { Input } from '../game/input.ts';
import type { PerspectiveCamera } from 'three/webgpu';

/** Small optional keyboard nudges; never supplies an artificial standing force. */
export class ToyMotion {
  readonly move=new Vector3();
  private readonly body:SoftBody;
  constructor(body:SoftBody){this.body=body;}
  jump(){if(!this.body.grounded||this.body.grab)return;this.body.wake();for(let i=1;i<this.body.velocity.length;i+=3)this.body.velocity[i]+=.30;}
  reset(){this.move.set(0,0,0);}
  step(h:number){
    if(!this.move.lengthSq())return;this.body.wake();
    for(let i=0;i<this.body.velocity.length;i+=3){this.body.velocity[i]+=this.move.x*h*.65;this.body.velocity[i+2]+=this.move.z*h*.65;}
  }
}

/** Screen-space rings mark the actual physical grip, including mouse pins. */
export class GripIndicators {
  private readonly nodes:HTMLElement[]=[];
  private readonly root:HTMLElement;
  private readonly projected=new Vector3();
  constructor(root:HTMLElement){this.root=root;}
  update(input:Input,camera:PerspectiveCamera) {
    const handles=input.handles;
    for(let i=0;i<handles.length;i++){
      if(!this.nodes[i]){const n=document.createElement('span');n.className='grip-ring';this.root.append(n);this.nodes.push(n);}
      const h=handles[i],n=this.nodes[i],p=this.projected.copy(h.point).project(camera);
      n.hidden=p.z>1||p.z< -1;n.classList.toggle('pinned',h.pinned);
      n.style.transform=`translate(${(p.x+1)*innerWidth/2}px,${(1-p.y)*innerHeight/2}px)`;
      n.textContent=h.pinned?'✦':'';
    }
    for(let i=handles.length;i<this.nodes.length;i++)this.nodes[i].hidden=true;
  }
  clear(){this.root.replaceChildren();this.nodes.length=0;}
}
