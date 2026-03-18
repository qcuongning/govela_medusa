
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const keys = req.scope.registrations ? Object.keys(req.scope.registrations) : []
    res.json({
        keys
    })
}
