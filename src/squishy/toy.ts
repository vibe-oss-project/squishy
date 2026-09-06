import * as THREE from 'three/webgpu';
import { attribute,mx_noise_float,float,mix } from 'three/tsl';
import { SoftBody } from '../physics/soft-body.js';
import { StickyWorld } from '../physics/sticky-world.js';
import { SquishyFace } from './face.ts';
import { SQUISHIES,ENVIRONMENTS } from './catalog.js';
import type { loadSquishy } from './model.ts';

export type SquishySpec=typeof SQUISHIES[number];
export type EnvironmentSpec=typeof ENVIRONMENTS[number];
export class SquishyToy {
  readonly group=new THREE.Group();
  readonly body:SoftBody;
  readonly mesh:THREE.Mesh;
  readonly face:SquishyFace;
  readonly spec:SquishySpec;
  private readonly material:THREE.MeshPhysicalNodeMaterial;
  constructor(spec:SquishySpec,model:Awaited<ReturnType<typeof loadSquishy>>,environment:EnvironmentSpec) {
    this.spec=spec;this.body=new SoftBody(model.cage,spec.physics);
    this.body.surface.geometry.setAttribute('restPosition',new THREE.BufferAttribute(new Float32Array(this.body.surface.positions),3));
    this.setWorld(environment);
    const sticky=spec.family==='sticky';
    this.material=new THREE.MeshPhysicalNodeMaterial({vertexColors:true,roughness:sticky?.49:.86,metalness:0,clearcoat:sticky?.22:0,clearcoatRoughness:.38});
    // Fine matte grain catches the studio light without swimming as it deforms.
    this.material.roughnessNode=mix(float(sticky?.43:.80),float(sticky?.57:.94),mx_noise_float(attribute<'vec3'>('restPosition','vec3').mul(1600)).mul(.5).add(.5));
    this.mesh=new THREE.Mesh(this.body.surface.geometry,this.material);this.mesh.castShadow=true;this.mesh.receiveShadow=true;this.mesh.frustumCulled=false;
    this.face=new SquishyFace(this.body,model.manifest);this.group.add(this.mesh,this.face.group);
  }
  setWorld(environment:EnvironmentSpec){this.body.world=new StickyWorld(this.body,{strength:this.spec.adhesion,grip:environment.grip,friction:environment.friction});this.body.wake();}
  reset(){this.body.reset();this.face.reset();}
  dispose(){this.face.dispose();this.mesh.geometry.dispose();this.material.dispose();this.body.world?.reset();this.body.grab=null;}
}
