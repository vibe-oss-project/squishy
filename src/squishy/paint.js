import { attribute,vec3,float,color,mix,min,max,smoothstep } from 'three/tsl';
import { sculpt } from './shapes.js';

// Paint is evaluated per fragment in rest space. The transitions no longer
// follow individual triangles, and fwidth keeps edges smooth at every zoom.
export function sculptPaint(id,{scale,bottom}) {
  const parts=sculpt(id).parts;
  if(parts.every(part=>part.color===parts[0].color))return color(parts[0].color);
  const p=attribute('restPosition','vec3').div(scale).add(vec3(0,bottom,0));
  const inside=d=>{const aa=max(d.fwidth(),.00005);return float(1).sub(smoothstep(aa.negate(),aa,d));};
  const ellipse=(center,radius)=>{
    const q=p.sub(vec3(...center)),r=Array.isArray(radius)?vec3(...radius):radius;
    const a=q.div(r).length(),b=q.div(r.mul(r)).length();
    return a.mul(a.sub(1)).div(max(b,.000001));
  };
  const box=(center,radius,round)=>{
    const q=p.sub(vec3(...center)).abs().sub(vec3(...radius)).add(round);
    return max(q,vec3(0)).length().add(min(max(q.x,max(q.y,q.z)),0)).sub(round);
  };
  const oval=(x,y,rx,ry)=>{
    const dx=p.x.sub(x).div(rx),dy=p.y.sub(y).div(ry);
    return inside(dx.mul(dx).add(dy.mul(dy)).sub(1));
  };
  const field=part=>{
    if(part.kind==='ellipsoid')return ellipse(part.c,part.r);
    if(part.kind==='box')return box(part.c,part.r,part.round);
    if(part.kind==='ear'){
      const t=p.y.sub(part.y).div(part.height).clamp(),rx=float(part.width).mul(float(1).sub(t.mul(.86)));
      return max(ellipse([part.x,part.y+part.height*.4,part.z],vec3(rx,part.height*.64,part.depth)),float(part.y-part.height*.18).sub(p.y));
    }
    if(part.kind==='carton')return max(box([0,1,0],[.63,.97,.49],.065),p.y.add(p.z.abs().mul(1.08)).sub(2).mul(.68));
    if(part.kind==='burger-cheese')return max(max(p.z.sub(.75).abs().sub(.045),box([0,.40,.75],[.28,.20,.10],.03)),p.x.abs().sub(max(p.y.sub(.2),0).mul(.8).add(.06)));
    return max(max(p.z.sub(.58).abs().sub(.08),box([0,.47,.58],[.31,.32,.10],.06)),p.x.abs().sub(max(p.y.sub(.15),0).mul(.52).add(.08)));
  };
  let nearest=null,paint=null;
  for(const part of parts){
    const distance=field(part);let ink=color(part.color);
    if(id==='chick'&&part.color==='#ffe679')ink=mix(ink,color('#ffda79'),inside(p.y.sub(.4)));
    if(id==='cheeks'&&part.kind==='hamster-cheese'){
      let holes=float(0);for(const [x,y,r] of [[.1,.63,.045],[-.13,.54,.04],[.035,.39,.055],[-.03,.24,.03]])holes=max(holes,oval(x,y,r,r));
      ink=mix(ink,color('#efb9b6'),holes.mul(inside(float(.63).sub(p.z))));
    }
    if(nearest===null){nearest=distance;paint=ink;}
    else {paint=mix(paint,ink,inside(distance.sub(nearest)));nearest=min(nearest,distance);}
  }
  if(id==='panda')paint=mix(paint,color('#27252c'),inside(float(.84).sub(p.y)).mul(inside(p.y.sub(1))));
  if(id==='hamster'){
    let markings=float(0);
    for(const sign of [-1,1])markings=max(markings,max(oval(sign*.46,1.95,.175,.165),oval(sign*.09,1.65,.045,.18)));
    paint=mix(paint,color('#fffafa'),markings.mul(inside(float(.05).sub(p.z))));
  }
  if(id==='milk'){
    const wave=p.x.mul(21).add(p.z.mul(24)).sin().mul(.035).add(.68);
    let markings=max(inside(p.y.sub(.14)),inside(float(.26).sub(p.y)).mul(inside(p.y.sub(wave))));
    const x=p.z.div(.26),y=p.y.sub(1.21).div(.34),base=x.mul(x).add(y.mul(y)).sub(1);
    const heart=base.mul(base).mul(base).sub(x.mul(x).mul(y.mul(y).mul(y)));
    markings=max(markings,inside(heart).mul(inside(float(.56).sub(p.x.abs()))));
    paint=mix(paint,color('#fffafa'),markings);
  }
  return paint;
}
