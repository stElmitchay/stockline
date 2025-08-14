import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "outline" | "ghost";
	size?: "sm" | "md" | "lg";
	children: React.ReactNode;
}

export function Button({
	variant = "primary",
	size = "md",
	className = "",
	children,
	...props
}: ButtonProps) {
	const baseClasses =
		"inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105";

	const variants = {
		primary: "bg-blue-600 text-white",
		secondary: "bg-gray-700 text-white",
		outline:
			"border border-gray-600 text-gray-300",
		ghost: "text-gray-300",
	};

	const sizes = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-sm",
		lg: "px-6 py-3 text-base",
	};

	return (
		<button
			className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}
