import { PHYS } from '../physics/constants.js';

// These are game material presets, not measured properties or seller claims.
const classic={...PHYS,iterations:4,density:280,shear:380,bulk:2600,damping:34,restitution:.055,maxGrabForce:1.5};
const mochi={...PHYS,iterations:4,density:980,shear:580,bulk:26000,damping:7,restitution:.1,maxGrabForce:2.8};
const item=(id,name,slug,family,tint,description,physics,adhesion)=>({
  id,name,slug,family,tint,description,physics,adhesion,
  source:`https://squishy-official.com/produit/${slug}/`,
  photo:`/references/${slug}.jpg`,
});

export const SQUISHIES=[
  item('panda','Original Panda','squishy-panda-original','classic','#e1eaf9','A little panda. A great big cuddle.',{...classic},0),
  item('hamster','Kawaii Hamster','squishy-hamster-kawaii','classic','#ffe2b3','The sweetest little cheeks.',{...classic,shear:310,damping:44},0),
  item('sleepy','Sleepy Cat','squishy-chat-endormi','classic','#ddd9f2','Just five more little minutes…',{...classic,shear:460,damping:29},0),
  item('burger','Cat Burger','squishy-hamburger-chat','classic','#ffe6bb','The softest snack in the bunch.',{...classic,shear:520,bulk:3500,damping:30},0),
  item('milk','Milk Carton','squishy-brique-de-lait','classic','#fbdce9','A little cloud of strawberry milk.',{...classic,shear:400,damping:40},0),
  item('fluffy','Fluffy Cat','squishy-mochi-chat-fluffy','sticky','#e5e4fc','A little cloud that sticks around.',{...mochi,shear:450,damping:10},1),
  item('bunny','Mochi Bunny','squishy-mochi-lapin','sticky','#f8dce9','Two ears for the gentlest stretch.',{...mochi,shear:520,damping:8},.7),
  item('seal','Mochi Seal','squishy-mochi-phoque','sticky','#d8eff9','Squish, stick, and peel away.',{...mochi,shear:370,damping:12},.85),
  item('chick','Mochi Chick','squishy-mochi-poussin','sticky','#fff0af','A little ray of bouncy sunshine.',{...mochi,shear:850,damping:5,restitution:.18},.4),
  item('cheeks','Mochi Hamster','squishy-mochi-hamster','sticky','#f9d6e3','Pink cheeks, a little cheese, and you.',{...mochi,shear:410,damping:13},.95),
];
export const DEFAULT_SQUISHY='fluffy';
export const ENVIRONMENTS=[
  {id:'cloud',name:'Cloud Nine',icon:'☁',subtitle:'A little piece of the sky',background:'#d8edfc',floor:'#f0edfc',wall:'#d6e8fb',accent:'#bfa9e9',grip:1,friction:1},
  {id:'room',name:'Mochi Room',icon:'♡',subtitle:'Un coin soft & squishy',background:'#e9ddf6',floor:'#f4dee9',wall:'#dfd2f0',accent:'#aa8cc8',grip:.85,friction:1.2},
  {id:'candy',name:'Candy Break',icon:'✿',subtitle:'Welcome to the sweet shop',background:'#fce1e7',floor:'#e2f3dc',wall:'#f9d8e5',accent:'#f49eb6',grip:1.2,friction:.85},
  {id:'beach',name:'Vanilla Beach',icon:'☀',subtitle:'A softer kind of seaside',background:'#d2edf0',floor:'#f8e7be',wall:'#cee8e8',accent:'#ecbc77',grip:.55,friction:1.4},
  {id:'space',name:'Starry Dream',icon:'✧',subtitle:'A little closer to the stars',background:'#4b416e',floor:'#81739f',wall:'#5f5287',accent:'#ddc6f8',grip:1.1,friction:.9},
];
