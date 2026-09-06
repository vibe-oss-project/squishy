import type { WebGPURenderer,PerspectiveCamera } from 'three/webgpu';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function squishyDrawingSize(width:number,height:number,deviceDpr:number) {
  const dpr=Math.min(deviceDpr,1.7,Math.sqrt(4_000_000/(width*height)));
  return Number.isFinite(dpr)&&dpr>0?dpr:1;
}
export function resizePlayground(renderer:WebGPURenderer,camera:PerspectiveCamera,controls?:OrbitControls) {
  if(innerWidth<=0||innerHeight<=0)return;
  const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);
  renderer.setDrawingBufferSize(width,height,squishyDrawingSize(width,height,devicePixelRatio));
  camera.aspect=width/height;
  camera.fov=2*Math.atan(Math.tan(Math.PI/10)*Math.max(1,.78/camera.aspect))*180/Math.PI;
  camera.setViewOffset(width,height,0,height*(height<600?.12:.065),width,height);
  camera.updateProjectionMatrix();controls?.update();
}
