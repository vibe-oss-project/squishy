import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { uv,mix,color,floor,mod } from 'three/tsl';
import type { EnvironmentSpec } from './toy.ts';

/** Walls sit just behind ROOM_PLANES, leaving clearance for flush wall art. */
export class PlaygroundWorld {
  readonly group=new THREE.Group();
  private readonly props=new THREE.Group();
  private readonly materials:THREE.Material[]=[];
  private readonly scene:THREE.Scene;
  private readonly light:THREE.DirectionalLight;
  private readonly fill:THREE.HemisphereLight;
  constructor(scene:THREE.Scene) {
    this.scene=scene;scene.add(this.group);this.group.add(this.props);
    this.light=new THREE.DirectionalLight('#fff6ef',3.1);this.light.position.set(-.14,.26,.18);
    this.light.castShadow=true;this.light.shadow.mapSize.set(1024,1024);
    Object.assign(this.light.shadow.camera,{left:-.20,right:.20,top:.23,bottom:-.14,near:.01,far:.8});
    this.light.shadow.camera.updateProjectionMatrix();this.light.shadow.normalBias=.00025;this.light.shadow.bias=-.0001;this.light.shadow.radius=3;
    this.fill=new THREE.HemisphereLight('#f9f6ff','#b9a9cb',2.2);
    scene.add(this.light,this.light.target,this.fill);
  }
  private mat(c:string,roughness=.8) {
    const m=new THREE.MeshStandardNodeMaterial({color:c,roughness});this.materials.push(m);return m;
  }
  private mesh(g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number,shadow=false) {
    const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;this.props.add(mesh);return mesh;
  }
  private sphere(c:string,x:number,y:number,z:number,rx:number,ry=rx,rz=rx) {
    const mesh=this.mesh(new THREE.SphereGeometry(1,24,16),this.mat(c),x,y,z,true);mesh.scale.set(rx,ry,rz);return mesh;
  }
  private cloud(c:string,x:number,y:number,z:number,s:number) {
    for(const [dx,dy,r] of [[-.55,0,.46],[0,.24,.62],[.57,.03,.43]])this.sphere(c,x+dx*s,y+dy*s,z,r*s,r*s*.76,s*.21);
  }
  private star(c:string,x:number,y:number,z:number,r:number,points=5) {
    const shape=new THREE.Shape();
    for(let i=0;i<points*2;i++){const a=i*Math.PI/points+Math.PI/2,d=i%2?r*.48:r;const px=Math.cos(a)*d,py=Math.sin(a)*d;if(i)shape.lineTo(px,py);else shape.moveTo(px,py);}
    shape.closePath();
    return this.mesh(new THREE.ExtrudeGeometry(shape,{depth:r*.15,bevelEnabled:true,bevelSize:r*.09,bevelThickness:r*.06,bevelSegments:2,steps:1}),this.mat(c,.6),x,y,z);
  }
  set(spec:EnvironmentSpec) {
    this.clear();this.scene.background=new THREE.Color(spec.background);
    this.fill.intensity=spec.id==='space'?1.8:2.2;this.light.intensity=spec.id==='space'?2.4:3.1;
    const floorMaterial=this.mat(spec.floor);
    if(spec.id==='candy'){
      const tiles=uv().mul(22),check=mod(floor(tiles.x).add(floor(tiles.y)),2);
      floorMaterial.colorNode=mix(color(spec.floor),color('#f6faeb'),check);
    }
    const ground=this.mesh(new THREE.PlaneGeometry(.9,.9),floorMaterial,0,0,0);ground.rotation.x=-Math.PI/2;
    const back=this.mesh(new THREE.PlaneGeometry(.2506,.45),this.mat(spec.wall),0,.225,-.0873);back.receiveShadow=true;
    const left=this.mesh(new THREE.PlaneGeometry(.52,.45),this.mat(spec.wall),-.1253,.225,.1727);left.rotation.y=Math.PI/2;
    const right=this.mesh(new THREE.PlaneGeometry(.52,.45),this.mat(spec.wall),.1253,.225,.1727);right.rotation.y=-Math.PI/2;
    // Small bevelled skirting visually locates the sticky walls.
    this.mesh(new RoundedBoxGeometry(.248,.006,.0001,2,.00003),this.mat(spec.accent),0,.003,-.08715);
    for(const s of [-1,1])this.mesh(new RoundedBoxGeometry(.0001,.006,.3,2,.00003),this.mat(spec.accent),s*.12515,.003,.063);
    const decalStart=this.props.children.length;
    if(spec.id==='cloud'){
      this.cloud('#fffdf9',-.064,.112,-.078,.037);this.cloud('#f7f3ff',.075,.152,-.078,.028);
      this.star('#ffeeb0',.066,.095,-.075,.010);this.star('#f1bddc',-.064,.173,-.077,.006,4);
      for(const [x,y] of [[-.10,.062],[.032,.16],[.108,.135]])this.sphere('#f5f5ff',x,y,-.079,.0025);
      // Rainbow arc, confined to the wall decoration plane.
      for(let i=0;i<3;i++){
        const arc=this.mesh(new THREE.TorusGeometry(.031-i*.005,.0022,8,40,Math.PI),this.mat(['#f1b7d7','#fff0b6','#b9ded0'][i]),-.016,.162,-.082);
        arc.rotation.z=0;
      }
    } else if(spec.id==='room') {
      const frame=this.mesh(new RoundedBoxGeometry(.065,.074,.004,3,.008),this.mat('#f8eee9'),-.066,.115,-.081);
      frame.castShadow=true;
      this.mesh(new RoundedBoxGeometry(.052,.059,.003,3,.005),this.mat('#bbdbed'),-.066,.115,-.0775);
      this.mesh(new THREE.BoxGeometry(.003,.059,.002),this.mat('#f8eee9'),-.066,.115,-.075);
      this.mesh(new THREE.BoxGeometry(.052,.003,.002),this.mat('#f8eee9'),-.066,.115,-.075);
      this.star('#fff0ac',.065,.140,-.078,.016);
      this.mesh(new RoundedBoxGeometry(.054,.004,.016,2,.001),this.mat('#be9fc8'),.064,.084,-.076);
      for(let i=0;i<3;i++)this.mesh(new RoundedBoxGeometry(.009,.021+i*.004,.009,2,.001),this.mat(['#edd089','#c0dfc4','#f1b1c8'][i]),.052+i*.011,.097+i*.002,-.078);
      this.cloud('#f6edf7',.08,.179,-.077,.022);
    } else if(spec.id==='candy') {
      for(let i=0;i<9;i++){
        const strip=this.mesh(new THREE.PlaneGeometry(.0278,.035),this.mat(i%2?'#fff6ed':'#efa2bd'),-.111+i*.0278,.183,-.083);
        strip.rotation.x=.08;
        this.sphere(i%2?'#fff6ed':'#efa2bd',-.111+i*.0278,.166,-.080,.0138,.005,.004);
      }
      for(const s of [-1,1]){
        this.mesh(new THREE.CylinderGeometry(.0017,.0017,.047,10),this.mat('#fff8ec'),s*.087,.077,-.078);
        this.sphere(s<0?'#c5d5f6':'#f6b5ca',s*.087,.11,-.076,.017,.017,.006);
        this.sphere('#fff1cd',s*.087,.11,-.068,.008,.008,.003);
      }
      this.star('#f9e19b',0,.15,-.077,.01,4);
    } else if(spec.id==='beach') {
      this.sphere('#ffe6a1',.068,.146,-.078,.025,.025,.004);
      this.cloud('#f7ffff',-.064,.164,-.078,.032);
      for(let i=0;i<3;i++){
        const wave=new THREE.CatmullRomCurve3(Array.from({length:41},(_,k)=>new THREE.Vector3(-.12+k*.006,.056+i*.010+Math.sin(k*.33+i)*.004,-.082)));
        this.mesh(new THREE.TubeGeometry(wave,60,.0012,6,false),this.mat(['#a3d4d7','#b3dfe0','#dcf2e9'][i]),0,0,0);
      }
      this.star('#f0b79d',-.080,.019,-.073,.012);
      for(let i=0;i<5;i++)this.sphere('#ead4ae',.077+i*.003,.005+Math.sin(i/4*Math.PI)*.004,-.070,.004,.003,.003);
    } else {
      const moon=this.mesh(new THREE.TorusGeometry(.019,.005,12,40,Math.PI*1.55),this.mat('#ffefbd'),-.063,.148,-.078);moon.rotation.z=-.85;
      for(const [x,y,r,c] of [[.064,.153,.012,'#edd5ff'],[.099,.100,.005,'#f5d9e9'],[-.095,.084,.007,'#edc6e5'],[.019,.110,.004,'#ffefc2'],[-.014,.187,.006,'#dedaf8']] as const)this.star(c,x,y,-.078,r);
      const planet=this.sphere('#cbacd9',.059,.071,-.075,.012,.012,.007);
      const ring=this.mesh(new THREE.TorusGeometry(.019,.0018,8,36),this.mat('#f2dfad'),planet.position.x,planet.position.y,-.072);ring.rotation.x=1.15;ring.rotation.y=.2;
      for(let i=0;i<17;i++)this.sphere('#f2e6ff',Math.sin(i*12.3)*.113,.048+(i%6)*.025,-.081,.0009);
    }
    // Wall illustrations are flush decals, not solid obstacles poking through
    // the collision plane. The toy always remains in front of the artwork.
    for(const object of this.props.children.slice(decalStart)){
      const mesh=object as THREE.Mesh;mesh.updateMatrix();mesh.geometry.applyMatrix4(mesh.matrix);
      const p=mesh.geometry.attributes.position;mesh.geometry.computeBoundingBox();
      const bounds=mesh.geometry.boundingBox!,depth=Math.max(.000001,bounds.max.z-bounds.min.z);
      for(let i=0;i<p.count;i++)p.setZ(i,-.08708+(p.getZ(i)-bounds.min.z)/depth*.00005);
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
      mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);mesh.castShadow=false;
    }
  }
  private clear(){this.props.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.props.clear();for(const m of this.materials)m.dispose();this.materials.length=0;}
  dispose(){this.clear();this.scene.remove(this.group,this.light,this.light.target,this.fill);this.light.shadow.dispose();}
}
