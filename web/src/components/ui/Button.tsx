import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseStyles = "px-6 py-3 rounded-full font-semibold transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]";
  const variants = {
    primary: "bg-[oklch(0.82_0.21_130)] text-[#171b25] hover:shadow-[0_24px_70px_-30px_oklch(0.85_0.21_130/0.4)]",
    secondary: "bg-transparent border border-[oklch(0.98_0.01_260/0.15)] text-[oklch(0.98_0.005_140)] hover:border-[oklch(0.82_0.21_130)] hover:text-[oklch(0.82_0.21_130)]"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
