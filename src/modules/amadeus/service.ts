
import { ICachingModuleService } from "@medusajs/framework/types"

const AMADEUS_BASE_URL = "https://test.api.amadeus.com"

class AmadeusService {
    private cachingModuleService: ICachingModuleService

    constructor(deps: any) {
        // Log to see what we are getting
        this.cachingModuleService = deps.caching || deps.cache

        if (this.cachingModuleService) {
            console.log("Caching service initialized")
        } else {
            console.warn("No caching service found in deps")
        }
    }

    private async cacheGet(key: string) {
        if (!this.cachingModuleService) return null

        console.log(`Cache GET request for key: ${key}`)
        try {
            // Try new API first
            const result = await this.cachingModuleService.get({ key } as any)
            console.log(`Cache GET result for ${key}:`, result)
            if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
                return result
            }
            // If result is not an object, maybe it's the old API returning the value directly
            if (result !== null) return result
            // Fallback for old API if result is null or unexpectedly a string (though we store objects)
            if (typeof (this.cachingModuleService as any).get === 'function') {
                const legacy = await (this.cachingModuleService as any).get(key)
                if (typeof legacy === 'string') {
                    try { return JSON.parse(legacy) } catch { return legacy }
                }
                return legacy
            }
        } catch (e) {
            // Fallback to legacy string API
            try {
                return await (this.cachingModuleService as any).get(key)
            } catch (e2) {
                console.error("Cache GET error:", e2)
            }
        }
        return null
    }

    private async cacheSet(key: string, data: any, ttl?: number) {
        if (!this.cachingModuleService) return

        console.log(`Cache SET request for key: ${key}`)
        try {
            // Try new API first
            await this.cachingModuleService.set({
                key,
                data,
                ttl
            } as any)
        } catch (e) {
            // Fallback to legacy string API
            try {
                await (this.cachingModuleService as any).set(key, data, ttl)
            } catch (e2) {
                console.error("Cache SET error:", e2)
            }
        }
    }

    async getAccessToken() {
        const cached = await this.cacheGet("amadeus_access_token")
        if (cached && (cached as any).token) {
            return (cached as any).token as string
        }

        const apiKey = process.env.AMADEUS_API_KEY
        const apiSecret = process.env.AMADEUS_API_SECRET

        const response = await fetch(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
        })

        const data = await response.json()
        if (data.access_token) {
            const ttl = data.expires_in - 60
            await this.cacheSet("amadeus_access_token", { token: data.access_token }, ttl)
            return data.access_token
        }

        throw new Error("Failed to obtain Amadeus access token")
    }

    async searchHotels(cityCode: string) {
        const cacheKey = `hotels_search_${cityCode}`
        const cachedResults = await this.cacheGet(cacheKey)

        if (cachedResults && (cachedResults as any).hotels) {
            console.log(`Returning cached results for ${cityCode}`)
            return (cachedResults as any).hotels
        }

        try {
            const token = await this.getAccessToken()
            const response = await fetch(
                `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const result = await response.json()
            const hotels = result.data || []

            await this.cacheSet(cacheKey, { hotels }, 3600)

            for (const hotel of hotels) {
                await this.cacheSet(`hotel_detail_${hotel.hotelId}`, { hotel }, 3600 * 24)
            }

            return hotels
        } catch (error) {
            console.error("Amadeus API Error:", error)
            return []
        }
    }

    async getHotel(hotelId: string) {
        const cacheKey = `hotel_detail_${hotelId}`
        const cachedHotel = await this.cacheGet(cacheKey)

        if (cachedHotel && (cachedHotel as any).hotel) {
            console.log(`Returning cached hotel detail for ${hotelId}`)
            return (cachedHotel as any).hotel
        }

        return null
    }
}

export default AmadeusService
