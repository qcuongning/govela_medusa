
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hotelDetailWorkflow } from "../../../../workflows/hotel-detail"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { id } = req.params

    const { result } = await hotelDetailWorkflow(req.scope).run({
        input: {
            hotelId: id
        }
    })

    if (!result) {
        return res.status(404).json({
            message: "Hotel not found in cache"
        })
    }

    res.json({
        hotel: result
    })
}
