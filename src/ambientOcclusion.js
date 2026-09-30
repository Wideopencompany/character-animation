import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { AO_SETTINGS, aoSize } from './characterShading.js';

// Beauty stays full resolution; only normals, AO and its blur use half-size buffers.
export class LightweightAOPass extends SSAOPass {
  constructor(scene, camera) {
    super(scene, camera, 1, 1, AO_SETTINGS.samples);
    this.kernelRadius = AO_SETTINGS.radius;
    this.minDistance = AO_SETTINGS.minDistance;
    this.maxDistance = AO_SETTINGS.maxDistance;
    this.copyMaterial.uniforms.aoStrength = { value: AO_SETTINGS.strength };
    this.copyMaterial.fragmentShader = `
      uniform sampler2D tDiffuse;
      uniform float aoStrength;
      varying vec2 vUv;
      void main() {
        vec3 ao = texture2D(tDiffuse, vUv).rgb;
        gl_FragColor = vec4(mix(vec3(1.0), ao, aoStrength), 1.0);
      }
    `;
  }

  setSize(width, height) {
    super.setSize(...aoSize(width, height));
  }
}
