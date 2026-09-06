import * as THREE from 'three/webgpu';
import { softenStudioShadow } from './world-shadows.js';

/** A constant softbox direction and a shadow camera moving on whole texels.
 * Camera bobbing must never rotate the sunlight or slide a subpixel shadow grid. */
export class WorldLight {
  readonly key=new THREE.DirectionalLight('#fff4e7',2.1);
  readonly fill=new THREE.HemisphereLight('#f8f2ff','#c6b2be',1.55);
  private readonly direction=new THREE.Vector3(-.18,.30,.22);
  private readonly axisX=new THREE.Vector3();
  private readonly axisY=new THREE.Vector3();
  private readonly axisZ=new THREE.Vector3();
  private readonly center=new THREE.Vector3();
  private readonly matrix=new THREE.Matrix4();
  constructor(scene:THREE.Scene) {
    const light=this.key,shadow=light.shadow;
    light.position.copy(this.direction);light.castShadow=true;
    shadow.mapSize.set(2048,2048);
    Object.assign(shadow.camera,{left:-.24,right:.24,top:.24,bottom:-.24,near:.005,far:1.1});
    shadow.camera.updateProjectionMatrix();
    shadow.normalBias=.00016;shadow.bias=-.00002;shadow.intensity=.78;
    softenStudioShadow(shadow);
    this.matrix.lookAt(this.direction,new THREE.Vector3(),new THREE.Vector3(0,1,0));
    this.matrix.extractBasis(this.axisX,this.axisY,this.axisZ);
    scene.add(light,light.target,this.fill);this.follow(0);
  }
  set(night:boolean) {
    this.key.intensity=night?1.8:2.1;
    this.fill.intensity=night?1.25:1.55;
  }
  follow(height:number) {
    // Leave the entire starting play area fixed. Beyond it, snap in light
    // space so the 2048² projection never crawls across a stationary surface.
    this.center.set(0,Math.max(0,height-.16),0);
    const texel=.48/2048;
    const x=Math.round(this.center.dot(this.axisX)/texel)*texel;
    const y=Math.round(this.center.dot(this.axisY)/texel)*texel;
    const z=Math.round(this.center.dot(this.axisZ)/texel)*texel;
    this.key.target.position.copy(this.axisX).multiplyScalar(x).addScaledVector(this.axisY,y).addScaledVector(this.axisZ,z);
    this.key.position.copy(this.key.target.position).add(this.direction);
    this.key.target.updateMatrixWorld();
  }
  dispose(){this.key.removeFromParent();this.key.target.removeFromParent();this.fill.removeFromParent();this.key.shadow.dispose();}
}
