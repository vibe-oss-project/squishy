import type { SoftBody } from '../physics/soft-body.js';

/** Facial feedback follows local strain and impacts, independent of rotation. */
export class SquishyExpression {
  blink=0;squeeze=0;delight=0;time=0;
  private previousHeld=false;
  private released=10;
  private readonly samples:{a:number;b:number;length:number}[]=[];
  constructor(body:SoftBody) {
    const stride=Math.max(1,Math.floor(body.edges.length/80));
    for(let i=0;i<body.edges.length;i+=stride){
      const [a,b]=body.edges[i],r=body.rest;
      this.samples.push({a:a*3,b:b*3,length:Math.hypot(r[a*3]-r[b*3],r[a*3+1]-r[b*3+1],r[a*3+2]-r[b*3+2])});
    }
  }
  update(dt:number,body:SoftBody) {
    this.time+=dt;const held=body.grabs.length>0;
    if(this.previousHeld&&!held)this.released=0;
    this.previousHeld=held;this.released+=dt;
    let strain=0;const x=body.x;
    for(const {a,b,length} of this.samples){const ratio=Math.hypot(x[a]-x[b],x[a+1]-x[b+1],x[a+2]-x[b+2])/length;strain+=Math.abs(Math.log(Math.max(.1,ratio)));}
    strain/=this.samples.length;
    const target=Math.min(1,strain*5+(body.world?.impact??0)*.2);
    this.squeeze+=(target-this.squeeze)*(1-Math.exp(-dt*12));
    const happy=this.released<1.5?Math.sin(Math.PI*this.released/1.5)*.85:held?.12:0;
    this.delight+=(happy-this.delight)*(1-Math.exp(-dt*7));
    const phase=this.time%4.7;this.blink=phase<.18?Math.sin(phase/.18*Math.PI):0;
  }
  reset(){this.blink=0;this.squeeze=0;this.delight=0;this.time=0;this.previousHeld=false;this.released=10;}
}
