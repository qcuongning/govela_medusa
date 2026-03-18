
import {
    createWorkflow,
    WorkflowResponse,
    createStep,
    StepResponse
} from "@medusajs/framework/workflows-sdk"
import { AMADEUS_MODULE } from "../../modules/amadeus"
import AmadeusService from "../../modules/amadeus/service"

export const searchHotelsStep = createStep(
    "search-hotels-step",
    async (input: { cityCode: string }, { container }) => {
        const amadeusService = container.resolve(AMADEUS_MODULE) as AmadeusService
        const hotels = await amadeusService.searchHotels(input.cityCode)
        return new StepResponse(hotels)
    }
)

export const hotelSearchWorkflow = createWorkflow(
    "hotel-search",
    (input: { cityCode: string }) => {
        const hotels = searchHotelsStep(input)
        return new WorkflowResponse(hotels)
    }
)
