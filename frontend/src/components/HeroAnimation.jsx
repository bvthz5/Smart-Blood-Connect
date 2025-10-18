// src/components/HeroAnimation.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const HeroAnimation = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) {
      console.log('HeroAnimation: Container ref not available');
      return;
    }

    console.log('HeroAnimation: Initializing Three.js scene');

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff4757, 2, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b7a, 1.5, 100);
    pointLight2.position.set(-10, -10, 10);
    scene.add(pointLight2);

    // Create blood drop geometry
    const createBloodDrop = (x, y, z, scale = 1) => {
      const dropGeometry = new THREE.SphereGeometry(0.5 * scale, 32, 32);
      const dropMaterial = new THREE.MeshPhongMaterial({
        color: 0xff4757,
        emissive: 0xff1744,
        emissiveIntensity: 0.3,
        shininess: 100,
        transparent: true,
        opacity: 0.9
      });
      const drop = new THREE.Mesh(dropGeometry, dropMaterial);
      drop.position.set(x, y, z);
      
      // Add random rotation speed
      drop.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        floatSpeed: Math.random() * 0.01 + 0.005,
        floatOffset: Math.random() * Math.PI * 2
      };
      
      return drop;
    };

    // Create heart shape using particles
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 0, y + 0);
    heartShape.bezierCurveTo(x + 0, y - 0.3, x - 0.6, y - 0.3, x - 0.6, y + 0);
    heartShape.bezierCurveTo(x - 0.6, y + 0.3, x + 0, y + 0.6, x + 0, y + 1);
    heartShape.bezierCurveTo(x + 0, y + 0.6, x + 0.6, y + 0.3, x + 0.6, y + 0);
    heartShape.bezierCurveTo(x + 0.6, y - 0.3, x + 0, y - 0.3, x + 0, y + 0);

    const heartGeometry = new THREE.ShapeGeometry(heartShape);
    const heartMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4757,
      emissive: 0xff1744,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const heart = new THREE.Mesh(heartGeometry, heartMaterial);
    heart.position.set(0, 0, -5);
    heart.scale.set(8, 8, 8);
    scene.add(heart);

    // Create floating blood drops
    const drops = [];
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 20;
      const scale = Math.random() * 0.5 + 0.5;
      const drop = createBloodDrop(x, y, z, scale);
      drops.push(drop);
      scene.add(drop);
    }

    // Create particle system
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.15,
      color: 0xff6b7a,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Create DNA helix effect
    const helixGeometry = new THREE.BufferGeometry();
    const helixPoints = [];
    const helixColors = [];
    
    for (let i = 0; i < 200; i++) {
      const angle = (i / 200) * Math.PI * 8;
      const radius = 5;
      const x = Math.cos(angle) * radius;
      const y = (i / 200) * 40 - 20;
      const z = Math.sin(angle) * radius;
      
      helixPoints.push(x, y, z);
      
      const color = new THREE.Color();
      color.setHSL(0.98, 1, 0.5 + Math.sin(angle) * 0.2);
      helixColors.push(color.r, color.g, color.b);
    }
    
    helixGeometry.setAttribute('position', new THREE.Float32BufferAttribute(helixPoints, 3));
    helixGeometry.setAttribute('color', new THREE.Float32BufferAttribute(helixColors, 3));
    
    const helixMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    
    const helix = new THREE.Points(helixGeometry, helixMaterial);
    helix.position.x = -15;
    scene.add(helix);

    // Create plus symbol (medical cross)
    const plusGroup = new THREE.Group();
    
    const plusGeometry1 = new THREE.BoxGeometry(0.5, 3, 0.5);
    const plusGeometry2 = new THREE.BoxGeometry(3, 0.5, 0.5);
    const plusMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0xff4757,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.9
    });
    
    const plusBar1 = new THREE.Mesh(plusGeometry1, plusMaterial);
    const plusBar2 = new THREE.Mesh(plusGeometry2, plusMaterial);
    
    plusGroup.add(plusBar1);
    plusGroup.add(plusBar2);
    plusGroup.position.set(15, 0, 0);
    plusGroup.scale.set(2, 2, 2);
    scene.add(plusGroup);

    // Animation variables
    let time = 0;
    const heartbeatSpeed = 0.05;

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.01;

      // Heartbeat effect
      const heartbeat = 1 + Math.sin(time * heartbeatSpeed * Math.PI * 2) * 0.1;
      heart.scale.set(8 * heartbeat, 8 * heartbeat, 8 * heartbeat);
      heart.rotation.z = Math.sin(time * 0.5) * 0.1;

      // Rotate and float blood drops
      drops.forEach((drop, index) => {
        drop.rotation.x += drop.userData.rotationSpeed.x;
        drop.rotation.y += drop.userData.rotationSpeed.y;
        drop.rotation.z += drop.userData.rotationSpeed.z;
        
        drop.position.y += Math.sin(time + drop.userData.floatOffset) * drop.userData.floatSpeed;
        
        // Reset position if out of bounds
        if (drop.position.y > 20) drop.position.y = -20;
        if (drop.position.y < -20) drop.position.y = 20;
      });

      // Rotate particles
      particlesMesh.rotation.y = time * 0.1;
      particlesMesh.rotation.x = time * 0.05;

      // Rotate helix
      helix.rotation.y = time * 0.2;

      // Rotate plus symbol
      plusGroup.rotation.z = time * 0.3;
      plusGroup.position.y = Math.sin(time * 0.5) * 2;

      // Pulse lights
      pointLight1.intensity = 2 + Math.sin(time * 2) * 0.5;
      pointLight2.intensity = 1.5 + Math.cos(time * 2) * 0.5;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      // Dispose geometries and materials
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="hero-animation-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'transparent'
      }}
    />
  );
};

export default HeroAnimation;
