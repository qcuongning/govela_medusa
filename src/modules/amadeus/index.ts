
import AmadeusService from "./service"
import { Module } from "@medusajs/framework/utils"

export const AMADEUS_MODULE = "amadeus"

export default Module(AMADEUS_MODULE, {
    service: AmadeusService,
})
