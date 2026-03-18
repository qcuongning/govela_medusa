
import {
    createWorkflow,
    WorkflowResponse,
    createStep,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { AMADEUS_MODULE } from "../../modules/amadeus"
import AmadeusService from "../../modules/amadeus/service"

export const getHotelStep = createStep(
    "get-hotel-step",
    async (input: { hotelId: string }, { container }) => {
        const amadeusService = container.resolve(AMADEUS_MODULE) as AmadeusService
        const hotel = await amadeusService.getHotel(input.hotelId)
        return new StepResponse(hotel)
    }
)

export const hotelDetailWorkflow = createWorkflow(
    "hotel-detail",
    (input: { hotelId: string }) => {
        const hotel = getHotelStep(input)
        return new WorkflowResponse(hotel)
    }
)
