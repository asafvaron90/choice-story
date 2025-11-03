"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold mb-4">Thank You for Your Order!</h1>
            <p className="text-xl mb-8">
                We&apos;re generating your custom storybook now. You&apos;ll receive an email when it&apos;s ready.
            </p>
            {orderId && (
                <p className="text-md text-gray-600 mb-8">
                    Order ID: <span className="font-mono">{orderId}</span>
                </p>
            )}
            <Link
                href="/"
                className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
} 