export interface PaymentOrder {
    id: string;
    status: string;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

export interface PaymentCapture {
    id: string;
    status: string;
    payment_source: {
        paypal: {
            email_address: string;
            account_id: string;
            name: {
                given_name: string;
                surname: string;
            };
            address: {
                country_code: string;
            };
        };
    };
    purchase_units: Array<{
        reference_id: string;
        shipping: {
            name: {
                full_name: string;
            };
            address: {
                address_line_1: string;
                admin_area_2: string;
                admin_area_1: string;
                postal_code: string;
                country_code: string;
            };
        };
        payments: {
            captures: Array<{
                id: string;
                status: string;
                amount: {
                    currency_code: string;
                    value: string;
                };
            }>;
        };
    }>;
}

export class PaymentService {
    private static readonly PAYPAL_API_URL = 'https://api-m.paypal.com';

    private static async getAccessToken(): Promise<string> {
        const clientId = process.env.PAYPAL_CLIENT_ID;
        const secret = process.env.PAYPAL_SECRET;

        if (!clientId || !secret) {
            console.error('Environment variables:', {
                clientId: process.env.PAYPAL_CLIENT_ID,
                hasSecret: !!process.env.PAYPAL_SECRET
            });
            throw new Error('PayPal credentials are not configured in environment variables');
        }

        const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

        try {
            const response = await fetch(`${this.PAYPAL_API_URL}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                const errorData = await response.text();
                console.error('PayPal API Error:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    error: errorData
                });
                throw new Error(`Failed to get access token. Status: ${response.status}. Response: ${errorData}`);
            }

            const data = await response.json();

            if (!data.access_token) {
                throw new Error(`No access token in response: ${JSON.stringify(data)}`);
            }

            return data.access_token;
        } catch (error) {
            console.error('Error getting PayPal access token:', error);
            throw error;
        }
    }

    static async createOrder(): Promise<PaymentOrder> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.PAYPAL_API_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'ILS',
                        value: '9.99'  // Price for the book
                    },
                    description: 'Custom Children\'s Story Book'
                }]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create PayPal order');
        }

        return response.json();
    }

    static async capturePayment(orderId: string): Promise<PaymentCapture> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to capture PayPal payment');
        }

        return response.json();
    }
}
