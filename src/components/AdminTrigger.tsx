"use client";

import { useRouter } from "next/navigation";

export default function AdminTrigger({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    const handleDoubleClick = () => {
        router.push("/admin/montante");
    };

    return (
        <span onDoubleClick={handleDoubleClick} className="cursor-default select-none">
            {children}
        </span>
    );
}