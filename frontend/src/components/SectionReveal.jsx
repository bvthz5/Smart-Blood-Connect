// src/components/SectionReveal.jsx
import React, { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function SectionReveal({ 
  children, 
  delay = 0, 
  stagger = 0.1, 
  y = 30,
  className = '',
  ...props 
}) {
  const sectionRef = useRef(null)

  useEffect(() => {
    if (!sectionRef.current) return

    const elements = sectionRef.current.children
    if (elements.length === 0) return

    // Set initial state
    gsap.set(elements, { opacity: 0, y: y })

    // Create scroll trigger animation
    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      end: "bottom 20%",
      onEnter: () => {
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: stagger,
          delay: delay,
          ease: "power3.out"
        })
      }
    })

    return () => {
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === sectionRef.current) {
          trigger.kill()
        }
      })
    }
  }, [delay, stagger, y])

  return (
    <div ref={sectionRef} className={`section-reveal ${className}`} {...props}>
      {children}
    </div>
  )
}
