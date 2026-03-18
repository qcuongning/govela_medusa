
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hotelSearchWorkflow } from "../../../workflows/hotel-search"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const cityCode = (req.query.cityCode as string) || "PAR"

    const { result } = await hotelSearchWorkflow(req.scope).run({
        input: {
            cityCode
        }
    })

    res.json({
        hotels: result
    })
}
