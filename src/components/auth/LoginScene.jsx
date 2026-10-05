/* eslint-disable react/no-unknown-property -- three.js props (args, intensity, ...) are valid in R3F */
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";

// Decorative 3D backdrop for the login screen: a glossy "plate" orb with the
// three macro orbs (protein, carbs, fat) circling it. The whole group leans
// toward the pointer. Loaded lazily, so the form never waits on three.js.

const MACROS = [
    { color: "#f43f5e", radius: 0.36, distance: 1.9, speed: 0.45, offset: 0 },
    { color: "#f59e0b", radius: 0.3, distance: 2.2, speed: 0.32, offset: 2.1 },
    { color: "#10b981", radius: 0.24, distance: 1.7, speed: 0.58, offset: 4.2 },
];

function MacroOrb({ color, radius, distance, speed, offset, still }) {
    const ref = useRef();

    useFrame(({ clock }) => {
        const t = still ? offset : clock.getElapsedTime() * speed + offset;
        ref.current.position.set(Math.cos(t) * distance, Math.sin(t * 1.3) * 0.5, Math.sin(t) * distance * 0.6);
    });

    return (
        <mesh ref={ref}>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial color={color} roughness={0.25} metalness={0.15} />
        </mesh>
    );
}

function Rig({ children, still }) {
    const ref = useRef();

    useFrame(({ pointer }, delta) => {
        if (still) return;
        const g = ref.current;
        // Ease toward the pointer instead of snapping to it
        g.rotation.y += (pointer.x * 0.35 - g.rotation.y) * Math.min(1, delta * 2.5);
        g.rotation.x += (-pointer.y * 0.2 - g.rotation.x) * Math.min(1, delta * 2.5);
    });

    // Sits in the upper half of the hero so the headline below stays readable
    return (
        <group position={[0, 1, 0]}>
            <group ref={ref}>{children}</group>
        </group>
    );
}

export default function LoginScene({ still = false }) {
    return (
        <Canvas
            camera={{ position: [0, 0, 8.5], fov: 45 }}
            dpr={[1, 1.75]}
            frameloop={still ? "demand" : "always"}
            gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        >
            <ambientLight intensity={0.6} />
            <directionalLight position={[4, 6, 5]} intensity={1.6} />
            <pointLight position={[-5, -3, 2]} intensity={30} color="#a855f7" />

            <Rig still={still}>
                <Float speed={still ? 0 : 1.4} rotationIntensity={0.4} floatIntensity={0.8}>
                    <mesh>
                        <icosahedronGeometry args={[1.1, 24]} />
                        <MeshDistortMaterial
                            color="#7c6cff"
                            roughness={0.15}
                            metalness={0.2}
                            distort={still ? 0 : 0.32}
                            speed={1.6}
                        />
                    </mesh>
                </Float>
                {MACROS.map((m) => (
                    <MacroOrb key={m.color} {...m} still={still} />
                ))}
                <Sparkles count={40} scale={7} size={2.5} speed={still ? 0 : 0.3} color="#c7d2fe" />
            </Rig>
        </Canvas>
    );
}
