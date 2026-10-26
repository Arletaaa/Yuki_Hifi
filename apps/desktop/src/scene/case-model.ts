import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Texture, Vector3 } from "three";

export const CASE_MODEL_URL = "/models/cd-case.glb";

/** 封面（内页）。 */
const COVER_NODE = "Object_11";
/** 托盘上印着 CD 图形的纸层，会挡住封面。 */
const CD_PRINT_NODES = new Set(["Object_8"]);
/** 盘片本体。 */
const DISC_NODES = new Set(["Object_13", "Object_14"]);
/** 可翻转的盒盖组。 */
const LID_NODE = "Case Front_0";
/** 盘片组。 */
const CD_NODE = "CD_1";

export interface BuiltCase {
  readonly cd: Object3D | null;
  readonly lid: Object3D | null;
  /** 盒盖铰链（绕它翻转）。 */
  readonly lidPivot: Group | null;
  readonly root: Group;
}

/**
 * 把 GLB 归一化成一个"可陈列、可就位"的盒子：
 * - 按包围盒缩放到目标高度并居中；
 * - 隐藏托盘印刷层与盘片（陈列态只显示封面）；
 * - 用内页包围盒生成封面面片，位置与尺寸跟随模型。
 */
export const buildCaseModel = (
  scene: Group,
  coverTexture: Texture | null,
  tint: string,
  targetHeight = 0.52,
  showDisc = false
): BuiltCase => {
  const clone = scene.clone(true);

  clone.traverse((child) => {
    const mesh = child as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (CD_PRINT_NODES.has(mesh.name)) {
      mesh.visible = false;
      return;
    }

    if (DISC_NODES.has(mesh.name)) {
      mesh.visible = showDisc;
      return;
    }

    if (mesh.name === COVER_NODE) {
      mesh.material = new MeshStandardMaterial({
        color: coverTexture ? "#ffffff" : tint,
        map: coverTexture,
        metalness: 0.02,
        roughness: 0.7
      });
    }
  });

  const box = new Box3().setFromObject(clone);
  const size = new Vector3();
  const center = new Vector3();
  box.getSize(size);
  box.getCenter(center);
  const fit = targetHeight / Math.max(size.y, 0.0001);

  const wrapper = new Group();
  clone.position.set(-center.x, -center.y, -center.z);
  wrapper.rotation.y = -Math.PI / 2;
  wrapper.scale.setScalar(fit);
  wrapper.add(clone);
  wrapper.updateMatrixWorld(true);

  const coverMesh = clone.getObjectByName(COVER_NODE);
  const coverBox = new Box3().setFromObject(coverMesh ?? clone);
  const coverCenter = coverBox.getCenter(new Vector3());
  const coverSize = coverBox.getSize(new Vector3());

  const root = new Group();
  root.add(wrapper);

  const coverPlane = new Mesh(
    new PlaneGeometry(coverSize.x * 0.9, coverSize.y * 0.9),
    new MeshStandardMaterial({ color: coverTexture ? "#ffffff" : tint, map: coverTexture, metalness: 0.02, roughness: 0.7 })
  );
  coverPlane.position.set(coverCenter.x, coverCenter.y, coverBox.max.z + 0.004);
  root.add(coverPlane);

  // 用内页节点反查盒盖组（节点名在这种 Sketchfab 导出里不稳定）。
  const lidPrint = clone.getObjectByName(COVER_NODE) ?? null;
  const lid = clone.getObjectByName(LID_NODE) ?? lidPrint?.parent ?? null;
  let lidPivot: Group | null = null;

  if (lid?.parent) {
    const parent = lid.parent;
    const lidBox = new Box3().setFromObject(lid);
    const lidCenter = lidBox.getCenter(new Vector3());
    const hinge = new Vector3(lidCenter.x, lidCenter.y, lidBox.min.z);

    lidPivot = new Group();
    lidPivot.position.copy(hinge);
    parent.add(lidPivot);
    lidPivot.add(lid);
    lid.position.sub(hinge);
  }

  return {
    root,
    lid,
    lidPivot,
    cd: clone.getObjectByName(CD_NODE) ?? null
  };
};
