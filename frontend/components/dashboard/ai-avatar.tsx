"use client";

import { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ================================================================
   PROCEDURAL AI COMPANION — "JobAgent"

   Friendly indigo orb with:
   - 3D sphereGeometry eyes with gaze tracking
   - Smiley semi-circle mouth (TorusGeometry arc) that opens for speech
   - Eyebrows that follow cursor direction
   - Natural blink, breathing, fidget, squash/stretch
   - No post-processing (clean transparent background)
   ================================================================ */

/* ---- Animation state types ---- */
interface ExprState {
    tEyeOpen: number; tPupilScale: number; tMouthOpen: number;
    tBrowRaise: number; tGlow: number; tBobSpeed: number;
    eyeOpen: number; pupilScale: number; mouthOpen: number;
    browRaise: number; glow: number;
}
interface BlinkState { next: number; phase: number; dbl: boolean; dblDone: boolean; }
interface FidgetState { next: number; tx: number; tz: number; end: number; }

/* ---- Smile arc geometry (tube along a semi-circle CatmullRom curve) ---- */
function useSmileGeometry() {
    return useMemo(() => {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 32; i++) {
            const angle = Math.PI + (i / 32) * Math.PI;
            pts.push(new THREE.Vector3(Math.cos(angle) * 0.06, Math.sin(angle) * 0.03, 0));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        return new THREE.TubeGeometry(curve, 32, 0.005, 8, false);
    }, []);
}

/* ---- Eyebrow arc geometry (tube along a wider arc that covers the eye) ---- */
function useEyebrowGeometry() {
    return useMemo(() => {
        const pts: THREE.Vector3[] = [];
        // Arc spanning ~140 degrees, wider and flatter than smile
        for (let i = 0; i <= 24; i++) {
            const angle = Math.PI * 0.15 + (i / 24) * Math.PI * 0.7; // 0.15π to 0.85π
            pts.push(new THREE.Vector3(Math.cos(angle) * 0.1, Math.sin(angle) * 0.025, 0));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        return new THREE.TubeGeometry(curve, 24, 0.012, 8, false);
    }, []);
}

/* ================================================================
   COMPANION CHARACTER — all geometry + animation
   ================================================================ */
function CompanionCharacter({
    active,
    speaking,
    pointerRef,
}: {
    active: boolean;
    speaking: boolean;
    pointerRef: React.RefObject<{ x: number; y: number }>;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Mesh>(null);
    const auraRef = useRef<THREE.Mesh>(null);

    // Eyes
    const lEyeGrp = useRef<THREE.Group>(null);
    const rEyeGrp = useRef<THREE.Group>(null);
    const lIris = useRef<THREE.Mesh>(null);
    const rIris = useRef<THREE.Mesh>(null);
    const lPupil = useRef<THREE.Mesh>(null);
    const rPupil = useRef<THREE.Mesh>(null);
    const lHi = useRef<THREE.Mesh>(null);
    const rHi = useRef<THREE.Mesh>(null);

    // Eyebrows
    const lBrow = useRef<THREE.Mesh>(null);
    const rBrow = useRef<THREE.Mesh>(null);

    // Mouth
    const smileLineRef = useRef<THREE.Mesh>(null);
    const openMouthRef = useRef<THREE.Mesh>(null);

    // Neck
    const neckRef = useRef<THREE.Mesh>(null);

    // Geometries
    const smileGeo = useSmileGeometry();
    const browGeo = useEyebrowGeometry();

    // State refs
    const expr = useRef<ExprState>({
        tEyeOpen: 1, tPupilScale: 1, tMouthOpen: 0,
        tBrowRaise: 0, tGlow: 0.15, tBobSpeed: 1,
        eyeOpen: 1, pupilScale: 1, mouthOpen: 0, browRaise: 0, glow: 0.15,
    });
    const blink = useRef<BlinkState>({ next: 2 + Math.random() * 2, phase: -1, dbl: false, dblDone: false });
    const fidget = useRef<FidgetState>({ next: 5 + Math.random() * 5, tx: 0, tz: 0, end: 0 });
    const gaze = useRef({ x: 0, y: 0 });
    const prevSpk = useRef(false);
    const bounce = useRef({ on: false, t0: 0 });

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        const e = expr.current;
        const sp = delta * 8;

        // 1. Expression targets
        if (speaking) {
            e.tEyeOpen = 1; e.tPupilScale = 1; e.tBrowRaise = 0.4;
            e.tGlow = 0.15; e.tBobSpeed = 1.2;
        } else if (!active) {
            e.tEyeOpen = 0.12; e.tPupilScale = 1; e.tMouthOpen = 0;
            e.tBrowRaise = -0.15; e.tGlow = 0.06; e.tBobSpeed = 0.4;
        } else {
            e.tEyeOpen = 1; e.tPupilScale = 1; e.tMouthOpen = 0;
            e.tBrowRaise = 0; e.tGlow = 0.15; e.tBobSpeed = 1;
        }

        // 2. Speaking mouth
        if (speaking) {
            e.tMouthOpen = Math.abs(Math.sin(t * 8)) * 0.45
                + Math.abs(Math.sin(t * 12.7)) * 0.3
                + Math.abs(Math.sin(t * 5.3)) * 0.25;
        }

        // 3. Bounce on transition
        if (speaking && !prevSpk.current) bounce.current = { on: true, t0: t };
        prevSpk.current = speaking;

        // 4. Lerp
        e.eyeOpen = THREE.MathUtils.lerp(e.eyeOpen, e.tEyeOpen, sp);
        e.pupilScale = THREE.MathUtils.lerp(e.pupilScale, e.tPupilScale, sp);
        e.mouthOpen = THREE.MathUtils.lerp(e.mouthOpen, e.tMouthOpen, sp);
        e.browRaise = THREE.MathUtils.lerp(e.browRaise, e.tBrowRaise, sp);
        e.glow = THREE.MathUtils.lerp(e.glow, e.tGlow, sp);

        // 5. Blink
        const b = blink.current;
        if (b.phase < 0 && t > b.next) {
            b.phase = 0; b.next = t + 2 + Math.random() * 3;
            b.dbl = Math.random() < 0.2; b.dblDone = false;
        }
        let bm = 1;
        if (b.phase >= 0) {
            b.phase += delta;
            if (b.phase < 0.06) bm = 1 - b.phase / 0.06;
            else if (b.phase < 0.12) bm = (b.phase - 0.06) / 0.06;
            else {
                bm = 1;
                if (b.dbl && !b.dblDone) { b.phase = -0.08; b.dblDone = true; b.next = t + 0.08; }
                else b.phase = -1;
            }
        }
        const eyeY = Math.max(0.05, e.eyeOpen * bm);

        // 6. Fidget
        const f = fidget.current;
        if (active && !speaking && t > f.next) {
            f.tx = (Math.random() - 0.5) * 0.1; f.tz = (Math.random() - 0.5) * 0.08;
            f.end = t + 1.5 + Math.random(); f.next = t + 5 + Math.random() * 5;
        }
        if (t > f.end) {
            f.tx = THREE.MathUtils.lerp(f.tx, 0, sp * 0.5);
            f.tz = THREE.MathUtils.lerp(f.tz, 0, sp * 0.5);
        }

        // 7. Gaze
        const ptr = pointerRef.current;
        gaze.current.x = THREE.MathUtils.lerp(gaze.current.x, (ptr?.x ?? 0) * 0.035, delta * 5);
        gaze.current.y = THREE.MathUtils.lerp(gaze.current.y, (ptr?.y ?? 0) * 0.025, delta * 5);
        const gx = THREE.MathUtils.clamp(gaze.current.x, -0.035, 0.035);
        const gy = THREE.MathUtils.clamp(gaze.current.y, -0.025, 0.025);

        /* ======== APPLY ======== */
        const g = groupRef.current;
        if (!g) return;

        // Bob
        const bs = e.tBobSpeed;
        g.position.y = Math.sin(t * 1.2 * bs) * 0.012 + Math.sin(t * 0.7 * bs) * 0.006 + Math.sin(t * 2.1 * bs) * 0.003;

        // Head rotation (gaze + fidget)
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, gx * 2 + f.tx, delta * 4);
        g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -gy * 0.5 + f.tz, delta * 4);
        if (speaking) g.rotation.x += Math.sin(t * 3) * 0.01;
        g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, f.tz * 0.5, delta * 3);

        // Body breathing + squash
        if (bodyRef.current) {
            const br = 1 + Math.sin(t * 1.8) * 0.012 + Math.sin(t * 0.9) * 0.006;
            let sx = br, sy = br, sz = br;
            if (bounce.current.on) {
                const el = t - bounce.current.t0;
                if (el < 0.4) {
                    const bn = Math.sin(el * Math.PI * 5) * Math.exp(-el * 6) * 0.06;
                    sy = br + bn; sx = br - bn * 0.5; sz = br - bn * 0.5;
                } else bounce.current.on = false;
            }
            bodyRef.current.scale.set(sx, sy, sz);
            (bodyRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = e.glow;
        }

        // Eyes: blink + gaze
        const applyEye = (grp: THREE.Group | null, iris: THREE.Mesh | null, pupil: THREE.Mesh | null, hi: THREE.Mesh | null) => {
            if (grp) grp.scale.y = THREE.MathUtils.lerp(grp.scale.y, eyeY, delta * 18);
            if (iris) {
                iris.position.x = THREE.MathUtils.lerp(iris.position.x, gx, delta * 6);
                iris.position.y = THREE.MathUtils.lerp(iris.position.y, gy, delta * 6);
            }
            if (pupil) {
                pupil.position.x = THREE.MathUtils.lerp(pupil.position.x, gx * 1.1, delta * 6);
                pupil.position.y = THREE.MathUtils.lerp(pupil.position.y, gy * 1.1, delta * 6);
                pupil.scale.setScalar(e.pupilScale);
            }
            if (hi) { hi.position.x = 0.025 + gx * 0.5; hi.position.y = 0.028 + gy * 0.5; }
        };
        applyEye(lEyeGrp.current, lIris.current, lPupil.current, lHi.current);
        applyEye(rEyeGrp.current, rIris.current, rPupil.current, rHi.current);

        // Eyebrows: follow cursor + raise/lower with state
        const browBaseY = 0.22 + e.browRaise * 0.03;
        const browOffsetX = gx * 3;   // follow cursor horizontally
        const browOffsetY = gy * 1.5;  // follow cursor vertically
        if (lBrow.current) {
            lBrow.current.position.y = THREE.MathUtils.lerp(lBrow.current.position.y, browBaseY + browOffsetY, delta * 6);
            lBrow.current.position.x = THREE.MathUtils.lerp(lBrow.current.position.x, -0.15 + browOffsetX, delta * 6);
            // Tilt brows based on horizontal gaze
            lBrow.current.rotation.z = THREE.MathUtils.lerp(lBrow.current.rotation.z, 0.12 + gx * 2, delta * 6);
        }
        if (rBrow.current) {
            rBrow.current.position.y = THREE.MathUtils.lerp(rBrow.current.position.y, browBaseY + browOffsetY, delta * 6);
            rBrow.current.position.x = THREE.MathUtils.lerp(rBrow.current.position.x, 0.15 + browOffsetX, delta * 6);
            rBrow.current.rotation.z = THREE.MathUtils.lerp(rBrow.current.rotation.z, -0.12 + gx * 2, delta * 6);
        }

        // Mouth: smile line fades out when speaking, open mouth circle fades in
        if (smileLineRef.current) {
            const mat = smileLineRef.current.material as THREE.MeshStandardMaterial;
            // Smile visible when NOT speaking, fades when mouth opens
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, e.mouthOpen > 0.1 ? 0 : 0.9, delta * 10);
        }
        if (openMouthRef.current) {
            // Open mouth appears during speech
            const vis = e.mouthOpen > 0.05;
            openMouthRef.current.visible = vis;
            if (vis) {
                const sc = 0.3 + e.mouthOpen * 0.7;
                openMouthRef.current.scale.set(sc * 1.2, sc * 0.7, 1);
            }
        }

        // Aura
        if (auraRef.current) {
            const ap = active ? 1 + Math.sin(t * 2) * 0.04 + (speaking ? Math.sin(t * 6) * 0.02 : 0) : 0.95;
            auraRef.current.scale.setScalar(ap);
            const am = auraRef.current.material as THREE.MeshStandardMaterial;
            am.opacity = e.glow * 0.3; am.emissiveIntensity = e.glow * 1.5;
        }

        // Neck — subtle sway following head
        if (neckRef.current) {
            neckRef.current.rotation.z = THREE.MathUtils.lerp(neckRef.current.rotation.z, g.rotation.y * 0.3, delta * 3);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Aura */}
            <mesh ref={auraRef} position={[0, 0, -0.3]}>
                <sphereGeometry args={[0.65, 32, 32]} />
                <meshStandardMaterial color="#7C5EF5" transparent opacity={0.04}
                    emissive="#7C5EF5" emissiveIntensity={0.2} side={THREE.BackSide} depthWrite={false} />
            </mesh>

            {/* Body */}
            <mesh ref={bodyRef}>
                <sphereGeometry args={[0.5, 64, 64]} />
                <meshPhysicalMaterial color="#6366F1" roughness={0.25} metalness={0.08}
                    clearcoat={0.8} clearcoatRoughness={0.15} emissive="#7C5EF5" emissiveIntensity={0.15} />
            </mesh>

            {/* LEFT EYE */}
            <group ref={lEyeGrp} position={[-0.15, 0.06, 0.42]}>
                <mesh><sphereGeometry args={[0.105, 32, 32]} />
                    <meshPhysicalMaterial color="#FFFFFF" roughness={0.08} clearcoat={0.6} /></mesh>
                <mesh ref={lIris} position={[0, 0, 0.055]}>
                    <sphereGeometry args={[0.062, 32, 32]} />
                    <meshStandardMaterial color="#4338CA" roughness={0.15} /></mesh>
                <mesh ref={lPupil} position={[0, 0, 0.075]}>
                    <sphereGeometry args={[0.032, 16, 16]} />
                    <meshStandardMaterial color="#0A0020" roughness={0.05} /></mesh>
                <mesh ref={lHi} position={[0.025, 0.028, 0.095]}>
                    <sphereGeometry args={[0.013, 8, 8]} />
                    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} toneMapped={false} /></mesh>
                <mesh position={[-0.012, -0.01, 0.09]}>
                    <sphereGeometry args={[0.005, 8, 8]} />
                    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} toneMapped={false} /></mesh>
            </group>

            {/* RIGHT EYE */}
            <group ref={rEyeGrp} position={[0.15, 0.06, 0.42]}>
                <mesh><sphereGeometry args={[0.105, 32, 32]} />
                    <meshPhysicalMaterial color="#FFFFFF" roughness={0.08} clearcoat={0.6} /></mesh>
                <mesh ref={rIris} position={[0, 0, 0.055]}>
                    <sphereGeometry args={[0.062, 32, 32]} />
                    <meshStandardMaterial color="#4338CA" roughness={0.15} /></mesh>
                <mesh ref={rPupil} position={[0, 0, 0.075]}>
                    <sphereGeometry args={[0.032, 16, 16]} />
                    <meshStandardMaterial color="#0A0020" roughness={0.05} /></mesh>
                <mesh ref={rHi} position={[0.025, 0.028, 0.095]}>
                    <sphereGeometry args={[0.013, 8, 8]} />
                    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} toneMapped={false} /></mesh>
                <mesh position={[-0.012, -0.01, 0.09]}>
                    <sphereGeometry args={[0.005, 8, 8]} />
                    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} toneMapped={false} /></mesh>
            </group>

            {/* EYEBROWS — semicircle arcs covering the eyes */}
            <mesh ref={lBrow} position={[-0.15, 0.19, 0.43]} rotation={[0, 0, 0.08]} geometry={browGeo}>
                <meshPhysicalMaterial color="#4338CA" roughness={0.35} clearcoat={0.4} />
            </mesh>
            <mesh ref={rBrow} position={[0.15, 0.19, 0.43]} rotation={[0, 0, -0.08]} geometry={browGeo}>
                <meshPhysicalMaterial color="#4338CA" roughness={0.35} clearcoat={0.4} />
            </mesh>

            {/* MOUTH — smiley semi-circle arc (always visible, fades during speech) */}
            <mesh ref={smileLineRef} position={[0, -0.16, 0.46]} geometry={smileGeo}>
                <meshStandardMaterial color="#3730A3" transparent opacity={0.9} />
            </mesh>

            {/* Open mouth circle (visible during speech) */}
            <mesh ref={openMouthRef} position={[0, -0.16, 0.45]} visible={false}>
                <sphereGeometry args={[0.04, 24, 24]} />
                <meshStandardMaterial color="#1E1B4B" roughness={0.9} />
            </mesh>

            {/* NECK — small cylinder at the bottom */}
            <mesh ref={neckRef} position={[0, -0.52, 0]}>
                <cylinderGeometry args={[0.12, 0.14, 0.1, 16]} />
                <meshPhysicalMaterial color="#5558E6" roughness={0.3} metalness={0.05}
                    clearcoat={0.6} clearcoatRoughness={0.2} emissive="#6366F1" emissiveIntensity={0.08} />
            </mesh>
        </group>
    );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export function AIAvatar({
    active,
    speaking = false,
    size = 110,
}: {
    active: boolean;
    speaking?: boolean;
    size?: number;
}) {
    const pointerRef = useRef({ x: 0, y: 0 });

    return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <Canvas
                camera={{ position: [0, 0, 1.8], fov: 38 }}
                gl={{ antialias: true, alpha: true }}
                style={{ background: "transparent" }}
                onPointerMove={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                    pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
                }}
            >
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[2, 3, 4]} intensity={0.9} color="#F5F0FF" />
                    <directionalLight position={[-2, 1, 3]} intensity={0.3} color="#D4CCFF" />
                    <directionalLight position={[0, -1, 2]} intensity={0.15} color="#E8E0FF" />
                    <pointLight position={[0, 0.5, 2]} intensity={0.2} color="#FFFFFF" />
                    <directionalLight position={[0, 0, -3]} intensity={0.25} color="#8B7AE8" />

                    <CompanionCharacter active={active} speaking={speaking} pointerRef={pointerRef} />
                </Suspense>
            </Canvas>
        </div>
    );
}
