import { Vector3 } from 'three/webgpu';
import type { WebGPURenderer,PerspectiveCamera } from 'three/webgpu';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Input } from '../game/input.ts';

export function homeView(input:Input,sticky:boolean) {
  input.controls.minPolarAngle=.38;input.controls.maxPolarAngle=1.40;
  input.controls.minAzimuthAngle=-.70;input.controls.maxAzimuthAngle=.70;
  input.controls.minDistance=.14;input.controls.maxDistance=.60;
  input.home(new Vector3(0,sticky?.080:.075,sticky?.265:.215),new Vector3(0,.034,0));
}

export function squishyDrawingSize(width:number,height:number,deviceDpr:number) {
  const dpr=Math.min(deviceDpr,1.7,Math.sqrt(4_000_000/(width*height)));
  return Number.isFinite(dpr)&&dpr>0?dpr:1;
}
export function resizePlayground(renderer:WebGPURenderer,camera:PerspectiveCamera,controls?:OrbitControls) {
  if(innerWidth<=0||innerHeight<=0)return;
  const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
  renderer.setDrawingBufferSize(width,height,squishyDrawingSize(width,height,devicePixelRatio));
  camera.aspect=width/height;
  const top=width<700?180:110;
  const bottom=(document.querySelector('.gesture-toolbar')?.getBoundingClientRect().top??height-305)-20;
  const playHeight=Math.max(100,bottom-top),center=top+playHeight/2;
  const distance=Math.max(.06,camera.position.distanceTo(controls?.target??new Vector3(0,.034,0))-.035);
  // Fit the whole toy above the controls, including on shorter laptop screens.
  const tangent=Math.max(Math.tan(Math.PI/10)*Math.max(1,.78/camera.aspect),.038/distance*height/playHeight);
  camera.fov=2*Math.atan(tangent)*180/Math.PI;
  camera.setViewOffset(width,height,0,height/2-center,width,height);
  camera.updateProjectionMatrix();controls?.update();
}
