import * as THREE from 'three/webgpu';
import type { SoftBody } from '../physics/soft-body.js';
import { FaceSkin } from '../graphics/face-skin.ts';
import type { SquishyManifest } from './model.ts';
import { SquishyExpression } from './expression.ts';

type Detail={mesh:THREE.Mesh;rest:Float32Array;cx:number;cy:number;kind:string;radius:number;dynamicBlush:boolean};
export class SquishyFace {
  readonly group=new THREE.Group();
  readonly expression:SquishyExpression;
  private readonly skin:FaceSkin;
  private readonly details:Detail[]=[];
  private readonly materials=new Map<string,THREE.MeshBasicNodeMaterial>();
  private readonly sample=new Float64Array(6);
  private readonly body:SoftBody;
  private readonly manifest:SquishyManifest;
  private lastRevision=-1;
  private lastMotion=-1;
  constructor(body:SoftBody,manifest:SquishyManifest) {
    this.body=body;this.manifest=manifest;this.skin=new FaceSkin(body,true);this.expression=new SquishyExpression(body);
    const f=manifest.face;
    const oval=(rx:number,ry:number)=>new THREE.CircleGeometry(1,32).scale(rx,ry,1);
    for(const s of [-1,1]){
      this.add(oval(f.eye,f.eyes==='sleep'?f.eye*.105:f.eye*1.16),f.ink,s*f.x,f.y,'eye',f.eye);
      if(manifest.id==='milk'){
        this.add(oval(f.eye*.27,f.eye*.32),'#fffafa',s*f.x-f.eye*.28,f.y+f.eye*.34,'glint',f.eye);
        this.add(oval(f.eye*.13,f.eye*.16),'#f9e7f2',s*f.x+f.eye*.25,f.y-f.eye*.36,'glint',f.eye);
      }
      this.add(oval(f.blush||f.eye*1.6,(f.blush||f.eye)*.62),manifest.id==='milk'?'#fff5ef':'#ee91b5',s*(f.x+f.eye*1.65),f.y-f.eye*1.5,'cheek',f.eye,!f.blush);
    }
    if(f.nose!=='none') {
      const r=f.mouth==='dot'||f.mouth==='seal'?f.eye*.82:f.eye*.52;
      const g=manifest.id==='sleepy'?new THREE.CircleGeometry(r,3).rotateZ(Math.PI/2):oval(r,r*.85);
      this.add(g,f.nose,0,f.noseY,'nose',r);
    }
    if(f.mouth==='w'){
      const r=f.eye*1.12,points=[];
      for(let i=0;i<=32;i++){
        const x=(i/32*2-1)*r*1.35,t=Math.abs(x)/(r*1.35);
        points.push(new THREE.Vector3(x,(.5-Math.sin(t*Math.PI))*.7*r,0));
      }
      this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,f.eye*.10,6,false),f.ink,0,f.mouthY,'mouth',r);
      if(f.nose!=='none')this.add(new THREE.PlaneGeometry(f.eye*.13,Math.max(.015,f.noseY-f.mouthY)),f.ink,0,(f.noseY+f.mouthY)/2,'mouth',r);
    } else if(f.mouth==='tiny')this.add(new THREE.PlaneGeometry(.009,.055),f.nose,0,f.mouthY,'mouth',f.eye);
    if(manifest.id==='burger')for(const s of [-1,1])for(const y of [1.08,1.16])this.add(new THREE.PlaneGeometry(.13,.012).rotateZ(s*.10),f.ink,s*.67,y,'whisker',.06);
    if(manifest.id==='seal')for(const s of [-1,1])for(const [x,y] of [[.13,.50],[.21,.48]])this.add(oval(.032,.04),'#aeb0bc',s*x,y,'whisker',.03);
    this.update(0);
  }
  private add(geometry:THREE.BufferGeometry,color:string,cx:number,cy:number,kind:string,radius:number,dynamicBlush=false) {
    const key=color+(dynamicBlush?' fade':'');let material=this.materials.get(key);
    if(!material){material=new THREE.MeshBasicNodeMaterial({color,side:THREE.DoubleSide,transparent:dynamicBlush,opacity:dynamicBlush?0:1,depthWrite:!dynamicBlush});this.materials.set(key,material);}
    const rest=new Float32Array(geometry.attributes.position.array);
    (geometry.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=2;this.group.add(mesh);
    this.details.push({mesh,rest,cx,cy,kind,radius,dynamicBlush});
  }
  update(dt:number) {
    this.expression.update(dt,this.body);
    const {blink,squeeze,delight}=this.expression,motion=blink+squeeze+delight;
    if(this.lastRevision===this.body.surfaceRevision&&motion===this.lastMotion)return;
    this.lastRevision=this.body.surfaceRevision;this.lastMotion=motion;
    const {scale,bottom,face}=this.manifest;
    for(const d of this.details){
      const attribute=d.mesh.geometry.attributes.position;
      if(d.dynamicBlush)(d.mesh.material as THREE.Material).opacity=Math.min(.28,squeeze*.18+delight*.24);
      for(let i=0;i<attribute.count;i++){
        let x=d.rest[i*3],y=d.rest[i*3+1];
        if(d.kind==='eye'){
          const close=Math.max(blink,delight*.82,squeeze*.72);
          if(face.eyes!=='sleep')y*=1-close*.92;
          y+=(1-(x/d.radius)**2)*(delight*.45+squeeze*.32)*d.radius;
          x*=1-squeeze*.12;
        } else if(d.kind==='glint') {
          d.mesh.visible=Math.max(blink,squeeze,delight)<.24;
        } else if(d.kind==='mouth'){
          x*=1+delight*.12-squeeze*.13;y*=1+delight*.24;
        }
        this.skin.sample((x+d.cx)*scale,(y+d.cy-bottom)*scale,.000075+Math.max(0,d.rest[i*3+2]*scale)+(d.kind==='glint'?.00004:0),this.sample);
        attribute.setXYZ(i,this.sample[0],this.sample[1],this.sample[2]);
      }
      attribute.needsUpdate=true;
    }
  }
  reset(){this.expression.reset();this.lastMotion=-1;this.lastRevision=-1;}
  dispose(){for(const d of this.details)d.mesh.geometry.dispose();for(const material of this.materials.values())material.dispose();}
}
