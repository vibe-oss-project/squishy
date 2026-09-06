import type { Plane,Ray,Vector3 } from 'three/webgpu';
import type { surfaceGrab } from '../physics/grab.ts';

export type SurfaceGrip=NonNullable<ReturnType<typeof surfaceGrab>>&{peel?:boolean};

/** Optional toy gestures; the original Jelly Baby input keeps its own behavior. */
export interface GrabBehavior {
  canPin():boolean;
  begin(grip:SurfaceGrip,ray:Ray,pinned:boolean):void;
  project(grip:SurfaceGrip,ray:Ray,plane:Plane,out:Vector3):boolean;
  advance(grip:SurfaceGrip,raw:Vector3,h:number,pressure:number):void;
  release(grip:SurfaceGrip):void;
}
