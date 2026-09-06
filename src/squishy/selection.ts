import type { Scene,WebGPURenderer,PerspectiveCamera } from 'three/webgpu';
import { SquishyToy } from './toy.ts';
import type { SquishySpec,EnvironmentSpec } from './toy.ts';
import { loadSquishy } from './model.ts';

/** Serialize GPU compilation, discard stale requests and keep one live toy. */
export class ToySelection {
  toy:SquishyToy|null=null;
  busy=false;
  private serial=0;
  private disposed=false;
  private abort:AbortController|null=null;
  private queue:Promise<void>=Promise.resolve();
  private readonly renderer:WebGPURenderer;
  private readonly scene:Scene;
  private readonly camera:PerspectiveCamera;
  constructor(renderer:WebGPURenderer,scene:Scene,camera:PerspectiveCamera){this.renderer=renderer;this.scene=scene;this.camera=camera;}
  select(spec:SquishySpec,environment:()=>EnvironmentSpec,onPrepare:()=>void,onCommit:(toy:SquishyToy)=>void) {
    const ticket=++this.serial;this.abort?.abort();
    const task=async()=>{
      if(this.disposed||ticket!==this.serial)return;
      const abort=new AbortController();this.abort=abort;
      let candidate:SquishyToy|null=null;
      try {
        const model=await loadSquishy(spec.id,abort.signal);
        if(this.disposed||ticket!==this.serial)return;
        this.busy=true;onPrepare();
        candidate=new SquishyToy(spec,model,environment());
        // Yield between bounded settling batches so a change of choice or a
        // touch never waits behind a long model warmup.
        for(let batch=0;batch<3;batch++){
          for(let i=0;i<12;i++)candidate.body.step(spec.physics.step);
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          if(this.disposed||ticket!==this.serial)return;
        }
        candidate.body.updateSurface();candidate.face.update(0);
        if(this.toy)this.scene.remove(this.toy.group);this.scene.add(candidate.group);
        await this.renderer.compileAsync(this.scene,this.camera);
        if(this.disposed||ticket!==this.serial)return;
        const previous=this.toy;onCommit(candidate);this.toy=candidate;candidate=null;previous?.dispose();
      } catch(error){if(!abort.signal.aborted&&!this.disposed)throw error;}
      finally {
        if(candidate){this.scene.remove(candidate.group);candidate.dispose();if(this.toy&&!this.disposed)this.scene.add(this.toy.group);}
        this.busy=false;
      }
    };
    const result=this.queue.then(task);this.queue=result.catch(()=>{});return result;
  }
  changeWorld(apply:()=>void) {
    const result=this.queue.then(async()=>{
      if(this.disposed)return;this.busy=true;
      try{apply();await this.renderer.compileAsync(this.scene,this.camera);}finally{this.busy=false;}
    });
    this.queue=result.catch(()=>{});return result;
  }
  dispose(){this.disposed=true;this.serial++;this.abort?.abort();if(this.toy){this.scene.remove(this.toy.group);this.toy.dispose();this.toy=null;}}
}
