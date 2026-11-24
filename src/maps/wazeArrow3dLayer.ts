/**
 * Seta de navegação 3D (Three.js) — custom layer MapLibre.
 * ExtrudeGeometry no asfalto + Phong/luz (mesma seta de antes, escala menor).
 */

export type WazeArrowPose = {
  longitude: number;
  latitude: number;
  headingDeg: number;
  visible: boolean;
};

const ARROW_METERS = 8;
const ARROW_ALTITUDE_M = 0.5;
export const WAZE_ARROW_LAYER_VERSION = 'extrude-phong-v17';

async function loadThree(): Promise<any> {
  const mod = await import('three');
  return (mod as any).default ?? mod;
}

/** Só a cabeça (chevron), sem tronco. Ponta +Y. Extrude em Z = altura. */
function buildArrowShape(THREE: any) {
  const s = new THREE.Shape();
  s.moveTo(0, 1.35);
  s.lineTo(1.15, -0.75);
  s.lineTo(0, -0.2);
  s.lineTo(-1.15, -0.75);
  s.closePath();
  return s;
}

function buildWazeArrow(THREE: any) {
  const group = new THREE.Group();

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.45, 48),
    new THREE.MeshBasicMaterial({
      color: 0x33ccff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.02;
  group.add(halo);

  const shape = buildArrowShape(THREE);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28, // ~1/3 da altura anterior (0.85)
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // Como antes: deitar + ponta +Z (rotateY π)
  geo.rotateX(-Math.PI / 2);
  geo.rotateY(Math.PI);
  geo.computeVertexNormals();

  const topMat = new THREE.MeshPhongMaterial({
    color: 0x1ae0ff,
    emissive: 0x004455,
    specular: 0xffffff,
    shininess: 90,
  });
  const sideMat = new THREE.MeshPhongMaterial({
    color: 0x005566,
    emissive: 0x001018,
    specular: 0x44aacc,
    shininess: 35,
  });

  const mesh = new THREE.Mesh(geo, [sideMat, topMat]);
  mesh.position.y = 0.08;
  group.add(mesh);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 18),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
  );
  edges.position.copy(mesh.position);
  group.add(edges);

  return group;
}

export async function createWazeArrow3dLayer(maplibregl: any) {
  const THREE = await loadThree();

  const pose: WazeArrowPose = {
    longitude: 0,
    latitude: 0,
    headingDeg: 0,
    visible: false,
  };

  const layer: any = {
    id: 'echarge-waze-arrow-3d',
    type: 'custom',
    renderingMode: '3d',
    _ready: false,
    _pose: pose,
    _source: 'extrude-phong',
    _version: WAZE_ARROW_LAYER_VERSION,

    onAdd(map: any, gl: WebGLRenderingContext) {
      this.map = map;
      this.camera = new THREE.Camera();
      this.scene = new THREE.Scene();

      const amb = new THREE.AmbientLight(0xffffff, 0.55);
      const key = new THREE.DirectionalLight(0xffffff, 0.95);
      key.position.set(4, 10, 2);
      const fill = new THREE.DirectionalLight(0x88ccff, 0.35);
      fill.position.set(-3, 4, -2);
      this.scene.add(amb, key, fill);

      this.arrow = buildWazeArrow(THREE);
      this.scene.add(this.arrow);
      this.arrow.visible = !!this._pose?.visible;

      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      this.renderer.autoClear = false;
      this._ready = true;

      if (typeof window !== 'undefined') {
        (window as any).__echargeArrow3d = {
          version: WAZE_ARROW_LAYER_VERSION,
          source: () => this._source,
          ready: () => this._ready,
          getPose: () => this._pose,
        };
      }
    },

    onRemove() {
      try {
        this.renderer?.dispose?.();
      } catch {
        /* ok */
      }
      this._ready = false;
    },

    setPose(next: WazeArrowPose) {
      this._pose = next;
      if (this.arrow) this.arrow.visible = !!next.visible;
      this.map?.triggerRepaint?.();
    },

    render(_gl: WebGLRenderingContext, args: any) {
      if (!this._ready || !this._pose?.visible) return;

      const { longitude, latitude, headingDeg } = this._pose;
      const merc = maplibregl.MercatorCoordinate.fromLngLat(
        { lng: longitude, lat: latitude },
        ARROW_ALTITUDE_M,
      );
      const scale = merc.meterInMercatorCoordinateUnits() * ARROW_METERS;

      // Orientação estável de antes: rotX π/2 + rotY (π − heading)
      const headingRad = Math.PI - (headingDeg * Math.PI) / 180;
      const rotX = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      const rotY = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), headingRad);

      const main = args?.defaultProjectionData?.mainMatrix;
      if (!main) return;

      const m = new THREE.Matrix4().fromArray(main);
      const l = new THREE.Matrix4()
        .makeTranslation(merc.x, merc.y, merc.z)
        .scale(new THREE.Vector3(scale, -scale, scale))
        .multiply(rotX)
        .multiply(rotY);

      this.camera.projectionMatrix = m.multiply(l);
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
    },
  };

  return layer;
}
