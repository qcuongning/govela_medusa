import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    // Forward to standard hook
    const response = await fetch(`${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/hooks/payment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Stripe-Signature": req.headers["stripe-signature"] as string,
        },
        body: JSON.stringify(req.body),
    });

    res.status(response.status).send(await response.text());
}
