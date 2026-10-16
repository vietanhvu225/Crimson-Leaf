import * as THREE from 'three';

// One InstancedMesh refilled every frame (begin → add… → end). Grows by doubling when a level has
// more items than expected; never allocates in the per-frame path otherwise.

const m4 = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();
const euler = new THREE.Euler();

export interface InstancedBatchOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  /** Defaults to true for opaque, false for transparent materials. */
  frustumCulled?: boolean;
}

export class InstancedBatch {
  mesh: THREE.InstancedMesh;
  private count = 0;
  private parent: THREE.Object3D;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private capacity: number;
  private opts: InstancedBatchOptions;

  constructor(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    opts: InstancedBatchOptions = {}
  ) {
    this.parent = parent;
    this.geometry = geometry;
    this.material = material;
    this.capacity = capacity;
    this.opts = opts;
    this.mesh = this.build(capacity);
  }

  private build(capacity: number) {
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = !!this.opts.castShadow;
    mesh.receiveShadow = !!this.opts.receiveShadow;
    mesh.renderOrder = this.opts.renderOrder ?? 0;
    // Instances span the whole stage; the default bounding sphere (of the base geometry) would cull them.
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.parent.add(mesh);
    return mesh;
  }

  begin() {
    this.count = 0;
  }

  private grow() {
    const old = this.mesh;
    this.capacity *= 2;
    this.mesh = this.build(this.capacity);
    this.mesh.instanceMatrix.array.set(old.instanceMatrix.array);
    this.mesh.instanceColor!.array.set(old.instanceColor!.array);
    this.parent.remove(old);
    old.dispose();
  }

  add(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: THREE.Color,
    rotZ = 0,
    rotY = 0
  ) {
    if (this.count >= this.capacity) this.grow();
    pos.set(x, y, z);
    scl.set(sx, sy, sz);
    if (rotZ === 0 && rotY === 0) quat.identity();
    else quat.setFromEuler(euler.set(0, rotY, rotZ));
    m4.compose(pos, quat, scl);
    this.mesh.setMatrixAt(this.count, m4);
    this.mesh.setColorAt(this.count, color);
    this.count++;
  }

  end() {
    this.mesh.count = this.count;
    if (this.count > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor!.needsUpdate = true;
    }
  }

  /** Frees the instance buffers; geometry and material belong to the caller's Tracker. */
  dispose() {
    this.parent.remove(this.mesh);
    this.mesh.dispose();
  }
}
