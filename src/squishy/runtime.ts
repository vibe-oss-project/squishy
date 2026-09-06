import * as THREE from 'three/webgpu';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createRenderer } from '../graphics/renderer.ts';
import { Input } from '../game/input.ts';
import { FixedStepper } from '../game/fixed-step.ts';
import { JellySound } from '../game/sound.ts';
import { PHYS } from '../physics/constants.js';
import { SQUISHIES,ENVIRONMENTS,DEFAULT_SQUISHY } from './catalog.js';
import type { EnvironmentSpec,SquishySpec } from './toy.ts';
import { PlaygroundWorld } from './world.ts';
import { PlaygroundUI } from './ui.ts';
import { ToyMotion,GripIndicators } from './interaction.ts';
import { resizePlayground } from './view.ts';
import { ToySelection } from './selection.ts';

export async function startGame(stage:(s:string)=>void,fail:(error:unknown)=>void) {
  let disposed=false,bootFailure:unknown=null;
  const fatal=(error:unknown)=>{bootFailure=error;fail(error);};
  stage('Waking up your little world…');const renderer=await createRenderer(fatal);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label','Squishy. Use several fingers to hold different points. With a mouse, Shift + click to pin, then drag another part. Press R to reset.');
  document.getElementById('viewport')!.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.001,3);
  camera.position.set(.025,.102,.205);camera.lookAt(0,.034,0);
  const sound=new JellySound(),world=new PlaygroundWorld(scene),selection=new ToySelection(renderer,scene,camera);
  const clock=new FixedStepper(PHYS.step),indicators=new GripIndicators(document.getElementById('grips')!);
  const abort=new AbortController();let input:Input|undefined,rig:ToyMotion|undefined,ui:PlaygroundUI|undefined;
  let environment:EnvironmentSpec=ENVIRONMENTS[0],lastTime=0,lastSound=-10,resizeFrame=0,uiRequest=0,worldRequest=0;
  let reflection:THREE.RenderTarget|undefined;
  const resize=()=>resizePlayground(renderer,camera,input?.controls);
  const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);});
  const reset=()=>{input?.recenter();selection.toy?.reset();indicators.clear();clock.reset();};
  const release=()=>{input?.clear();indicators.clear();};
  const selectToy=async(spec:SquishySpec)=>{
    const request=++uiRequest;ui?.busy(true);
    try {
      await selection.select(spec,()=>environment,()=>{release();renderer.domElement.style.pointerEvents='none';},toy=>{
        if(bootFailure)throw bootFailure;
        input?.dispose();toy.setWorld(environment);rig=new ToyMotion(toy.body);
        camera.position.set(.025,.102,.205);
        input=new Input(camera,renderer.domElement,toy.body,toy.mesh,rig,sound,reset,()=>ui?.pinMode??false);
        input.controls.minPolarAngle=.36;input.controls.maxPolarAngle=1.32;input.controls.minAzimuthAngle=-.72;input.controls.maxAzimuthAngle=.72;
        input.controls.minDistance=.12;input.controls.maxDistance=.36;
        camera.position.set(.025,.102,.205);resize();clock.reset();ui?.selectToy(spec);
      });
    } finally {if(request===uiRequest){ui?.busy(false);renderer.domElement.style.pointerEvents='';}}
  };
  const dispose=()=>{
    if(disposed)return;disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(resizeFrame);
    void renderer.setAnimationLoop(null);input?.dispose();selection.dispose();ui?.dispose();sound.dispose();indicators.clear();world.dispose();reflection?.dispose();renderer.dispose();
  };
  try {
    world.set(environment);resize();observer.observe(document.getElementById('viewport')!);
    stage('Adding a little soft light…');
    const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
    try{reflection=pmrem.fromScene(room,.04);scene.environment=reflection.texture;scene.environmentIntensity=.35;}finally{room.dispose();pmrem.dispose();}
    ui=new PlaygroundUI(spec=>{void selectToy(spec).catch(fatal);},spec=>{
      environment=spec;const request=++worldRequest;
      void selection.changeWorld(()=>{
        if(request!==worldRequest)return;
        release();world.set(spec);selection.toy?.setWorld(spec);reset();ui?.selectWorld(spec);
      }).catch(fatal);
    },reset,release,()=>{void sound.unlock().catch(()=>{});return sound.toggle();});
    ui.selectWorld(environment);
    stage('Your first little friend is taking shape…');
    await selectToy(SQUISHIES.find(s=>s.id===DEFAULT_SQUISHY)!);
    if(bootFailure)throw bootFailure;
    stage('One last little touch…');
    renderer.render(scene,camera);
    await (renderer.backend as unknown as {device:GPUDevice}).device.queue.onSubmittedWorkDone();
    if(bootFailure)throw bootFailure;
    lastTime=performance.now();
    await renderer.setAnimationLoop((time:number)=>{
      if(disposed||bootFailure)return;
      try {
        const dt=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
        if(document.hidden||selection.busy){clock.reset();return;}
        const toy=selection.toy;if(!toy||!input||!rig)return;
        let impact=0,peeled=0;
        clock.advance(dt,()=>{
          input!.step(PHYS.step);rig!.step(PHYS.step);toy.body.step(PHYS.step);input!.afterPhysicsStep();
          impact=Math.max(impact,toy.body.world?.impact??0);peeled+=toy.body.world?.peeled??0;
        });
        if(!toy.body.isFinite())throw new Error('The simulation produced an invalid state.');
        if(toy.body.center.length()>.6||toy.body.center.z>.22)reset();
        if(toy.body.surfaceDirty)toy.body.updateSurface();
        toy.face.update(dt);input.update(dt);indicators.update(input,camera);
        const expression=toy.face.expression;ui!.update(toy.body.grabs.length,toy.body.world?.attached??0,expression.squeeze,expression.delight);
        if((impact>.18||peeled>1)&&time/1000-lastSound>.17){sound.contact(impact>.18?impact:.055,false);lastSound=time/1000;}
        renderer.render(scene,camera);
      }catch(error){fatal(error);}
    });
    window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{signal:abort.signal});
    if(import.meta.hot)import.meta.hot.dispose(dispose);
    return {stop:dispose};
  }catch(error){dispose();throw error;}
}
