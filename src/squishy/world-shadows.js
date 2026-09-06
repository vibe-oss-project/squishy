import { Fn,texture,vec2,reference,renderGroup } from 'three/tsl';

// Fixed weighted samples in shadow-map space: a soft edge without a pattern
// that changes at every screen pixel as the camera or the toy moves.
const softStudioShadow=Fn(({depthTexture,shadowCoord,shadow,depthLayer})=>{
  const size=reference('mapSize','vec2',shadow).setGroup(renderGroup);
  const radius=reference('radius','float',shadow).setGroup(renderGroup);
  const texel=vec2(1).div(size).mul(radius);
  const sample=(x,y)=>{
    let depth=texture(depthTexture,shadowCoord.xy.add(vec2(x,y).mul(texel)));
    if(depthTexture.isArrayTexture)depth=depth.depth(depthLayer);
    return depth.compare(shadowCoord.z);
  };
  let result=sample(0,0).mul(.2);
  for(let i=0;i<4;i++){
    const angle=(i+.5)*Math.PI/2;
    result=result.add(sample(Math.cos(angle)*.4,Math.sin(angle)*.4).mul(.1));
  }
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    result=result.add(sample(Math.cos(angle)*.9,Math.sin(angle)*.9).mul(.05));
  }
  return result;
});

export function softenStudioShadow(shadow){shadow.filterNode=softStudioShadow;shadow.radius=5.5;}
