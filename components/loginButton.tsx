"use client";

import { useLogin } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

export default function LoginButton() {
	const router = useRouter();
	const { login } = useLogin({
		onComplete: (user) => {
			if (user.user) {
				router.replace("/dashboard");
			}
		},
	});

	return (
		<button
			onClick={login}
			className="rounded-full border border-solid border-transparent transition-all duration-200 cursor-pointer flex items-center justify-center bg-foreground text-background gap-2 hover:scale-105 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
			type="button"
		>
			Log in
		</button>
	);
}
