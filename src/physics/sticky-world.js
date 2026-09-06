// Local contact patches shared by JS and the native XPBD solver. The native
// kernel calls these hooks between elastic/grab iterations, on its own arrays.
// Adhesion is a finite-force, finite-lived bond; it never freezes the whole toy.
export const MAX_BONDS=48;
export const ROOM_PLANES=[
  {axis:1,sign:1,offset:.00015,name:'floor'},
  {axis:2,sign:1,offset:-.14,name:'back'},
  {axis:0,sign:1,offset:-.185,name:'left'},
  {axis:0,sign:-1,offset:-.185,name:'right'},
];
export const OPEN_PLANES=ROOM_PLANES.slice(0,1);

export class StickyWorld {
  constructor(body,{strength=0,grip=1,friction=1,planes=ROOM_PLANES}={}) {
    this.body=body;this.strength=strength;this.grip=grip;this.friction=friction;this.planes=planes;
    this.bonds=new Map();this.time=0;this.grounded=false;this.impact=0;this.peeled=0;
    const count=body.contacts.length*planes.length;
    this.normal=new Float64Array(count);this.incoming=new Float64Array(count);this.cooldown=new Float64Array(count);
    this.delta=new Float64Array(3);this.point=new Float64Array(3);this.anchorPoint=new Float64Array(3);
    this.low=new Float64Array(3);this.high=new Float64Array(3);this.active=[];this.axes=[];
  }
  get attached(){return this.bonds.size;}
  get wallAttached(){let count=0;for(const bond of this.bonds.values())if(this.planes[bond.plane].name!=='floor')count++;return count;}
  sample(c,out,array=this.body.x) {
    out.fill(0);for(const [id,w] of c.weights)for(let a=0;a<3;a++)out[a]+=array[id*3+a]*w;return out;
  }
  openingTraction(point,plane) {
    const {axis,sign}=plane;let pull=0;
    for(const grab of this.body.grabs){
      if(!grab.peel)continue;
      const opening=sign*(grab.target.getComponent(axis)-grab.point.getComponent(axis));
      if(opening<=.002)continue;
      let tangent=0;
      for(let a=0;a<3;a++)if(a!==axis)tangent+=(grab.point.getComponent(a)-point[a])**2;
      pull=Math.max(pull,Math.min(1,(opening-.002)/.006)/(1+tangent/.0025));
    }
    return pull;
  }
  begin(h) {
    this.time+=h;this.normal.fill(0);this.grounded=false;this.impact=0;this.peeled=0;
    const {contacts,velocity}=this.body;
    for(let i=0;i<contacts.length;i++){
      const p=this.sample(contacts[i],this.point,velocity);
      for(let j=0;j<this.planes.length;j++)this.incoming[i*this.planes.length+j]=p[this.planes[j].axis]*this.planes[j].sign;
    }
    for(const [key,bond] of this.bonds){
      bond.lambda.fill(0);
      if(this.time-bond.created>6+this.strength*6){this.detach(key);continue;}
      const pull=this.openingTraction(bond.anchor,this.planes[bond.plane]);
      // Sustained opening traction damages nearby bonds first, allowing a
      // soft toy to peel without weakening an untouched wall attachment.
      bond.damage=Math.min(1,bond.damage+h*12*pull);
      if(bond.damage>=1)this.detach(key);
    }
  }
  detach(key) {this.bonds.delete(key);this.cooldown[key]=this.time+.35;this.peeled++;}
  solve(h) {
    const {contacts,x,inverseMass,contact}=this.body,count=this.planes.length;
    // A barycentric skin point lies inside the cage bounds. Cull only entire
    // planes proven unreachable by the CURRENT cage after the elastic/grab
    // pass; this remains conservative even for a very abrupt throw.
    this.low.fill(Infinity);this.high.fill(-Infinity);this.active.length=0;this.axes.length=0;
    for(let i=0;i<x.length;i+=3)for(let a=0;a<3;a++){this.low[a]=Math.min(this.low[a],x[i+a]);this.high[a]=Math.max(this.high[a],x[i+a]);}
    for(let j=0;j<count;j++){
      const {axis,sign,offset}=this.planes[j],near=sign>0?this.low[axis]:-this.high[axis];
      if(near-offset<.00066){this.active.push(j);if(!this.axes.includes(axis))this.axes.push(axis);}
    }
    for(let i=0;this.active.length&&i<contacts.length;i++){
      const c=contacts[i];this.point.fill(0);let complete=false;
      for(const [id,w] of c.weights)for(const a of this.axes)this.point[a]+=x[id*3+a]*w;
      for(const j of this.active){
        const plane=this.planes[j],{axis,sign,offset}=plane,key=i*count+j;
        const distance=sign*this.point[axis]-offset;
        if(distance>=.00065)continue;
        if(this.strength>0&&!complete){this.sample(c,this.point);complete=true;}
        if(distance<0){
          const depth=-distance;this.normal[key]+=depth;
          for(const [id,w] of c.weights){x[id*3+axis]+=inverseMass[id]*w*depth*sign/c.denominator;contact[id]+=depth*w;}
          this.point[axis]+=depth*sign;
        }
        if(plane.name==='floor')this.grounded=true;
        if(this.strength<=0||this.grip<=0||this.bonds.size>=MAX_BONDS||this.bonds.has(key)||this.cooldown[key]>this.time)continue;
        // An opening patch cannot make fresh bonds while it is being peeled.
        if(this.openingTraction(this.point,plane)>.04)continue;
        // Space bonds over the contact patch. Dense visual vertices must not
        // artificially multiply total adhesion or all attach to one spot.
        let nearby=false;
        for(const bond of this.bonds.values())if(bond.plane===j&&Math.hypot(bond.anchor[0]-this.point[0],bond.anchor[1]-this.point[1],bond.anchor[2]-this.point[2])<.004){nearby=true;break;}
        if(nearby)continue;
        const anchor=this.point.slice();anchor[axis]=offset*sign;
        this.bonds.set(key,{contact:i,plane:j,anchor,created:this.time,damage:0,lambda:new Float64Array(3)});
      }
    }
    const stiffness=(18+24*this.strength)*this.grip,alpha=1/(Math.max(.1,stiffness)*h*h);
    const maxForce=Math.max(.010,this.body.totalMass*this.body.phys.gravity*(10+18*this.strength)*this.grip/MAX_BONDS);
    for(const [key,bond] of this.bonds){
      const c=contacts[bond.contact],p=this.sample(c,this.anchorPoint),age=this.time-bond.created;
      const fade=Math.min(1,(6+this.strength*6-age)/.7);
      const surface=this.planes[bond.plane].name==='floor'?.4:1;
      const force=maxForce*surface*Math.max(.05,fade)*(1-bond.damage)**2*(age<.08?1.8:1);
      const dl=this.delta;let force2=0,distance2=0;
      for(let a=0;a<3;a++){
        const delta=p[a]-bond.anchor[a];distance2+=delta*delta;
        dl[a]=(-delta-alpha*bond.lambda[a])/(c.denominator+alpha);
        force2+=(bond.lambda[a]+dl[a])**2/(h*h*h*h);
      }
      if(distance2>.012**2||(force2>force*force&&distance2>.0012**2)){this.detach(key);continue;}
      for(let a=0;a<3;a++){
        bond.lambda[a]+=dl[a];
        for(const [id,w] of c.weights)x[id*3+a]+=inverseMass[id]*w*dl[a];
      }
    }
  }
  frictionPass() {
    const {contacts,x,previous,inverseMass,phys}=this.body;
    for(let i=0;i<contacts.length;i++)for(let j=0;j<this.planes.length;j++){
      const key=i*this.planes.length+j,depth=this.normal[key];if(depth<=0)continue;
      const c=contacts[i],plane=this.planes[j],delta=this.point;delta.fill(0);
      for(const [id,w] of c.weights)for(let a=0;a<3;a++)if(a!==plane.axis)delta[a]+=(x[id*3+a]-previous[id*3+a])*w;
      const tangent=Math.hypot(...delta),friction=tangent<phys.staticFriction*this.friction*depth?1:Math.min(1,phys.dynamicFriction*this.friction*depth/(tangent+1e-20));
      for(const [id,w] of c.weights)for(let a=0;a<3;a++)x[id*3+a]-=delta[a]*inverseMass[id]*w*friction/c.denominator;
      this.impact=Math.max(this.impact,-this.incoming[key]);
    }
    return this.grounded?1:0;
  }
  velocityPass() {
    const {contacts,velocity,inverseMass,phys}=this.body;
    for(let i=0;i<contacts.length;i++)for(let j=0;j<this.planes.length;j++){
      const key=i*this.planes.length+j,incoming=this.incoming[key];if(this.normal[key]<=0||incoming>=0)continue;
      const c=contacts[i],{axis,sign}=this.planes[j];let speed=0;
      for(const [id,w] of c.weights)speed+=velocity[id*3+axis]*w*sign;
      const bounce=incoming<-.18&&!this.bonds.has(key)?-incoming*phys.restitution:0,impulse=Math.max(0,bounce-speed)/c.denominator;
      for(const [id,w] of c.weights)velocity[id*3+axis]+=inverseMass[id]*w*impulse*sign;
    }
  }
  reset() {this.bonds.clear();this.cooldown.fill(0);this.normal.fill(0);this.time=0;this.grounded=false;this.impact=0;this.peeled=0;}
}
