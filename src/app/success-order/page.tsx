"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslation } from "@/app/hooks/useTranslation";

// Force dynamic rendering to prevent build-time errors with useSearchParams
export const dynamic = 'force-dynamic';

function SuccessPageContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');

    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold mb-4">{t.successOrder.thankYou}</h1>
            <p className="text-xl mb-8">
                {t.successOrder.generatingMessage}
            </p>
            {orderId && (
                <p className="text-md text-gray-600 mb-8">
                    {t.successOrder.orderId} <span className="font-mono">{orderId}</span>
                </p>
            )}
            <Link
                href="/"
                className="inline-block bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
                {t.successOrder.returnHome}
            </Link>
        </div>
    );
}

function SuccessPageFallback() {
    const { t } = useTranslation();
    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold mb-4">{t.successOrder.thankYou}</h1>
            <p className="text-xl mb-8">{t.common.loading}</p>
        </div>
    );
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<SuccessPageFallback />}>
            <SuccessPageContent />
        </Suspense>
    );
}
