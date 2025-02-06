import React, { useEffect, useRef, useState } from "react";
import "./TypingEffect.css";

interface TypingEffectProps {
  init: string;      // Static phrase to display initially
  words: string[];   // Array of words to type and erase
}

export const TypingEffect: React.FC<TypingEffectProps> = ({ init, words }) => {
  // Local state for the text that is typed
  const [typedText, setTypedText] = useState<string>("");
  // Index to track which word from the array is currently active
  const [wordIndex, setWordIndex] = useState<number>(0);
  // Index to track the character position within the current word
  const [charIndex, setCharIndex] = useState<number>(0);
  // Whether we are currently deleting characters
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Timings (in ms)
  const typingDelay = 200;
  const erasingDelay = 100;
  const newTextDelay = 2000; // Delay after finishing a word, before erasing

  // A reference to keep track of the setTimeout, so we can clear if needed
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const currentWord: string = words[wordIndex];

    // Determine speed based on typing or erasing
    const speed: number = isDeleting ? erasingDelay : typingDelay;

    // If we are still typing/erasing the current word
    if (!isDeleting && charIndex < currentWord.length) {
      // Typing forward
      timeoutRef.current = window.setTimeout(() => {
        setTypedText(currentWord.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);
      }, speed);
    } else if (isDeleting && charIndex > 0) {
      // Erasing backward
      timeoutRef.current = window.setTimeout(() => {
        setTypedText(currentWord.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);
      }, speed);
    } else {
      // If we've just finished typing the word
      if (!isDeleting && charIndex === currentWord.length) {
        // Pause before erasing
        timeoutRef.current = window.setTimeout(() => {
          setIsDeleting(true);
        }, newTextDelay);
      }
      // If we've just finished erasing
      else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }
    }

    return () => {
      // Cleanup the timeout if component unmounts or re-renders
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [charIndex, isDeleting, wordIndex, words]);

  // Add "typing" class to the cursor when actively typing/erasing
  const isCursorTyping: boolean = (isDeleting && charIndex > 0) || (!isDeleting && charIndex < words[wordIndex].length);

  return (
    <div className="container">
      <p>
        <span className="non-typed-text">{init}</span> <span className="typed-text">{typedText}</span>
        <span className={`cursor ${isCursorTyping ? "typing" : ""}`}>&nbsp;</span>
      </p>
    </div>
  );
};
