// Implicit sculpting definitions in rest space. A single watertight skin and
// volumetric cage include ears, paws, burger layers and other appendages.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,k)=>{const h=clamp(.5+.5*(b-a)/k,0,1);return b+(a-b)*h-k*h*(1-h);};
const ellipsoid=(p,c,r)=>{
  const x=p.x-c[0],y=p.y-c[1],z=p.z-c[2];
  const a=Math.hypot(x/r[0],y/r[1],z/r[2]);
  const b=Math.hypot(x/(r[0]*r[0]),y/(r[1]*r[1]),z/(r[2]*r[2]));
  return b>1e-12?a*(a-1)/b:-Math.min(...r);
};
const box=(p,c,r,round=.08)=>{
  const x=Math.abs(p.x-c[0])-r[0]+round,y=Math.abs(p.y-c[1])-r[1]+round,z=Math.abs(p.z-c[2])-r[2]+round;
  return Math.hypot(Math.max(x,0),Math.max(y,0),Math.max(z,0))+Math.min(Math.max(x,y,z),0)-round;
};
const oval=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<1;
const dark='#27252c',white='#fffafa',pink='#ee94bb',orange='#f9a048';

export function sculpt(id) {
  const parts=[];
  const e=(c,r,color,k=.07)=>parts.push({field:p=>ellipsoid(p,c,r),color,k});
  const b=(c,r,color,k=.04,round=.08)=>parts.push({field:p=>box(p,c,r,round),color,k});
  // A rounded tapered ear, with its point above its base.
  const ear=(x,y,z,width,height,depth,color)=>parts.push({color,k:.055,field:p=>{
    const t=clamp((p.y-y)/height,0,1),rx=width*(1-.86*t);
    return Math.max(ellipsoid(p,[x,y+height*.4,z],[rx,height*.64,depth]),y-height*.18-p.y);
  }});
  let paint=(_p,c)=>c;
  let face={x:.28,y:1.33,eye:.05,noseY:1.25,mouthY:1.18,mouth:'dot',eyes:'round',ink:dark,nose:dark,blush:0};
  if(id==='panda') {
    e([0,1.02,0],[.91,1.08,.68],white);
    for(const s of [-1,1]){e([s*.71,1.89,-.02],[.28,.31,.23],dark,.03);e([s*.81,.62,.18],[.16,.36,.22],dark,.025);e([s*.42,.035,.3],[.22,.14,.27],dark,.03);}
    paint=(p,c)=>p.y>.84&&p.y<1.0?dark:c;
    face={...face,x:.36,y:1.36,eye:.085,noseY:1.27,mouthY:1.20,mouth:'w',blush:.075};
  } else if(id==='hamster') {
    e([0,1.0,0],[.8,1.0,.57],orange);
    e([0,.57,.405],[.58,.59,.23],white,.1);
    for(const s of [-1,1]){
      e([s*.46,1.92,0],[.25,.25,.18],orange,.035);
      e([s*.40,.95,.45],[.30,.22,.17],white,.04);
      e([s*.56,.70,.53],[.18,.17,.15],orange,.04);
      e([s*.37,.26,.4],[.20,.25,.19],white,.07);
    }
    e([0,1.11,.53],[.20,.20,.2],orange,.05);
    paint=(p,c)=>p.z>.05&&([-1,1].some(s=>oval(p.x,p.y,s*.46,1.95,.175,.165))||[-1,1].some(s=>oval(p.x,p.y,s*.09,1.65,.045,.18)))?white:c;
    face={...face,x:.33,y:1.14,eye:.075,noseY:1.0,mouthY:.96,eyes:'sleep',mouth:'tiny',blush:.04,nose:'#734b35'};
  } else if(id==='sleepy') {
    e([0,.76,0],[.63,.76,.46],dark);
    e([0,1.70,.025],[.64,.64,.50],dark,.035);
    for(const s of [-1,1]){ear(s*.45,2.07,-.08,.19,.31,.18,dark);e([s*.64,1.35,-.02],[.19,.34,.23],dark,.045);e([s*.34,.02,.02],[.16,.22,.22],dark,.06);}
    e([0,1.70,.50],[.19,.16,.11],white,.02);
    face={...face,x:.26,y:1.85,eye:.072,noseY:1.81,mouthY:1.69,eyes:'sleep',mouth:'none',ink:white,nose:'#ec558e'};
  } else if(id==='burger') {
    e([0,.17,0],[.91,.20,.75],orange,.035);
    e([0,.38,0],[.91,.14,.76],'#483231',.03);
    b([0,.51,0],[.93,.085,.76],'#ffc659',.035,.09);
    e([0,.64,0],[.92,.15,.77],'#443132',.025);
    e([0,.81,0],[.95,.13,.79],'#a4d85e',.025);
    e([0,.93,0],[.92,.10,.76],'#ec6b62',.025);
    e([0,1.13,0],[.94,.44,.77],orange,.03);
    for(const s of [-1,1])ear(s*.64,1.38,.14,.22,.38,.20,orange);
    // The cheese corner folds down over the front patty.
    parts.push({color:'#ffd066',k:.025,field:p=>Math.max(Math.abs(p.z-.75)-.045,box(p,[0,.40,.75],[.28,.20,.10],.03),Math.abs(p.x)-(.06+Math.max(0,p.y-.2)*.8))});
    face={...face,x:.44,y:1.22,eye:.075,noseY:1.25,mouthY:1.13,mouth:'w'};
  } else if(id==='milk') {
    // Rounded carton with a gable roof and a narrow folded seam.
    parts.push({color:pink,k:.025,field:p=>{
      const base=box(p,[0,1.00,0],[.63,.97,.49],.065);
      return Math.max(base,(p.y+Math.abs(p.z)*1.08-2.0)*.68);
    }});
    b([0,2.00,0],[.615,.135,.065],pink,.015,.04);
    paint=(p,c)=>{
      if(p.y<.14||(p.y>.26&&p.y<.68+.035*Math.sin(p.x*21+p.z*24)))return white;
      // A heart on both side panels, cut as two lobes over a tapered point.
      const x=p.z/.26,y=(p.y-1.21)/.34;
      if(Math.abs(p.x)>.56&&((x*x+y*y-1)**3-x*x*y*y*y)<0)return white;
      return c;
    };
    face={...face,x:.30,y:1.22,eye:.081,noseY:1.1,mouthY:1.07,mouth:'w',nose:'none',blush:.07};
  } else if(id==='fluffy') {
    e([0,.87,0],[.77,.91,.52],white);
    for(const s of [-1,1])e([s*.43,1.66,-.02],[.15,.18,.16],white,.07);
    e([0,-.01,.08],[.24,.17,.26],white,.05);
    face={...face,x:.235,y:1.36,eye:.029,noseY:1.32,mouthY:1.25};
  } else if(id==='bunny') {
    e([0,.64,0],[.84,.67,.53],'#fce1e9');
    for(const s of [-1,1]){e([s*.28,1.53,-.01],[.195,.48,.185],'#fce1e9',.075);e([s*.23,.015,.22],[.25,.12,.24],'#fce1e9',.06);}
    face={...face,x:.255,y:.73,eye:.049,noseY:.65,mouthY:.56};
  } else if(id==='seal') {
    e([0,.46,-.03],[.63,.47,1.03],'#f6f4fc');
    e([0,.39,.64],[.49,.36,.48],'#f6f4fc',.1);
    for(const s of [-1,1]){e([s*.21,.38,-.99],[.25,.12,.37],'#f6f4fc',.08);e([s*.58,.18,-.07],[.22,.09,.32],'#f6f4fc',.08);}
    face={...face,x:.255,y:.41,eye:.039,noseY:.35,mouthY:.29,mouth:'seal'};
  } else if(id==='chick') {
    e([0,.80,0],[.70,.83,.56],'#ffe679');
    for(const s of [-1,1]){e([s*.66,.90,0],[.15,.29,.22],'#f9dc65',.045);e([s*.48,.035,.15],[.20,.12,.23],'#fbc567',.03);}
    e([0,1.21,.535],[.104,.071,.09],'#f39662',.025);
    paint=(p,c)=>p.y<.4&&c==='#ffe679'?'#ffda79':c;
    face={...face,x:.265,y:1.29,eye:.03,nose:'none',mouth:'none'};
  } else if(id==='cheeks') {
    const c='#f6b0c2';
    e([0,.78,0],[.77,.78,.51],c);
    for(const s of [-1,1]){e([s*.41,1.45,-.02],[.19,.19,.16],c,.06);e([s*.53,.97,.28],[.34,.34,.27],c,.1);e([s*.46,.38,.30],[.25,.30,.27],c,.07);e([s*.32,.55,.47],[.25,.13,.15],c,.04);}
    e([0,.9,.49],[.2,.18,.11],c,.04);e([0,.0,.08],[.12,.12,.15],c,.025);
    parts.push({color:'#ffd1cc',k:.018,field:p=>Math.max(Math.abs(p.z-.58)-.08,box(p,[0,.47,.58],[.31,.32,.10],.06),Math.abs(p.x)-(.08+Math.max(0,p.y-.15)*.52))});
    paint=(p,col)=>col==='#ffd1cc'&&p.z>.63&&[[.1,.63,.045],[-.13,.54,.04],[.035,.39,.055],[-.03,.24,.03]].some(([x,y,r])=>oval(p.x,p.y,x,y,r,r))?'#efb9b6':col;
    face={...face,x:.32,y:1.19,eye:.046,nose:'none',mouth:'none'};
  } else throw new Error(`Unknown sculpt: ${id}`);
  const sdf=p=>{let d=Infinity;for(const part of parts){const a=part.field(p);d=Number.isFinite(d)?smooth(d,a,part.k):a;}return d;};
  const color=p=>{let best=Infinity,c=white;for(const part of parts){const d=part.field(p);if(d<best){best=d;c=part.color;}}return paint(p,c);};
  return {sdf,color,face,bounds:[[-1.22,-.32,-1.48],[1.22,2.56,1.32]]};
}
