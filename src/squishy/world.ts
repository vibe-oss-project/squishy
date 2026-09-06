import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { uv,mix,color,floor,mod } from 'three/tsl';
import type { EnvironmentSpec } from './toy.ts';
import { ROOM_PLANES } from '../physics/sticky-world.js';

/** Walls sit just behind ROOM_PLANES, leaving clearance for flush wall art. */
export class PlaygroundWorld {
  readonly group=new THREE.Group();
  private readonly props=new THREE.Group();
  private readonly materials:THREE.Material[]=[];
  private readonly scene:THREE.Scene;
  private readonly light:THREE.DirectionalLight;
  private readonly fill:THREE.HemisphereLight;
  private readonly walls:THREE.Mesh[]=[];
  private readonly art:THREE.InstancedMesh[]=[];
  constructor(scene:THREE.Scene) {
    this.scene=scene;scene.add(this.group);this.group.add(this.props);
    this.light=new THREE.DirectionalLight('#fff6ef',2.3);this.light.position.set(-.14,.26,.18);
    this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);
    Object.assign(this.light.shadow.camera,{left:-.20,right:.20,top:.23,bottom:-.14,near:.01,far:.8});
    this.light.shadow.camera.updateProjectionMatrix();this.light.shadow.normalBias=.00025;this.light.shadow.bias=-.0001;this.light.shadow.radius=3;
    this.fill=new THREE.HemisphereLight('#f9f6ff','#b9a9cb',1.45);
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
  set(spec:EnvironmentSpec,sticky=true) {
    this.clear();this.scene.background=new THREE.Color(spec.background);
    this.fill.intensity=spec.id==='space'?1.3:1.45;this.light.intensity=spec.id==='space'?2.1:2.3;
    const floorMaterial=this.mat(spec.floor);
    if(spec.id==='candy'){
      const tiles=uv().mul(700),check=mod(floor(tiles.x).add(floor(tiles.y)),2);
      floorMaterial.colorNode=mix(color(spec.floor),color('#f6faeb'),check);
    }
    const ground=this.mesh(new THREE.PlaneGeometry(40,40),floorMaterial,0,0,0);ground.rotation.x=-Math.PI/2;
    const wallZ=ROOM_PLANES[1].offset,sideX=-ROOM_PLANES[2].offset;
    if(sticky){
      const back=this.mesh(new THREE.PlaneGeometry(sideX*2+.0006,40),this.mat(spec.wall),0,20,wallZ-.0003);
      const left=this.mesh(new THREE.PlaneGeometry(40,40),this.mat(spec.wall),-sideX-.0003,20,20+wallZ);left.rotation.y=Math.PI/2;
      const right=this.mesh(new THREE.PlaneGeometry(40,40),this.mat(spec.wall),sideX+.0003,20,20+wallZ);right.rotation.y=-Math.PI/2;
      this.walls.push(back,left,right);
      this.mesh(new RoundedBoxGeometry(sideX*2,.003,.0001,2,.00003),this.mat(spec.accent),0,.0015,wallZ-.00015);
    }
    // Ground motifs stay in view around the toy in both open and sticky worlds.
    const padMaterial=new THREE.MeshBasicNodeMaterial({color:new THREE.Color(spec.floor).lerp(new THREE.Color('#ffffff'),.42),toneMapped:false});this.materials.push(padMaterial);
    const pad=this.mesh(new THREE.CircleGeometry(.086,96),padMaterial,0,.000025,0);pad.rotation.x=-Math.PI/2;
    for(const [x,z,r] of [[-.105,.012,.010],[.098,-.034,.008],[-.072,-.068,.006],[.080,.053,.005]]){
      const mark=this.star(spec.accent,x,.00006,z,r,4);mark.rotation.x=-Math.PI/2;mark.scale.z=.001;mark.receiveShadow=false;
    }
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
      for(let i=0;i<p.count;i++){
        p.setX(i,p.getX(i)*1.45);
        p.setY(i,.007+(p.getY(i)-.015)*.64);
        p.setZ(i,(sticky?wallZ:-.22)-.00008+(p.getZ(i)-bounds.min.z)/depth*.00005);
      }
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
      const ink=new THREE.MeshBasicNodeMaterial({color:(mesh.material as THREE.MeshStandardNodeMaterial).color,toneMapped:false});this.materials.push(ink);
      const repeated=new THREE.InstancedMesh(mesh.geometry,ink,6),matrix=new THREE.Matrix4();
      for(let i=0;i<6;i++)repeated.setMatrixAt(i,matrix.makeTranslation(0,(i-1)*.18,0));
      repeated.computeBoundingSphere();this.props.remove(mesh);this.props.add(repeated);this.art.push(repeated);
    }
  }
  follow(height:number) {
    for(const wall of this.walls)wall.position.y=Math.max(20,height);
    const offset=Math.floor(Math.max(0,height-.28)/.18)*.18;
    for(const art of this.art)art.position.y=offset;
    // Keep soft shadows with the toy even far above the initial play area.
    this.light.position.y=Math.max(.26,height+.18);this.light.target.position.y=Math.max(0,height-.06);
    this.light.target.updateMatrixWorld();
  }
  private clear(){this.props.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});this.props.clear();this.walls.length=0;this.art.length=0;for(const m of this.materials)m.dispose();this.materials.length=0;}
  dispose(){this.clear();this.scene.remove(this.group,this.light,this.light.target,this.fill);this.light.shadow.dispose();}
}
