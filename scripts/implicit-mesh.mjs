import { Vector3 } from 'three/webgpu';

/** Indexed marching tetrahedra. Shared grid-edge keys make a closed skin. */
export function implicitMesh(sdf,bounds,spacing=.045) {
  const [lo,hi]=bounds,dims=hi.map((v,i)=>Math.ceil((v-lo[i])/spacing)+1);
  const [nx,ny,nz]=dims,total=nx*ny*nz,values=new Float64Array(total),p=new Vector3();
  const at=(x,y,z)=>x+nx*(y+ny*z),xyz=id=>[lo[0]+(id%nx)*spacing,lo[1]+(Math.floor(id/nx)%ny)*spacing,lo[2]+Math.floor(id/(nx*ny))*spacing];
  for(let i=0;i<total;i++){p.fromArray(xyz(i));values[i]=sdf(p);}
  const positions=[],normals=[],indices=[],edges=new Map();
  const vertex=(a,b)=>{
    const key=a<b?`${a}:${b}`:`${b}:${a}`;if(edges.has(key))return edges.get(key);
    const va=xyz(a),vb=xyz(b),t=values[a]/(values[a]-values[b]);
    p.set(...va.map((v,i)=>v+(vb[i]-v)*t));const pos=p.clone(),eps=spacing*.25;
    const grad=new Vector3(...[0,1,2].map(axis=>{p.copy(pos);p.setComponent(axis,pos.getComponent(axis)+eps);const a=sdf(p);p.setComponent(axis,pos.getComponent(axis)-eps);return a-sdf(p);})).normalize();
    const id=positions.length/3;positions.push(...pos.toArray());normals.push(...grad.toArray());edges.set(key,id);return id;
  };
  const va=new Vector3(),vb=new Vector3(),vc=new Vector3(),cross=new Vector3(),normal=new Vector3();
  const triangle=(a,b,c)=>{
    va.fromArray(positions,a*3);vb.fromArray(positions,b*3);vc.fromArray(positions,c*3);cross.crossVectors(vb.sub(va),vc.sub(va));
    normal.set(normals[a*3]+normals[b*3]+normals[c*3],normals[a*3+1]+normals[b*3+1]+normals[c*3+1],normals[a*3+2]+normals[b*3+2]+normals[c*3+2]);
    if(cross.dot(normal)<0)[b,c]=[c,b];indices.push(a,b,c);
  };
  const corners=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],splits=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const ids=corners.map(([dx,dy,dz])=>at(x+dx,y+dy,z+dz));
    if(ids.every(i=>values[i]>=0)||ids.every(i=>values[i]<0))continue;
    for(const split of splits){
      const inside=split.map(k=>ids[k]).filter(i=>values[i]<0),outside=split.map(k=>ids[k]).filter(i=>values[i]>=0);
      if(inside.length===1||inside.length===3){const [a]=inside.length===1?inside:outside,others=inside.length===1?outside:inside;triangle(...others.map(b=>vertex(a,b)));}
      else if(inside.length===2){const [a,b]=inside,[c,d]=outside,ac=vertex(a,c),ad=vertex(a,d),bc=vertex(b,c),bd=vertex(b,d);triangle(ac,ad,bc);triangle(ad,bd,bc);}
    }
  }
  return {positions,normals,indices};
}
