#version 120
#if @useUBO
#extension GL_ARB_uniform_buffer_object : require
#endif
#if @useGPUShader4
#extension GL_EXT_gpu_shader4 : require
#endif
#include "lib/core/fragment.h.glsl"
const float VISIBILITY = 2500.0;
const float VISIBILITY_DEPTH = VISIBILITY * 1.5;
const float DEPTH_FADE = 0.10;
const vec2 BIG_WAVES = vec2(0.1, 0.1);
const vec2 MID_WAVES = vec2(0.1, 0.1);
const vec2 MID_WAVES_RAIN = vec2(0.2, 0.2);
const vec2 SMALL_WAVES = vec2(0.1, 0.1);
const vec2 SMALL_WAVES_RAIN = vec2(0.3, 0.3);
const float WAVE_CHOPPYNESS = 0.05;
const float WAVE_SCALE = 75.0;
const float BUMP = 0.5;
const float BUMP_RAIN = 2.5;
const float REFL_BUMP = 0.10;
const float REFR_BUMP = 0.07;
#if @sunlightScattering
const float SCATTER_AMOUNT = 0.3;
const vec3 SCATTER_COLOUR = vec3(0.31, 0.92, 0.66);
const vec3 SUN_EXT = vec3(0.45, 0.55, 0.68);
#endif
const float SUN_SPEC_FADING_THRESHOLD = 0.15;
const float SPEC_HARDNESS = 256.0;
const float BUMP_SUPPRESS_DEPTH = 300.0;
const float REFR_FOG_DISTORT_DISTANCE = 3000.0;
const vec2 WIND_DIR = vec2(0.5f, -0.8f);
const float WIND_SPEED = 0.4f;
const vec3 WATER_COLOR = vec3(0.01, 0.11, 0.07);
#if @wobblyShores
const float WOBBLY_SHORE_FADE_DISTANCE = 6200.0;
#endif
const float FOAM_DEPTH_THRESHOLD = 60.0;
const float FOAM_DEPTH_FALLOFF = 10.9;
const vec4 baseFoamColor = vec4(0.98, 0.98, 1.0, 0.4); // Base white with slight blue and higher alpha
const float FOAM_EDGE_THICKNESS = 2.5;
const float FOAM_WAVE_SPEED = 0.0001;
const float FOAM_WAVE_SCALE = 35.0;
const float FOAM_INTENSITY = 0.35;
const float FOAM_DETAIL_SCALE = 3.8;
const float FOAM_DETAIL_INTENSITY = 0.4;
const float FOAM_SPREAD = 4.0;
const float FOAM_SHORE_BLEND = 0.45;
const float FOAM_TRANSPARENCY_FACTOR = 0.75;
const float FOAM_VARIABLE_TRANSPARENCY = 0.6;
const float FOAM_ANIMATION_VARIANCE = 1.2;
const float FOAM_SHORELINE_SPEED = 0.01;
const float FOAM_SHORELINE_SCALE = 10.0;
const float FOAM_OSCILLATION_AMOUNT = 0.003;
const float FOAM_TIDE_SPEED = 0.15;
const float FOAM_TIDE_SCALE = 15.0;
const float FOAM_TIDE_STRENGTH = 0.2;
const float FOAM_PATTERN_DEPTH_THRESHOLD = 45.0;
const float FOAM_PATTERN_FADE_DISTANCE = 25.0;
const float FOAM_PATTERN_BIAS = 0.6;
const float FOAM_PATTERN_SCALE_FACTOR = 0.7;
const float FOAM_PATTERN_INTENSITY_FACTOR = 0.7;
const float FOAM_SHORE_BIAS = 1.0;
const float FOAM_HEIGHT_SCALE = 1.8;
const float FOAM_VOLUME_INTENSITY = 0.7;
const vec2 SHORE_DIRECTION = normalize(vec2(0.3, 0.7));
uniform float causticIntensity;
vec2 normalCoords(vec2 uv, float scale, float speed, float time, float timer1, float timer2, vec3 previousNormal) {
return uv * (WAVE_SCALE * scale) + WIND_DIR * time * (WIND_SPEED * speed) - (previousNormal.xy / previousNormal.zz) * WAVE_CHOPPYNESS + vec2(time * timer1, time * timer2);
}
uniform sampler2D rippleMap;
uniform vec3 playerPos;
varying vec3 worldPos;
varying vec2 rippleMapUV;
varying vec4 position;
varying float linearDepth;
uniform sampler2D normalMap;
uniform sampler2D noiseMap;
uniform float osg_SimulationTime;
uniform float near;
uniform float far;
uniform float rainIntensity;
uniform bool enableRainRipples;
uniform vec2 screenRes;
#define PER_PIXEL_LIGHTING 0
#include "shadows_fragment.glsl"
#include "lib/light/lighting.glsl"
#include "fog.glsl"
#include "lib/water/fresnel.glsl"
#include "lib/water/rain_ripples.glsl"
#include "lib/view/depth.glsl"
vec3 generateProceduralCaustics(vec3 worldPos, float time, sampler2D normalTex) {
float scale1 = 40.0;
float scale2 = 20.0;
float scale3 = 10.0;
float speed1 = 1.5;
float speed2 = 2.3;
float speed3 = 3.1;
vec2 uv1 = worldPos.xy / scale1 + time * speed1 * vec2(0.7, 0.3);
vec2 uv2 = worldPos.xy / scale2 + time * speed2 * vec2(-0.4, 0.6);
vec2 uv3 = worldPos.xy / scale3 + time * speed3 * vec2(0.2, -0.5);
vec3 normalSample1 = texture2D(normalTex, worldPos.xy / 80.0 + time * 0.08).rgb * 2.0 - 1.0;
vec3 normalSample2 = texture2D(normalTex, worldPos.xy / 50.0 - time * 0.05).rgb * 2.0 - 1.0;
uv1 += normalSample1.xy * 0.15;
uv2 += normalSample2.xy * 0.1;
uv3 += (normalSample1.xy + normalSample2.xy) * 0.05;
vec2 f1 = fract(uv1) - 0.5;
vec2 i1 = floor(uv1);
float minDist1 = 1.0;
for (float y = -1.0; y <= 1.0; y++) {
for (float x = -1.0; x <= 1.0; x++) {
vec2 neighbor = vec2(x, y);
vec2 point = fract(sin(
vec2(dot(i1 + neighbor, vec2(127.1, 311.7)),
dot(i1 + neighbor, vec2(269.5, 183.3)))
) * 43758.5453);
vec2 diff = neighbor + point - f1;
float dist = length(diff);
minDist1 = min(minDist1, dist);
}
}
vec2 f2 = fract(uv2) - 0.5;
vec2 i2 = floor(uv2);
float minDist2 = 1.0;
for (float y = -1.0; y <= 1.0; y++) {
for (float x = -1.0; x <= 1.0; x++) {
vec2 neighbor = vec2(x, y);
vec2 point = fract(sin(
vec2(dot(i2 + neighbor, vec2(127.1, 311.7)),
dot(i2 + neighbor, vec2(269.5, 183.3)))
) * 43758.5453);
vec2 diff = neighbor + point - f2;
float dist = length(diff);
minDist2 = min(minDist2, dist);
}
}
float pattern3 = sin(uv3.x * 6.28) * sin(uv3.y * 6.28);
pattern3 = abs(pattern3) * 0.5;
float causticPattern = (1.0 - minDist1) * (1.0 - minDist1) * 0.6 + (1.0 - minDist2) * (1.0 - minDist2) * 0.3 + pattern3 * 0.1;
causticPattern = pow(causticPattern, 3.0);
causticPattern *= 1.0 + dot(normalSample1.xy, normalSample2.xy) * 0.2;
vec3 baseColor = mix(vec3(0.6, 0.8, 1.0), vec3(1.0, 1.0, 0.95), causticPattern);
return baseColor * causticPattern * 1.5;
}
float foamNoise(vec2 uv, float time, float depthFactor) {
float depthScale = mix(1.0, FOAM_PATTERN_SCALE_FACTOR, 1.0 - depthFactor);
float tideOffset = sin(time * FOAM_TIDE_SPEED) * FOAM_TIDE_STRENGTH;
float tideOffsetX = sin(time * FOAM_TIDE_SPEED * 0.7 + uv.y * 0.05) * FOAM_TIDE_STRENGTH;
float tideOffsetY = cos(time * FOAM_TIDE_SPEED * 0.5 + uv.x * 0.03) * FOAM_TIDE_STRENGTH * 0.7;
vec2 foamUVBase = uv * FOAM_WAVE_SCALE * depthScale + WIND_DIR * time * FOAM_WAVE_SPEED;
vec2 tideMovement = vec2(tideOffsetX, tideOffsetY);
float oscPhase = sin(time * 3.0);
float biasedOscX = oscPhase * (1.0 - FOAM_SHORE_BIAS * max(0.0, sign(oscPhase)));
float biasedOscY = cos(time * 2.0) * (1.0 - FOAM_SHORE_BIAS * max(0.0, sign(cos(time * 0.5))));
vec2 oscillation = SHORE_DIRECTION * FOAM_OSCILLATION_AMOUNT * vec2(biasedOscX, biasedOscY);
vec2 foamUV = foamUVBase + oscillation + tideMovement;
float noiseContribution = depthFactor * depthFactor;
float noise = texture2D(normalMap, foamUV * 0.04).r * 0.5 * mix(1.0, 0.2, 1.0 - noiseContribution);
noise += texture2D(normalMap, foamUV * 0.12 + vec2(time * 0.015, time * -0.01)).r * 0.35 * mix(1.0, 0.1, 1.0 - noiseContribution);
if (depthFactor > 0.5) {
noise += texture2D(normalMap, foamUV * 0.25 + vec2(-time * 0.0075, time * 0.005)).r * 0.25 * min(1.0, (depthFactor - 0.5) * 2.0);
}
if (depthFactor > 0.8) {
noise += texture2D(normalMap, foamUV * 0.7 + vec2(time * 0.004, -time * 0.0075)).b * 0.15 * min(1.0, (depthFactor - 0.8) * 5.0);
}
return noise * 0.35 * mix(FOAM_PATTERN_INTENSITY_FACTOR, 1.0, depthFactor);
}
float foamDetailNoise(vec2 uv, float time, float depthFactor) {
float depthScale = mix(0.5, 1.0, depthFactor);
float tideDetailOffsetX = sin(time * FOAM_TIDE_SPEED * 0.9 + uv.y * 0.04) * FOAM_TIDE_STRENGTH * 0.8;
float tideDetailOffsetY = cos(time * FOAM_TIDE_SPEED * 0.6 + uv.x * 0.025) * FOAM_TIDE_STRENGTH * 0.6;
vec2 detailUVBase = uv * FOAM_WAVE_SCALE * FOAM_DETAIL_SCALE * depthScale + WIND_DIR * time * FOAM_WAVE_SPEED * 1.2;
vec2 tideDetailMovement = vec2(tideDetailOffsetX, tideDetailOffsetY);
float oscPhaseDetail = sin(time * 2.4);
float biasedOscDetailX = oscPhaseDetail * (1.0 - FOAM_SHORE_BIAS * max(0.0, sign(oscPhaseDetail)));
float biasedOscDetailY = cos(time * 3.6) * (1.0 - FOAM_SHORE_BIAS * max(0.0, sign(cos(time * 0.9))));
vec2 oscillation = SHORE_DIRECTION * FOAM_OSCILLATION_AMOUNT * 0.8 * vec2(biasedOscDetailX, biasedOscDetailY);
vec2 detailUV = detailUVBase + oscillation + tideDetailMovement;
float detail = 0.0;
if (depthFactor > 0.4) {
float detailMix = smoothstep(0.4, 0.8, depthFactor);
detail += texture2D(normalMap, detailUV * 0.15 - vec2(time * 0.004, 0.0)).b * 0.6 * detailMix;
}
if (depthFactor > 0.6) {
float detailMix = smoothstep(0.6, 0.9, depthFactor);
detail += texture2D(normalMap, detailUV * 0.4 + vec2(0.0, time * 0.0075)).b * 0.4 * detailMix;
detail += texture2D(normalMap, detailUV * 0.25 + vec2(time * -0.005, time * 0.01)).r * 0.25 * detailMix;
}
return detail * 0.5 * depthFactor;
}
float calculatePatternDepthFactor(float depth) {
float depthFactor = 1.0 - smoothstep(0.0, FOAM_PATTERN_DEPTH_THRESHOLD, depth);
depthFactor = pow(depthFactor, FOAM_PATTERN_BIAS);
return clamp(depthFactor, 0.0, 1.0);
}
float shoreFadeFunction(float depth, float waveHeight) {
float baseTransition = smoothstep(0.0, FOAM_DEPTH_THRESHOLD, depth);
baseTransition = pow(baseTransition, FOAM_DEPTH_FALLOFF);
float waveInfluence = mix(0.7, 1.3, waveHeight);
float shoreBias = smoothstep(0.9, 1.0, waveHeight);
return clamp(baseTransition * waveInfluence * shoreBias, 0.0, 1.0);
}
float calculateFoamHeight(vec2 uv, float time, float depthFactor, vec3 waterNormal) {
float baseHeight = texture2D(normalMap, uv * 0.05 + time * 0.007).r * 0.5;
baseHeight += texture2D(normalMap, uv * 0.15 - time * 0.005).g * 0.3;
baseHeight += texture2D(normalMap, uv * 0.3 + vec2(time * 0.012, -time * 0.009)).b * 0.2;
float dotNormal = dot(normalize(vec3(waterNormal.xy * 1.2, waterNormal.z)), vec3(0.0, 0.0, 1.0));
dotNormal = pow(max(0.0, dotNormal), 1.5);
return baseHeight * FOAM_HEIGHT_SCALE * depthFactor * dotNormal;
}
vec3 calculateFoamNormal(vec2 uv, float time, float depthFactor) {
float scale = 0.05;
float heightSample1 = texture2D(normalMap, uv * scale + vec2(0.001, 0.0)).r;
float heightSample2 = texture2D(normalMap, uv * scale - vec2(0.001, 0.0)).r;
float heightSample3 = texture2D(normalMap, uv * scale + vec2(0.0, 0.001)).r;
float heightSample4 = texture2D(normalMap, uv * scale - vec2(0.0, 0.001)).r;
vec3 foamNormal = normalize(vec3(
heightSample1 - heightSample2,
heightSample3 - heightSample4,
0.05
));
return mix(vec3(0.0, 0.0, 1.0), foamNormal, depthFactor * 0.8);
}
void main(void) {
vec2 UV = worldPos.xy / (8192.0 * 5.0) * 3.0;
UV.y *= -1.0;
float shadow = unshadowedLightRatio(linearDepth);
vec2 screenCoords = gl_FragCoord.xy / screenRes;
#define waterTimer osg_SimulationTime
vec3 normal0 = 2.0 * texture2D(normalMap, normalCoords(UV, 0.05, 0.04, waterTimer, -0.015, -0.005, vec3(0.0, 0.0, 0.0))).rgb - 1.0;
vec3 normal1 = 2.0 * texture2D(normalMap, normalCoords(UV, 0.1, 0.08, waterTimer, 0.02, 0.015, normal0)).rgb - 1.0;
vec3 normal2 = 2.0 * texture2D(normalMap, normalCoords(UV, 0.25, 0.07, waterTimer, -0.04, -0.03, normal1)).rgb - 1.0;
vec3 normal3 = 2.0 * texture2D(normalMap, normalCoords(UV, 0.5, 0.09, waterTimer, 0.03, 0.04, normal2)).rgb - 1.0;
vec3 normal4 = 2.0 * texture2D(normalMap, normalCoords(UV, 1.0, 0.4, waterTimer, -0.02, 0.1, normal3)).rgb - 1.0;
vec3 normal5 = 2.0 * texture2D(normalMap, normalCoords(UV, 2.0, 0.7, waterTimer, 0.1, -0.06, normal4)).rgb - 1.0;
vec4 rainRipple;
if (rainIntensity > 0.01 && enableRainRipples) {
rainRipple = rainCombined(position.xy / 1000.0, waterTimer) * clamp(rainIntensity, 0.0, 1.0);
} else {
rainRipple = vec4(0.0);
}
vec3 rainSpecular = vec3(0.0);
vec3 rippleAdd = rainRipple.xyz * 10.0;
float distToCenter = length(rippleMapUV - vec2(0.5));
float blendClose = smoothstep(0.001, 0.02, distToCenter);
float blendFar = 1.0 - smoothstep(0.3, 0.4, distToCenter);
float distortionLevel = 2.0;
rippleAdd += distortionLevel * vec3(texture2D(rippleMap, rippleMapUV).ba * blendFar * blendClose, 0.0);
vec2 bigWaves = BIG_WAVES;
vec2 midWaves = mix(MID_WAVES, MID_WAVES_RAIN, rainIntensity);
vec2 smallWaves = mix(SMALL_WAVES, SMALL_WAVES_RAIN, rainIntensity);
float bump = mix(BUMP, BUMP_RAIN, rainIntensity);
vec3 normal = (normal0 * bigWaves.x + normal1 * bigWaves.y + normal2 * midWaves.x + normal3 * midWaves.y + normal4 * smallWaves.x + normal5 * smallWaves.y + rippleAdd);
normal = normalize(vec3(-normal.x * bump, -normal.y * bump, normal.z));
vec3 sunWorldDir = normalize((gl_ModelViewMatrixInverse * vec4(lcalcPosition(0).xyz, 0.0)).xyz);
vec3 cameraPos = (gl_ModelViewMatrixInverse * vec4(0, 0, 0, 1)).xyz;
vec3 viewDir = normalize(position.xyz - cameraPos.xyz);
float sunFade = length(gl_LightModel.ambient.xyz);
float foamLightScale = clamp(pow(sunFade, 3.0) * 0.9, 0.0, 0.7);
float ior = (cameraPos.z > 0.0) ? (1.333 / 1.0) : (1.0 / 1.333);
float fresnel = clamp(fresnel_dielectric(viewDir, normal, ior), 0.0, 1.0);
vec2 screenCoordsOffset = normal.xy * REFL_BUMP;
vec3 refraction;
vec3 rawRefraction;
vec3 reflection = sampleReflectionMap(screenCoords + screenCoordsOffset).rgb;
vec4 sunSpec;
float specular;
float waterTransparency;
#if @waterRefraction
    float depthSample = linearizeDepth(sampleRefractionDepthMap(screenCoords), near, far);
    float surfaceDepth = linearizeDepth(gl_FragCoord.z, near, far);
    float realWaterDepth = depthSample - surfaceDepth;

    float depthSampleDistorted = linearizeDepth(sampleRefractionDepthMap(screenCoords - screenCoordsOffset), near, far);
    float waterDepthDistorted = max(depthSampleDistorted - surfaceDepth, 0.0);
    screenCoordsOffset *= clamp(realWaterDepth / BUMP_SUPPRESS_DEPTH, 0.0, 1.0);

    if (cameraPos.z > 0.0 && realWaterDepth <= VISIBILITY_DEPTH && waterDepthDistorted > VISIBILITY_DEPTH) {
        screenCoordsOffset = vec2(0.0);
    }

    waterDepthDistorted = mix(waterDepthDistorted, realWaterDepth, min(surfaceDepth / REFR_FOG_DISTORT_DISTANCE, 1.0));
    refraction = sampleRefractionMap(screenCoords - screenCoordsOffset).rgb;
    rawRefraction = refraction;

    if (cameraPos.z < 0.0) {
        refraction = clamp(refraction * 1.5, 0.0, 1.0);
    } else {
        float depthCorrection = sqrt(1.0 + 4.0 * DEPTH_FADE * DEPTH_FADE);
        float factor = DEPTH_FADE * DEPTH_FADE / (-0.5 * depthCorrection + 0.5 - waterDepthDistorted / VISIBILITY) + 0.5 * depthCorrection + 0.5;
        refraction = mix(refraction, WATER_COLOR * sunFade, clamp(factor, 0.0, 1.0));
    }
#else
    refraction = mix(WATER_COLOR, reflection, fresnel * 0.3);
    rawRefraction = refraction;
    float surfaceDepth = linearizeDepth(gl_FragCoord.z, near, far);
    float depthSample = surfaceDepth + 100.0; // Fake some depth to keep logic happy
    float realWaterDepth = depthSample - surfaceDepth;
#endif

sunSpec = lcalcSpecular(0);
sunSpec.a = min(1.0, sunSpec.a / SUN_SPEC_FADING_THRESHOLD);
specular = pow(max(dot(reflect(viewDir, normal), sunWorldDir), 0.0), SPEC_HARDNESS) * shadow * sunSpec.a;
waterTransparency = clamp(fresnel * 3.0 + specular, 0.0, 0.7);
#if @sunlightScattering
vec3 scatterNormal = (normal0 * bigWaves.x * 0.5 + normal1 * bigWaves.y * 0.5 + normal2 * midWaves.x * 0.2 + normal3 * midWaves.y * 0.2 + normal4 * smallWaves.x * 0.1 + normal5 * smallWaves.y * 0.1 + rippleAdd);
scatterNormal = normalize(vec3(-scatterNormal.xy * bump, scatterNormal.z));
float sunHeight = sunWorldDir.z;
vec3 scatterColour = mix(SCATTER_COLOUR * vec3(0.34, 1.00, 0.67), SCATTER_COLOUR, max(1.0 - exp(-sunHeight * SUN_EXT), 0.0));
float scatterLambert = max(dot(sunWorldDir, scatterNormal) * 0.7 + 0.3, 0.0);
float scatterReflectAngle = max(dot(reflect(sunWorldDir, scatterNormal), viewDir) * 2.0 - 1.2, 0.0);
float lightScatter = scatterLambert * scatterReflectAngle * SCATTER_AMOUNT * sunFade * sunSpec.a * max(1.0 - exp(-sunHeight), 0.0);
refraction = mix(refraction, scatterColour, lightScatter);
#endif
float foamFactor = 0.0;
vec3 foamNormal = vec3(0.0, 0.0, 1.0);
float foamHeight = 0.0;
if (cameraPos.z > 0.0 && realWaterDepth < FOAM_DEPTH_THRESHOLD) {
float waveHeight = (normal0.z * 0.15 + normal1.z * 0.15 + normal2.z * 0.25 + normal3.z * 0.2 + normal4.z * 0.15 + normal5.z * 0.1);
waveHeight = (waveHeight + 1.0) * 0.5;
float tideFactor = sin(waterTimer * FOAM_TIDE_SPEED * 0.3 + worldPos.x * 0.002 * FOAM_TIDE_SCALE + worldPos.y * 0.003 * FOAM_TIDE_SCALE);
float tideVariation = sin(worldPos.x * 0.003 * FOAM_TIDE_SCALE + worldPos.y * 0.002 * FOAM_TIDE_SCALE) * 0.5 + 0.5;
float tideStrength = FOAM_TIDE_STRENGTH * (0.8 + tideVariation * 0.4);
float dynamicFoamSpread = FOAM_SPREAD + tideFactor * tideStrength;
float timeFactor = sin(waterTimer * FOAM_SHORELINE_SPEED + worldPos.x * 0.01 + worldPos.y * 0.015) * 0.5 + 0.5;
float localTideOffset = sin(waterTimer * FOAM_TIDE_SPEED * 0.5 + worldPos.x * 0.005 * FOAM_TIDE_SCALE + worldPos.y * 0.007 * FOAM_TIDE_SCALE) * tideStrength;
float depthFactor = 1.0 - smoothstep(0.0, FOAM_DEPTH_THRESHOLD + localTideOffset, realWaterDepth);
depthFactor = pow(depthFactor, FOAM_DEPTH_FALLOFF) * (dynamicFoamSpread + localTideOffset);
float viewDependentFactor = max(0.3, abs(dot(normalize(vec3(viewDir.xy, 0.0)), normalize(vec3(normal.xy, 0.0)))));
depthFactor *= viewDependentFactor;
float patternDepthFactor = calculatePatternDepthFactor(realWaterDepth);
float foamPattern = foamNoise(UV, waterTimer, patternDepthFactor);
float foamDetail = foamDetailNoise(UV, waterTimer * 0.7, patternDepthFactor);
foamHeight = calculateFoamHeight(UV, waterTimer, patternDepthFactor, normal);
foamNormal = calculateFoamNormal(UV, waterTimer, patternDepthFactor);
float foamShadow = max(0.85, dot(normalize(vec3(sunWorldDir.xy, max(0.3, sunWorldDir.z))), foamNormal));
float tideEdgeVariation = sin(waterTimer * FOAM_TIDE_SPEED * 0.4 + UV.x * 5.0 * FOAM_TIDE_SCALE * 0.1 + UV.y * 3.0 * FOAM_TIDE_SCALE * 0.1) * 0.15 + 1.0;
float edgeFoam = pow(depthFactor, 1.2) * FOAM_EDGE_THICKNESS * tideEdgeVariation;
edgeFoam *= mix(0.85, 1.15, sin(waterTimer * 0.3 + UV.x * 4.0 + UV.y * 6.0) * 0.5 + 0.5);
float waveFoam = max(0.0, (waveHeight - 0.45) * 1.7) * depthFactor * 0.8;
float rippleFoam = 0.0;
if (rainIntensity > 0.01 && enableRainRipples) {
rippleFoam = abs(rainRipple.w) * 0.2 * depthFactor;
}
foamFactor = edgeFoam + waveFoam + rippleFoam;
foamFactor *= mix(0.8, 1.2, foamPattern);
foamFactor += foamDetail * FOAM_DETAIL_INTENSITY * depthFactor;
foamFactor *= 1.0 + 0.08 * sin(waterTimer * 0.2 + UV.x * 8.0 + UV.y * 7.0);
float shoreFade = shoreFadeFunction(realWaterDepth, waveHeight);
foamFactor *= mix(1.0, shoreFade, FOAM_SHORE_BLEND);
float distanceAttenuation = 1.0 - smoothstep(FOAM_DEPTH_THRESHOLD * 0.6, FOAM_DEPTH_THRESHOLD, realWaterDepth);
foamFactor *= distanceAttenuation;
float depthTransparency = mix(1.0, FOAM_TRANSPARENCY_FACTOR, smoothstep(0.0, FOAM_DEPTH_THRESHOLD * 0.7, realWaterDepth));
foamFactor = clamp(foamFactor * FOAM_INTENSITY * depthTransparency, 0.0, 1.0);
foamFactor *= patternDepthFactor;
float foamSpecular = pow(max(0.0, dot(reflect(viewDir, foamNormal), sunWorldDir)), 64.0) * 0.5 * foamShadow * shadow;
float foamLightScale = clamp(pow(sunFade, 3.0) * 0.9, 0.0, 0.7);
}
vec4 foamColorWithAlpha = baseFoamColor;
foamColorWithAlpha.rgb *= sunFade; // Directly control RGB based on sunFade
foamColorWithAlpha.a *= foamLightScale;
foamColorWithAlpha.a *= foamFactor * mix(0.7, 1.0, smoothstep(FOAM_DEPTH_THRESHOLD * 0.5, 0.0, realWaterDepth));
foamColorWithAlpha.a *= sunFade;
float foamVolumeFactor = foamHeight * FOAM_VOLUME_INTENSITY * foamFactor;
vec3 foamColorWithVolume = mix(foamColorWithAlpha.rgb, foamColorWithAlpha.rgb * 1.2, foamVolumeFactor);
foamColorWithVolume *= foamLightScale;
vec3 waterWithFoam = mix(refraction, foamColorWithVolume, foamColorWithAlpha.a);
float causticDepthFactor = 1.0 - smoothstep(0.0, FOAM_DEPTH_THRESHOLD * 2.5, realWaterDepth);
causticDepthFactor = pow(causticDepthFactor, 5.0);
float sunAngleFactor = max(0.1, sunWorldDir.z);
sunAngleFactor = pow(sunAngleFactor, 1.2);
float rainFactor = 1.0 - clamp(rainIntensity * 2.0, 0.0, 0.9);
float finalCausticIntensity = max(causticIntensity, 0.3) * sunAngleFactor * rainFactor;
vec3 caustics = generateProceduralCaustics(worldPos, waterTimer * 2.0, normalMap);
if (finalCausticIntensity > 0.05) {
caustics = generateProceduralCaustics(worldPos, waterTimer * 2.0, normalMap);
}
vec3 finalWaterColor = waterWithFoam * (1.0 + caustics * finalCausticIntensity * causticDepthFactor);
vec3 finalReflection = reflection;
finalReflection = mix(finalReflection, finalReflection * 1.15, foamVolumeFactor * fresnel);
gl_FragData[0].rgb = mix(finalWaterColor, finalReflection, fresnel);
rainSpecular *= waterTransparency;
gl_FragData[0].rgb += specular * sunSpec.rgb + rainSpecular;
gl_FragData[0].a = 1.0;
#if @waterRefraction && @wobblyShores
vec3 normalShoreRippleRain = texture2D(normalMap, normalCoords(UV, 2.0, 2.7, -1.0 * waterTimer, 0.05, 0.1, normal3)).rgb - 0.5 + texture2D(normalMap, normalCoords(UV, 2.0, 2.7, waterTimer, 0.04, -0.13, normal4)).rgb - 0.5;
float viewFactor = mix(abs(viewDir.z), 1.0, 0.2);
float verticalWaterDepth = realWaterDepth * viewFactor;
float tideSpeed = 0.6;
float tideAmplitude = 1.5;
float timePhase = sin(waterTimer * tideSpeed);
float timeOffset = timePhase * (1.0 - FOAM_SHORE_BIAS * max(0.0, sign(timePhase))) * tideAmplitude;
float shoreTideOffset = sin(waterTimer * FOAM_TIDE_SPEED * 0.25 + worldPos.x * 0.003 * FOAM_TIDE_SCALE + worldPos.y * 0.004 * FOAM_TIDE_SCALE) * FOAM_TIDE_STRENGTH * 0.5;
float shoreOffset = verticalWaterDepth - (normal2.r + mix(0.0, normalShoreRippleRain.r, rainIntensity) + 0.15 + shoreTideOffset - timeOffset) * 4.5;
float fuzzFactor = min(1.0, 1000.0 / surfaceDepth) * viewFactor;
shoreOffset *= fuzzFactor;
shoreOffset = clamp(mix(shoreOffset, 1.0, clamp(linearDepth / WOBBLY_SHORE_FADE_DISTANCE, 0.0, 1.0)), 0.0, 1.0);
float improvedShoreTransition = smoothstep(0.0, 0.25, shoreOffset);
vec3 blendedWater = mix(rawRefraction, gl_FragData[0].rgb, improvedShoreTransition);
if (foamFactor > 0.0) {
float waveContribution = (normal0.z + normal1.z + normal2.z) * 0.33;
waveContribution = (waveContribution + 1.0) * 0.5;
float tideFoamVariation = sin(waterTimer * FOAM_TIDE_SPEED * 0.35 + worldPos.x * 0.004 * FOAM_TIDE_SCALE + worldPos.y * 0.006 * FOAM_TIDE_SCALE) * 0.2 + 1.0;
float shorelineFoamVariation = mix(0.4, 1.3, waveContribution) * tideFoamVariation;
float shorelineFoam = pow(1.0 - improvedShoreTransition, 3.0) * 0.6 * shorelineFoamVariation;
float shoreNoisePattern = foamNoise(UV * 1.5, waterTimer, calculatePatternDepthFactor(realWaterDepth));
shorelineFoam *= mix(0.85, 1.15, shoreNoisePattern);
float foamEdgeAlpha = smoothstep(0.0, 0.3, foamFactor) * baseFoamColor.a;
float viewFoamFactor = max(0.3, abs(dot(normalize(viewDir), vec3(0.0, 0.0, 1.0))));
shorelineFoam *= viewFoamFactor;
float combinedFoam = mix(foamFactor, foamFactor + shorelineFoam, 1.0 - improvedShoreTransition);
float foamDepthFade = 1.0 - smoothstep(0.0, FOAM_DEPTH_THRESHOLD * 0.4, realWaterDepth);
float finalFoamAlpha = combinedFoam * baseFoamColor.a * foamDepthFade * FOAM_TRANSPARENCY_FACTOR * smoothstep(0.0, 0.2, improvedShoreTransition);
blendedWater = mix(blendedWater, foamColorWithAlpha.rgb, finalFoamAlpha);
}
gl_FragData[0].rgb = blendedWater;
#endif
#if @radialFog
float radialDepth = distance(position.xyz, cameraPos);
#else
float radialDepth = 0.0;
#endif
gl_FragData[0] = applyFogAtDist(gl_FragData[0], radialDepth, linearDepth, far);
#if !@disableNormals
gl_FragData[1].rgb = normalize(gl_NormalMatrix * normal) * 0.5 + 0.5;
#endif
// === Foam movement tracking for wetshore sync ===

// Estimate foam movement direction along the shore
vec2 foamUVNow = UV + SHORE_DIRECTION * sin(waterTimer * 0.6);
vec2 foamUVPast = UV + SHORE_DIRECTION * sin((waterTimer - 0.8) * 0.6);

// Project UV positions onto the shore direction
float foamDistNow = dot(foamUVNow, SHORE_DIRECTION);
float foamDistPast = dot(foamUVPast, SHORE_DIRECTION);

// Difference tells us movement direction
float foamMovement = foamDistNow - foamDistPast;

// Negative = receding foam, Positive = advancing foam
// We want wetshore to appear only on receding foam
float recessionFactor = clamp(-foamMovement * 5.0, 0.0, 1.0);

// === Animated Wetshore Band ===
float wetTime = waterTimer - 3.0; // Delayed behind foam

// Transparency control
float wetshoreTransparencyBase = 0.2;
float wetnessVisibility = 0.0; // Start invisible

// Improved shore detection
float shorelineBase = 1.0 - smoothstep(0.0, FOAM_DEPTH_THRESHOLD, realWaterDepth);
float shoreline = pow(shorelineBase, 2.0); // Make the transition sharper

// Control wetshore visibility based on foam movement
wetnessVisibility = recessionFactor; // Wetness is visible when recessionFactor is 1

// Animation for disappearing effect (outer edge moving towards sea)
float animationSpeed = 0.3; // Adjust this value to control the speed of disappearance
float disappearanceFactor = smoothstep(0.0, 5.0, wetTime); // Normalized time factor (adjust 5.0 as needed)

// Apply disappearance animation
float inlandFadeStart = 0.0; // Start of the fade (at the immediate shore)
float inlandFadeEnd = FOAM_DEPTH_THRESHOLD * 0.8; // End of the fade range (adjust 0.8 as needed)
float fadeProgress = smoothstep(inlandFadeStart, inlandFadeEnd, realWaterDepth);
float animatedShoreline = shoreline * (1.0 - fadeProgress * disappearanceFactor);

vec2 wetUV = UV;

// Wobble effect using multiple frequencies and directions
float wobble1 = sin(wetTime * 0.8 + dot(worldPos.xy, vec2(0.012, 0.015))) * 0.05;
float wobble2 = cos(wetTime * 1.3 + dot(worldPos.xy, vec2(-0.01, 0.02))) * 0.03;
float wobble3 = sin(wetTime * 2.2 + worldPos.x * 0.02) * cos(wetTime * 1.7 + worldPos.y * 0.02) * 0.02;

vec2 wobbleOffset = SHORE_DIRECTION * (wobble1 + wobble2) + vec2(wobble3, -wobble3);

// Apply combined wobble to UVs
wetUV += wobbleOffset;

// Create wetness mask that precisely follows the shoreline
float wetMask = animatedShoreline * wetshoreTransparencyBase * wetnessVisibility; // Removed * recessionFactor here as it's already in wetnessVisibility
wetMask = pow(wetMask, 1.4); // softer falloff

// Sample some noise to vary color
float wetNoise = texture2D(normalMap, wetUV * 0.5).r;
wetNoise = (wetNoise - 0.5) * 2.0;

// Create a dark wet tint
vec3 wetColor = vec3(0.02, 0.04, 0.09) * (1.0 + wetNoise * 0.3);

// Add soft reflection
vec3 wetReflection = sampleReflectionMap(screenCoords + wetNoise * 0.01).rgb;
wetColor = mix(wetColor, wetReflection, 0.07);

// Optional sparkle specular
float wetSpec = pow(max(dot(reflect(viewDir, vec3(0.0, 0.0, 1.0)), sunWorldDir), 0.0), 12.0) * 0.15;

// Blend into final image
gl_FragData[0].rgb = mix(gl_FragData[0].rgb, wetColor, wetMask);
gl_FragData[0].rgb += wetSpec * sunSpec.rgb * wetMask;
applyShadowDebugOverlay();
}