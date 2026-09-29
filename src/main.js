import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BASE_SIZE, gridVertices, scaleForHeight } from './baseGrid.js';
import { CLIPS, findClip, readSelectedClip, saveSelectedClip } from './animationState.js';
import './styles.css';

const MODEL_URL = new URL('../assets/character/character-animated.glb', import.meta.url).href;
const container = document.querySelector('#scene');
const status = document.querySelector('#status');
const clipList = document.querySelector('#clip-list');
const clipNote = document.querySelector('#clip-note');
let selectedKey = readSelectedClip(window.localStorage);
let mixer;
let activeAction;
let availableAnimations = [];
const buttons = new Map();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17191a);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
camera.position.set(13, 10, 15);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;
controls.minDistance = 5;
controls.maxDistance = 36;
controls.maxPolarAngle = Math.PI / 2.04;

scene.add(new THREE.HemisphereLight(0xd8e2e4, 0x202223, 2.2));
const keyLight = new THREE.DirectionalLight(0xfff0df, 2.7);
keyLight.position.set(7, 12, 9);
keyLight.castShadow = true;
scene.add(keyLight);
const floor = new THREE.Mesh(new THREE.BoxGeometry(BASE_SIZE, .18, BASE_SIZE), new THREE.MeshStandardMaterial({ color: 0x252829, roughness: .96 }));
floor.position.y = -.09;
floor.receiveShadow = true;
scene.add(floor);
const gridGeometry = new THREE.BufferGeometry();
gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices(), 3));
const grid = new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: 0x9da2a0, transparent: true, opacity: .35 }));
scene.add(grid);

function renderClipControls() {
  for (const descriptor of CLIPS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = descriptor.label;
    button.addEventListener('click', () => selectClip(descriptor.key));
    buttons.set(descriptor.key, button);
    clipList.append(button);
  }
}

function updateControls() {
  for (const descriptor of CLIPS) {
    const clip = findClip(availableAnimations, descriptor);
    const button = buttons.get(descriptor.key);
    button.disabled = !clip;
    button.setAttribute('aria-pressed', String(selectedKey === descriptor.key));
  }
}

function selectClip(key) {
  selectedKey = key;
  saveSelectedClip(window.localStorage, key);
  const descriptor = CLIPS.find((clip) => clip.key === key);
  const animation = findClip(availableAnimations, descriptor);
  updateControls();
  if (!animation) {
    clipNote.textContent = `${descriptor.label} is not included in this character yet.`;
    return;
  }
  const nextAction = mixer.clipAction(animation).reset().fadeIn(.2).play();
  if (activeAction && activeAction !== nextAction) activeAction.fadeOut(.2);
  activeAction = nextAction;
  clipNote.textContent = `Playing ${animation.name}.`;
}

async function loadCharacter() {
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const actor = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(actor);
    const height = bounds.max.y - bounds.min.y;
    actor.scale.setScalar(scaleForHeight(height));
    actor.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(actor);
    actor.position.y -= scaledBounds.min.y;
    actor.traverse((node) => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    scene.add(actor);
    availableAnimations = gltf.animations;
    mixer = new THREE.AnimationMixer(actor);
    status.textContent = `Character loaded with ${availableAnimations.length} animation clip${availableAnimations.length === 1 ? '' : 's'}.`;
    updateControls();
    selectClip(selectedKey);
  } catch (error) {
    status.textContent = 'Character asset is still being prepared. The stage is ready for its rigged GLB.';
    clipNote.textContent = 'Animation controls unlock once the rigged GLB is added.';
    updateControls();
    console.info('Character asset is not available yet.', error);
  }
}

function resize() {
  const { width, height } = container.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  mixer?.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
}

renderClipControls();
resize();
new ResizeObserver(resize).observe(container);
window.addEventListener('resize', resize);
loadCharacter();
frame();
