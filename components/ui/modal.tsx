"use client";

import { X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
}

export function Modal({
	isOpen,
	onClose,
	title,
	description,
	children,
}: ModalProps) {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}

		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div 
				className="fixed inset-0" 
				style={{
					background: 'rgba(46, 71, 68, 0.8)',
					backdropFilter: 'blur(8px)'
				}}
				onClick={onClose} 
			/>
			<div className="relative rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
				<div className="p-6">{children}</div>
			</div>
		</div>
	);
}
