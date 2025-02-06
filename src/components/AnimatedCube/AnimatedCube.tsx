import { FC, useRef, useEffect } from 'react';
import styles from './AnimatedCube.module.scss'; // SCSS import

// Types for coordinates
type Coordinates3D = [number, number, number];
type CoordinatesGroup = Coordinates3D[][];
type ProjectedCoordinatesGroup = [number, number][][];

// Lid coordinates (3D)
const lidCoordinates: CoordinatesGroup = [
  [[-3, 3, 3], [-3, -3, 3], [3, -3, 3], [3, 3, 3], [-3, 3, 3], [-3, 3, 1], [-3, -3, 1], [3, -3, 1], [3, -3, 3]],
  [[3, 1, 3], [-3, 1, 3], [-3, 1, 1]],
  [[3, -1, 3], [-3, -1, 3], [-3, -1, 1]],
  [[-3, -3, 3], [-3, -3, 1]],
  [[-1, -3, 1], [-1, -3, 3], [-1, 3, 3]],
  [[1, -3, 1], [1, -3, 3], [1, 3, 3]],
];

// Base coordinates (3D)
const baseCoordinates: CoordinatesGroup = [
  [[-3, 3, 1], [3, 3, 1], [3, -3, 1], [-3, -3, 1], [-3, 3, 1], [-3, 3, -3], [-3, -3, -3], [3, -3, -3], [3, -3, 1]],
  [[1, -3, -3], [1, -3, 1], [1, 1, 1], [-3, 1, 1], [-3, 1, -3]],
  [[-1, -3, -3], [-1, -3, 1], [-1, -1, 1], [-3, -1, 1], [-3, -1, -3]],
  [[-3, -3, -3], [-3, -3, 1]],
  [[-3, 3, -1], [-3, -3, -1], [3, -3, -1]],
];

const AnimatedCube: FC = () => {
  const lidRef = useRef<SVGPathElement | null>(null);
  const baseRef = useRef<SVGPathElement | null>(null);
  const cubeRef = useRef<SVGGElement | null>(null);

  // Size of the cube
  const u = 4;
  // We'll store animation time in a ref
  const timeRef = useRef<number>(0);

  // Project 3D coordinates into 2D (isometric projection)
  function project(coordinatesGroup: CoordinatesGroup, t: number): ProjectedCoordinatesGroup {
    return coordinatesGroup.map((subGroup) =>
      subGroup.map((coords) => {
        const x = coords[0];
        const y = coords[1];
        const z = coords[2];
        return [
          (x * Math.cos(t) - y * Math.sin(t)) * u + 30,
          (x * -Math.sin(t) - y * Math.cos(t) - z * Math.sqrt(2)) * u / Math.sqrt(3) + 30,
        ];
      })
    );
  }

  // Convert arrays of coordinates into an SVG path string
  function toPath(coordinates: ProjectedCoordinatesGroup): string {
    return 'M' + (
      JSON.stringify(coordinates)
        .replace(/]],\[\[/g, 'M') // start a new 'move' for each sub-path
        .replace(/],\[/g, 'L')    // draw lines between points
        .slice(3, -3)             // remove extra brackets
    );
  }

  // Custom easing function for the lid
  function easing(t: number): number {
    return ((2 - Math.cos(Math.PI * t)) % 2) * (Math.PI / 4);
  }

  // Main animation function
  function tick(): void {
    timeRef.current = (timeRef.current + 1 / 30) % 3;
    const currentT = timeRef.current;

    // Rotate the entire cube each full spin
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotate(${Math.floor(currentT) * 120}deg)`;
    }

    // Apply projected coordinates to the lid
    if (lidRef.current) {
      lidRef.current.setAttribute('d', toPath(project(lidCoordinates, easing(currentT))));
    }

    requestAnimationFrame(tick);
  }

  // Initialize on mount
  useEffect(() => {
    // Set base path once (it doesn't animate)
    if (baseRef.current) {
      baseRef.current.setAttribute('d', toPath(project(baseCoordinates, Math.PI / 4)));
    }

    // Start animation
    requestAnimationFrame(tick);

    // Cleanup if component unmounts
    return () => {
      // Nothing specific to clean here besides canceling the frame if needed
    };
  }, []);

  return (
    <div className={styles.animatedCube}>
      {/* SVG container */}
      <svg 
        viewBox="0 0 60 60"
        width="320"
        stroke="#6D7582"
        strokeLinejoin="round"
      >
        {/* Added transformOrigin so the cube rotates around its center */}
        <g ref={cubeRef} id="cube" style={{ transformOrigin: '30px 30px' }}>
          {/* Base path with fill color */}
          <path ref={baseRef} id="base" fill="#d9d9d9" />
          {/* Lid path with a different fill color */}
          <path ref={lidRef} id="lid" fill="#b3b3b3" />
        </g>
      </svg>
    </div>
  );
};

export default AnimatedCube;
