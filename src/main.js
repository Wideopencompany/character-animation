import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LightweightAOPass } from './ambientOcclusion.js';
import { applyMatteShading, configureCharacterTextures } from './characterShading.js';
import { configureLighting } from './lighting.js';
import { BASE_SIZE, gridVertices, scaleForHeight } from './baseGrid.js';
import { CLIPS, findClip, readSelectedClip, saveSelectedClip, availableSelection } from './animationState.js';
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
let actor;
let inspectingHands = false;
const buttons = new Map();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.append(renderer.domElement);

const scene = new THREE.Scene();
// Compensate the stage palette for the highlight-preserving ACES output.
scene.background = new THREE.Color(0x35383a);
const camera = new THREE.PerspectiveCamera(36, 1, .1, 120);
const renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new LightweightAOPass(scene, camera));
composer.addPass(new OutputPass());
camera.position.set(5.8, 4.1, 7.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, .9, 0);
controls.enableDamping = true;
controls.minDistance = .22;
controls.maxDistance = 36;
controls.maxPolarAngle = Math.PI / 2.04;

configureLighting(renderer, scene);
const floor = new THREE.Mesh(new THREE.BoxGeometry(BASE_SIZE, .18, BASE_SIZE), new THREE.MeshLambertMaterial({ color: 0x444849 }));
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
  if (key === 'hands') mixer.stopAllAction();
  const nextAction = mixer.clipAction(animation).reset().fadeIn(key === 'hands' ? 0 : .2).play();
  if (activeAction && activeAction !== nextAction) activeAction.fadeOut(.2);
  activeAction = nextAction;
  if (key === 'hands') {
    mixer.update(0);
    actor.updateMatrixWorld(true);
    const hand = actor.getObjectByName('LeftMiddle1');
    if (hand) {
      const center = hand.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-.015, 0, 0));
      controls.target.copy(center);
      camera.position.copy(center).add(new THREE.Vector3(.018, .25, .23).multiplyScalar(Math.max(1, 1.5 / camera.aspect)));
      controls.update();
    }
    inspectingHands = true;
  } else if (inspectingHands) {
    controls.target.set(0, .9, 0);
    camera.position.set(0, 1.5, 3.8);
    controls.update();
    inspectingHands = false;
  }
  clipNote.textContent = `Playing ${animation.name}.`;
}

async function loadCharacter() {
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    actor = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(actor);
    const height = bounds.max.y - bounds.min.y;
    actor.scale.setScalar(scaleForHeight(height));
    actor.updateMatrixWorld(true);
    const scaledBounds = new THREE.Box3().setFromObject(actor);
    actor.position.y -= scaledBounds.min.y;
    applyMatteShading(actor);
    configureCharacterTextures(actor, renderer.capabilities.getMaxAnisotropy());
    scene.add(actor);
    availableAnimations = gltf.animations;
    mixer = new THREE.AnimationMixer(actor);
    status.textContent = `Character loaded with ${availableAnimations.length} animation clip${availableAnimations.length === 1 ? '' : 's'}.`;
    updateControls();
    const supportedKey = availableSelection(availableAnimations, selectedKey);
    if (supportedKey) selectClip(supportedKey);
    else clipNote.textContent = 'This character has no animation clips yet.';
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
  composer.setSize(width, height);
}

const timer = new THREE.Timer();
timer.connect(document);
function frame(timestamp) {
  requestAnimationFrame(frame);
  timer.update(timestamp);
  mixer?.update(timer.getDelta());
  controls.update();
  composer.render();
}

renderClipControls();
resize();
new ResizeObserver(resize).observe(container);
window.addEventListener('resize', resize);
loadCharacter();
frame();
