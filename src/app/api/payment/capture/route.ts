import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/app/_lib/services/payment-service';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId } = body;

        const captureData = await PaymentService.capturePayment(orderId);
        console.log("Payment Success -> Capture data:", captureData);
        return NextResponse.json(captureData);

    } catch (error) {
        console.error('Payment error:', error);
        return NextResponse.json(
            { error: 'Payment processing failed' },
            { status: 500 }
        );
    }
}
