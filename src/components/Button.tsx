import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}) => {
  let baseClasses = "px-4 py-2 rounded focus:outline-none";
  if (variant === "primary") {
    baseClasses += " bg-blue-500 text-white hover:bg-blue-600";
  } else if (variant === "secondary") {
    baseClasses += " bg-green-500 text-white hover:bg-green-600";
  } else if (variant === "ghost") {
    baseClasses += " bg-transparent text-blue-500 hover:bg-blue-100";
  }
  if (size === "sm") {
    baseClasses += " text-sm";
  } else if (size === "lg") {
    baseClasses += " text-lg";
  }
  return (
    <button className={`${baseClasses} ${className || ""}`} {...props}>
      {children}
    </button>
  );
};

export default Button;