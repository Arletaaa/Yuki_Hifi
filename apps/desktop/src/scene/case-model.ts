import { Box3, DoubleSide, Group, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Texture, Vector3 } from "three";

export const CASE_MODEL_URL = "/models/cd-case.glb";

/** 封面（内页）。 */
const COVER_NODE = "Object_11";
/** 托盘上印着 CD 图形的纸层，会挡住封面。 */
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
  showDisc = false,
  withCoverPlane = true
): BuiltCase => {
  const clone = scene.clone(true);

  clone.traverse((child) => {
    const mesh = child as Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;


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

  // 铰链：在模型自身坐标系（尚未旋转/缩放）里取盒盖边缘，保证盖子像书本一样翻开。
  clone.updateMatrixWorld(true);
  const lidPrint = clone.getObjectByName(COVER_NODE) ?? null;
  const lid = clone.getObjectByName(LID_NODE) ?? lidPrint?.parent ?? null;
  let lidPivot: Group | null = null;

  if (lid?.parent) {
    // Blender 铰链点 (-0.000631, -1.1053, 0) 换算到 glTF 空间：(x, z, -y)。
    const hinge = new Vector3(-0.000631, 0, 1.1053);

    lidPivot = new Group();
    lidPivot.position.copy(hinge);
    lidPivot.name = "lid-pivot";
    clone.add(lidPivot);
    lidPivot.attach(lid);
    lidPivot.updateMatrixWorld(true);
  }

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

  const root = new Group();
  root.add(wrapper);

  // 封面放在 root 上、用内页包围盒定位（在根空间里算出来的位置是稳定的）。
  const coverNode = clone.getObjectByName(COVER_NODE);
  const coverMesh = coverNode && "geometry" in coverNode ? (coverNode as Mesh) : null;

  if (coverMesh && withCoverPlane) {
    const coverBox = new Box3().setFromObject(coverMesh);
    const coverCenter = coverBox.getCenter(new Vector3());
    const coverSize = coverBox.getSize(new Vector3());
    const wholeBox = new Box3().setFromObject(clone);

    const coverPlane = new Mesh(
      new PlaneGeometry(coverSize.x * 0.92, coverSize.y * 0.92),
      new MeshStandardMaterial({
        color: coverTexture ? "#ffffff" : tint,
        map: coverTexture,
        metalness: 0.02,
        roughness: 0.7
      })
    );
    coverPlane.position.set(coverCenter.x, coverCenter.y, wholeBox.max.z + 0.006);
    root.add(coverPlane);
  }
  const cdGroup = clone.getObjectByName(CD_NODE) ?? null;
  const hub = clone.getObjectByName("Object_14");

  if (hub && cdGroup?.parent) {
    // 固定盘片的塑料件属于盒体，不跟着盘片飞出去。
    cdGroup.parent.attach(hub);
  }

  return {
    root,
    lid,
    lidPivot,
    cd: cdGroup
  };
};
