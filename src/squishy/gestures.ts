import { Vector3 } from 'three/webgpu';
import type { Plane,Ray } from 'three/webgpu';
import type { SoftBody } from '../physics/soft-body.js';
import type { GrabBehavior,SurfaceGrip } from '../game/grab-behavior.ts';
import { advanceGrabTarget,projectGrabTarget } from '../physics/grab.ts';
import { ROOM_PLANES } from '../physics/sticky-world.js';

export type GestureMode='squish'|'grab';
type Hold={press:boolean;origin:Vector3;anchor:Vector3;direction:Vector3;depth:number;age:number;attached:boolean;wall:boolean};

/** A broad fingertip and a temporary supporting palm make a press compress
 * the real volume. Supports exist only during squeezing, never after release. */
export class SquishyGestures implements GrabBehavior {
  private readonly holds=new Map<SurfaceGrip,Hold>();
  private readonly palm:SurfaceGrip[]=[];
  private readonly body:SoftBody;
  private readonly sticky:boolean;
  private readonly mode:()=>GestureMode;
  private readonly target=new Vector3();
  constructor(body:SoftBody,sticky:boolean,mode:()=>GestureMode){this.body=body;this.sticky=sticky;this.mode=mode;}
  get pressing(){return [...this.holds.values()].some(h=>h.press);}
  get aimingAtWall(){return [...this.holds.values()].some(h=>h.wall);}
  canPin(){return this.mode()==='grab';}
  private patch(point:Vector3,radius:number):SurfaceGrip {
    const {x}=this.body,nodes=[];
    for(let i=0;i<x.length;i+=3)nodes.push({id:i/3,d:(x[i]-point.x)**2+(x[i+1]-point.y)**2+(x[i+2]-point.z)**2});
    nodes.sort((a,b)=>a.d-b.d);
    const near=nodes.slice(0,16),weights:[number,number][]=near.map(n=>[n.id,Math.exp(-n.d/(radius*radius))]);
    const total=weights.reduce((sum,[,w])=>sum+w,0),anchor=new Vector3();
    for(const pair of weights){pair[1]/=total;anchor.addScaledVector(new Vector3().fromArray(x,pair[0]*3),pair[1]);}
    return {weights,point:anchor.clone(),target:anchor.clone(),lambda:new Float64Array(3)};
  }
  begin(grip:SurfaceGrip,ray:Ray,pinned:boolean) {
    const press=this.mode()==='squish'&&!pinned,origin=grip.point.clone(),direction=ray.direction.clone();
    const box=this.body.surface.geometry.boundingBox!,size=box.getSize(new Vector3());
    const depth=Math.min(.022,Math.max(.009,(Math.abs(direction.x)*size.x+Math.abs(direction.y)*size.y+Math.abs(direction.z)*size.z)*.36));
    if(press) {
      const patch=this.patch(origin,.010);grip.weights=patch.weights;grip.point.copy(patch.point);grip.target.copy(patch.target);
      if(!this.palm.length){
        const center=box.getCenter(new Vector3()),side=new Vector3().crossVectors(direction,new Vector3(0,1,0)).normalize();
        const up=new Vector3().crossVectors(side,direction).normalize(),back=center.clone().addScaledVector(direction,depth*1.2);
        for(const [u,v] of [[-.32,.18],[.32,.18],[0,-.32]]){
          const p=back.clone().addScaledVector(side,u*size.x).addScaledVector(up,v*size.y),support=this.patch(p,.009);
          this.palm.push(support);this.body.grabs.push(support);
        }
      }
    }
    const attached=(this.body.world?.wallAttached??0)>0;
    grip.peel=!press&&attached;
    this.holds.set(grip,{press,origin,anchor:grip.point.clone(),direction,depth,age:0,attached,wall:false});
  }
  project(grip:SurfaceGrip,ray:Ray,plane:Plane,out:Vector3) {
    if(!projectGrabTarget(ray,plane,out))return false;
    const hold=this.holds.get(grip);if(!hold||hold.press||!this.sticky)return true;
    hold.wall=false;
    const drag=out.distanceTo(hold.origin);
    if(hold.attached){
      // A pull away from a mounted toy opens the adhesive patch, instead of
      // continually projecting the finger back onto the same wall.
      out.addScaledVector(hold.direction,-Math.min(.085,drag*.9));return true;
    }
    const amount=Math.min(1,Math.max(0,(drag-.012)/.025));if(amount===0)return true;
    let nearest=Infinity,chosen:typeof ROOM_PLANES[number]|undefined;
    const hit=new Vector3(),best=new Vector3();
    for(const wall of ROOM_PLANES.slice(1)){
      const component=ray.direction.getComponent(wall.axis);if(component*wall.sign>=-1e-6)continue;
      const t=(wall.offset*wall.sign-ray.origin.getComponent(wall.axis))/component;if(t<=0||t>=nearest)continue;
      ray.at(t,hit);
      if(hit.y<.018||hit.x<-.185||hit.x>.185||hit.z<-.1401)continue;
      nearest=t;chosen=wall;best.copy(hit);
    }
    if(!chosen)return true;
    const box=this.body.surface.geometry.boundingBox!,{axis,sign}=chosen;
    const edge=sign>0?box.min.getComponent(axis):-box.max.getComponent(axis);
    const skinDepth=Math.max(.007,Math.min(.055,grip.point.getComponent(axis)*sign-edge));
    best.setComponent(axis,best.getComponent(axis)+sign*skinDepth*.76);
    best.y=Math.max(.025,best.y);out.lerp(best,amount);hold.wall=amount>.65;
    return true;
  }
  advance(grip:SurfaceGrip,raw:Vector3,h:number,pressure:number) {
    const hold=this.holds.get(grip);
    if(hold?.press){
      hold.age+=h;
      const depth=hold.depth*(1-Math.exp(-hold.age*12))*(.60+.40*Math.max(0,Math.min(1,pressure)));
      this.target.copy(hold.anchor).add(raw).sub(hold.origin).addScaledVector(hold.direction,depth);
      advanceGrabTarget(grip.target,this.target,h,grip.point);
    } else advanceGrabTarget(grip.target,raw,h,grip.point);
  }
  release(grip:SurfaceGrip) {
    const press=this.holds.get(grip)?.press;this.holds.delete(grip);
    if(!press||this.pressing)return;
    for(const p of this.palm){const i=this.body.grabs.indexOf(p);if(i>=0)this.body.grabs.splice(i,1);}this.palm.length=0;
    // Releasing a squeeze keeps the elastic recovery, without turning the
    // supporting hand's removal into a throw of the entire toy.
    const velocity=this.body.velocity,mean=new Vector3();
    for(let i=0;i<this.body.mass.length;i++)mean.addScaledVector(new Vector3().fromArray(velocity,i*3),this.body.mass[i]/this.body.totalMass);
    for(let i=0;i<velocity.length;i+=3){velocity[i]-=mean.x*.95;velocity[i+1]-=mean.y*.95;velocity[i+2]-=mean.z*.95;}
  }
}
