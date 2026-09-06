import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Blender-authored geometry and baked vertex occlusion, shared between modes.
 * Keep ownership here: changing worlds only detaches the scene, never frees
 * buffers that the next selection still needs. */
export class PastelStudio {
  readonly group:THREE.Group;
  private readonly geometries=new Set<THREE.BufferGeometry>();
  private readonly materials=new Set<THREE.Material>();
  constructor(group:THREE.Group) {
    this.group=group;group.name='Pastel Studio';
    const converted=new Map<THREE.Material,THREE.MeshPhysicalNodeMaterial>();
    group.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      this.geometries.add(object.geometry);
      const convert=(source:THREE.MeshStandardMaterial)=>{
        let material=converted.get(source);
        if(!material){
          const physical=source as THREE.MeshPhysicalMaterial;
          material=new THREE.MeshPhysicalNodeMaterial({
            name:source.name,color:source.color,roughness:source.roughness,
            metalness:source.metalness,vertexColors:source.vertexColors,
            clearcoat:physical.clearcoat??0,clearcoatRoughness:physical.clearcoatRoughness??.5,
          });
          converted.set(source,material);this.materials.add(material);
        }
        return material;
      };
      object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
      object.castShadow=object.userData.studioPart==='open';
      object.receiveShadow=true;
    });
    for(const material of converted.keys())material.dispose();
  }
  static async load(signal?:AbortSignal) {
    const response=await fetch('/environments/pastel-studio.glb',{signal});
    if(!response.ok)throw new Error(`Pastel Studio could not load (${response.status}).`);
    const gltf=await new GLTFLoader().parseAsync(await response.arrayBuffer(),'');
    const studio=new PastelStudio(gltf.scene);
    if(signal?.aborted){studio.dispose();throw new DOMException('Studio loading canceled.','AbortError');}
    return studio;
  }
  setSticky(sticky:boolean) {
    this.group.traverse(object=>{
      const part=object.userData.studioPart;
      if(part)object.visible=part==='floor'||part===(sticky?'sticky':'open');
    });
  }
  dispose(){this.group.removeFromParent();for(const geometry of this.geometries)geometry.dispose();for(const material of this.materials)material.dispose();}
}
