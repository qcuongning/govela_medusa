import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

export default async function fixBaLo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const inventoryService = container.resolve(Modules.INVENTORY);
  const productModuleService = container.resolve(Modules.PRODUCT);

  const variantId = "variant_01KMVW75C8RNJ1END78G7J6PZC";

  logger.info("Fixing inventory for variant: " + variantId);

  // 1. Get the inventory item id for the variant
  const { data: links } = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["inventory_item_id"],
    filters: {
      variant_id: variantId,
    },
  });

  if (!links.length) {
    logger.error("No inventory item link found for variant");
    return;
  }

  const inventoryItemId = links[0].inventory_item_id;
  logger.info("Found inventory item id: " + inventoryItemId);

  // 2. Get the stock locations
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  if (!locations.length) {
    logger.error("No stock locations found");
    return;
  }

  logger.info("Locations: " + JSON.stringify(locations));

  // 3. Update inventory level for EACH location to be sure
  for (const location of locations) {
    const levels = await inventoryService.listInventoryLevels({
      inventory_item_id: inventoryItemId,
      location_id: location.id,
    });

    if (levels.length) {
      logger.info("Updating existing level for location: " + location.name);
      await inventoryService.updateInventoryLevels([
        {
            selection: { inventory_item_id: inventoryItemId, location_id: location.id },
            update: { stocked_quantity: 1000 }
        }
      ]);
    } else {
      logger.info("Creating new level for location: " + location.name);
      await inventoryService.createInventoryLevels([
        {
          inventory_item_id: inventoryItemId,
          location_id: location.id,
          stocked_quantity: 1000,
        },
      ]);
    }
  }

  logger.info("Inventory fix completed for Ba lo!");
}
