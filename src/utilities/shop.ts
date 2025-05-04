import axios from "axios";
import fs from "fs/promises";
import path from "path";
import log from "../utilities/structs/log.js";
import { dirname } from "dirname-filename-esm";
import { ShopResponse } from "../types/typings";

const __dirname = dirname(import.meta);

const RaritiesMap = {
    "star wars series": {
      AthenaCharacter: 5000,
      AthenaBackpack: 2000,
      AthenaPickaxe: 1500,
      AthenaDance: 1500,
    },
    "slurp series": {
        AthenaCharacter: 5000,
        AthenaBackpack: 2000,
        AthenaPickaxe: 1500,
        AthenaDance: 1500,
    },
    "shadow series": {
        AthenaCharacter: 5000,
        AthenaBackpack: 2000,
        AthenaPickaxe: 1500,
        AthenaDance: 1500,
    },
    "icon series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "dc series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "marvel series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "lava series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "frozen series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "dark series": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 500,
      AthenaItemWrap: 800,
    },
    "legendary": {
      AthenaCharacter: 2000,
      AthenaBackpack: 1500,
      AthenaPickaxe: 1500,
      AthenaGlider: 1800,
      AthenaDance: 800,
      AthenaItemWrap: 800,
    },
    "epic": {
      AthenaCharacter: 1500,
      AthenaBackpack: 1200,
      AthenaPickaxe: 1200,
      AthenaGlider: 1500,
      AthenaDance: 800,
      AthenaItemWrap: 800,
    },
    "rare": {
      AthenaCharacter: 1200,
      AthenaBackpack: 800,
      AthenaPickaxe: 800,
      AthenaGlider: 800,
      AthenaDance: 500,
      AthenaItemWrap: 600,
    },
    "uncommon": {
      AthenaCharacter: 800,
      AthenaBackpack: 200,
      AthenaPickaxe: 500,
      AthenaGlider: 500,
      AthenaDance: 200,
      AthenaItemWrap: 300,
    },
    "common": {
      AthenaCharacter: 500,
      AthenaBackpack: 200,
      AthenaPickaxe: 500,
      AthenaGlider: 500,
      AthenaDance: 200,
      AthenaItemWrap: 300,
    },
  };

  const donatorItems = ['Renegade Raider', 'Ghoul Trooper', 'Aerial Assault Trooper', 'Skull Trooper', 'Mako', "Raider's Revenge", 'Wonder', 'Honor Guard', 'Dark Razor', 'Icicle', 'Spectral Spine', 'Shattered Wing']
  
  class Shop {
    private static async getItemValue(rarity: string, itemType: string): Promise<number> {
      const rarityValues = RaritiesMap[rarity.toLowerCase()];
      if (rarityValues && rarityValues[itemType]) {
          return rarityValues[itemType];
      } else {
          return 800;
      }
    }
  
    private static async getShopData() {
      const featuredURL =
          "https://fortnite-api.com/v2/cosmetics/br/search/all?hasFeaturedImage=true&displayType=outfit";
      const dailyURL = "https://fortnite-api.com/v2/cosmetics";

      const featuredResponse = await axios.get(featuredURL);
      const dailyResponse = await axios.get(dailyURL);
  
      const featuredItems = featuredResponse.data.data.filter(
          (item: any) =>
              item.introduction &&
              parseInt(item.introduction.chapter) <= 2 &&
              parseInt(item.introduction.season) <= 3 &&
              item.rarity.displayValue &&
              !donatorItems.includes(item.name)
      );

      const selectedFeatured = featuredItems
          .sort(() => 0.5 - Math.random())
          .slice(0, 4);

      const dailyItems: any[] = [];
      const dailyTypes = [
          { type: "AthenaCharacter", count: 2 },
          { type: "AthenaDance", count: 1 },
          { type: "AthenaPickaxe", count: 1 },
          { type: "AthenaBackpack", count: 1 },
          { type: "AthenaGlider", count: 1 },
      ];
  
      for (const { type, count } of dailyTypes) {
        try {
            const dailyItemsResponse = dailyResponse.data?.data.br || [];
            const items = dailyItemsResponse.filter(
                (item: any) => item.type?.backendValue === type && item.introduction && parseInt(item.introduction.chapter) <= 2 && parseInt(item.introduction.season) <= 3 && !donatorItems.includes(item.name)
            );
            dailyItems.push(...items.sort(() => 0.5 - Math.random()).slice(0, count));
        } catch (error) {
            console.error(`Error processing items of type ${type}:`, error);
        }
      }
      const processDaily = async (item: any) => {
        const rarity = item.rarity?.displayValue?.toLowerCase() || ''; 
        const type = item.type?.backendValue || ''; 
        const name = item.name;
        let price = await this.getItemValue(rarity, type);
        let image;
        image = item.images?.icon;
        const shopName = `${type}:${item.id}`;
    
        return {
            shopName,  
            price,
            image,
            name
        };
    };
      const processFeatured = async (item: any) => {
        const rarity = item.rarity?.displayValue?.toLowerCase() || ''; 
        const type = item.type?.backendValue || ''; 
        const name = item.name;
        let price = await this.getItemValue(rarity, type);
        let image;
        if (item.images?.featured)
          {
            image = item.images?.featured;
          }
          else
          {
            image = item.images?.icon;
          }
        const shopName = `${type}:${item.id}`;
    
        return {
            shopName,  
            price,
            image,
            name
        };
    };
  
      const featuredShopItems = await Promise.all(selectedFeatured.map(processFeatured));
      const dailyShopItems = await Promise.all(dailyItems.map(processDaily));

      const shopData = {
          featured: featuredShopItems,
          daily: dailyShopItems,
      };
  
      return shopData;
    }
  
    public static async updateShop(): Promise<ShopResponse[] | boolean[]> {
      const shopData = await this.getShopData();
  
      const dailyItems = shopData.daily;
      const featuredItems = shopData.featured;
  
      const catalogString = JSON.stringify({
          daily1: { price: 0, itemGrants: [] },
          daily2: { price: 0, itemGrants: [] },
          daily3: { price: 0, itemGrants: [] },
          daily4: { price: 0, itemGrants: [] },
          daily5: { price: 0, itemGrants: [] },
          daily6: { price: 0, itemGrants: [] },
          featured1: { price: 0, itemGrants: [] },
          featured2: { price: 0, itemGrants: [] },
          featured3: { price: 0, itemGrants: [] },
          featured4: { price: 0, itemGrants: [] },
      });
  
      const catalogRaw = JSON.stringify({
        refreshIntervalHrs: 24,
        dailyPurchaseHrs: 24,
        expiration: "",
        storefronts: [
            {
                name: "BRDailyStorefront",
                catalogEntries: []
            },
            {
                name: "BRWeeklyStorefront",
                catalogEntries: []
            },
            {
                name: "BRSeasonStorefront",
                catalogEntries: [ ]
            },
            {
              name: "BRSeason13",
              catalogEntries: [
                {
                  offerId: "3C1777684B7D65BECE90F28BB05CB4AF",
                  devName: "BR.Season13.BattlePass.01",
                  offerType: "StaticPrice",
                  prices: [
                    {
                      currencyType: "MtxCurrency",
                      currencySubType: "",
                      regularPrice: 950,
                      dynamicRegularPrice: -1,
                      finalPrice: 950,
                      saleExpiration: "9999-12-31T23:59:59.999Z",
                      basePrice: 950
                    }
                  ],
                  categories: [],
                  dailyLimit: -1,
                  weeklyLimit: -1,
                  monthlyLimit: -1,
                  refundable: false,
                  appStoreId: ["", "", "", "", "", "", "", "", "", "", "", ""],
                  requirements: [
                    {
                      requirementType: "DenyOnFulfillment",
                      requiredId: "3C1777684B7D65BECE90F28BB05CB4AF",
                      minQuantity: 1
                    }
                  ],
                  metaInfo: [
                    {
                      key: "Preroll",
                      value: "False"
                    }
                  ],
                  catalogGroup: "",
                  catalogGroupPriority: 0,
                  sortPriority: 1,
                  title: "Battle Pass",
                  shortDescription: "Chapter 2 - Season 3",
                  description: "https://discord.gg/anora",
                  displayAssetPath: "/Game/Catalog/DisplayAssets/DA_BR_Season13_BattlePass.DA_BR_Season13_Rare",
                  itemGrants: []
                },
                {
                  offerId: "C677E22244C444256A79ACA0C59BAE7D",
                  devName: "BR.Season13.SingleTier.01",
                  offerType: "StaticPrice",
                  prices: [
                    {
                      currencyType: "MtxCurrency",
                      currencySubType: "",
                      regularPrice: 150,
                      dynamicRegularPrice: -1,
                      finalPrice: 150,
                      saleExpiration: "9999-12-31T23:59:59.999Z",
                      basePrice: 150
                    }
                  ],
                  categories: [],
                  dailyLimit: -1,
                  weeklyLimit: -1,
                  monthlyLimit: -1,
                  refundable: false,
                  appStoreId: ["", "", "", "", "", "", "", "", "", "", "", ""],
                  requirements: [],
                  metaInfo: [
                    {
                      key: "Preroll",
                      value: "False"
                    }
                  ],
                  catalogGroup: "",
                  catalogGroupPriority: 0,
                  sortPriority: 0,
                  title: "Battle Pass Level",
                  shortDescription: "",
                  description: "Get great rewards now!",
                  displayAssetPath: "",
                  itemGrants: []
                },
                {
                  offerId: "A9DB423A2EDB4D8CA4D97204CE3F0D79",
                  devName: "BR.Season13.BattleBundle.01",
                  offerType: "StaticPrice",
                  prices: [
                    {
                      currencyType: "MtxCurrency",
                      currencySubType: "",
                      regularPrice: 4700,
                      dynamicRegularPrice: -1,
                      finalPrice: 2800,
                      saleType: "PercentOff",
                      saleExpiration: "9999-12-31T23:59:59.999Z",
                      basePrice: 2800
                    }
                  ],
                  categories: [],
                  dailyLimit: -1,
                  weeklyLimit: -1,
                  monthlyLimit: -1,
                  refundable: false,
                  appStoreId: ["", "", "", "", "", "", "", "", "", "", "", ""],
                  requirements: [
                    {
                      requirementType: "DenyOnFulfillment",
                      requiredId: "A3A60070669140F198A0AFD38220CF22",
                      minQuantity: 1
                    },
                    {
                      requirementType: "DenyOnItemOwnership",
                      requiredId: "Token:athena_s13_nobattlebundleoption_token",
                      minQuantity: 1
                    }
                  ],
                  metaInfo: [
                    {
                      key: "Preroll",
                      value: "False"
                    }
                  ],
                  catalogGroup: "",
                  catalogGroupPriority: 0,
                  sortPriority: 0,
                  title: "Battle Bundle",
                  shortDescription: "Battle Pass + 25 levels!",
                  description: "https://discord.gg/anora",
                  displayAssetPath: "/Game/Catalog/DisplayAssets/DA_BR_Season13_BattlePassWithLevels.DA_BR_Season13_BattlePassWithLevels",
                  itemGrants: []
                }
              ]
            }
        ]
      });
  
      const catalog = JSON.parse(catalogString);
      const catalogRawJSON = JSON.parse(catalogRaw);
      const newItems: any[] = [];
  
      for (const [i, dailyItem] of dailyItems.entries()) {
          const { shopName, price, image, name } = dailyItem;
  
          catalog[`daily${i + 1}`].price = price;
          catalog[`daily${i + 1}`].itemGrants = [shopName];
          catalog[`daily${i + 1}`].image = image;
          catalog[`daily${i+1}`].name = name;
          newItems.push(dailyItem);
      }
  
      for (const [i, featuredItem] of featuredItems.entries()) {
          const { shopName, price, image, name } = featuredItem;
  
          catalog[`featured${i + 1}`].price = price;
          catalog[`featured${i + 1}`].itemGrants = [shopName];
          catalog[`featured${i + 1}`].image = image;
          catalog[`featured${i + 1}`].featured = true;
          catalog[`featured${i+1}`].name = name
          newItems.push(featuredItem);
      }
  
      const todayAtMidnight = new Date();
      todayAtMidnight.setHours(24, 0, 0, 0);
      const todayOneMinuteBeforeMidnight = new Date(
          todayAtMidnight.getTime() - 60000
      );
      const isoDate = todayOneMinuteBeforeMidnight.toISOString();
      const scheduleNextUpdate = () => {
        const now = new Date();
        const timeUntilMidnight = todayAtMidnight.getTime() - now.getTime();
        setTimeout(async () => {
            await this.updateShop();
            setInterval(() => Shop.updateShop(), 24 * 60 * 60 * 1000);
        }, timeUntilMidnight);
      };
      scheduleNextUpdate();
    
      catalogRawJSON.expiration = isoDate;
      
      await Promise.all([
          fs.writeFile(
              path.join(__dirname, "../../Config/catalog_config.json"),
              JSON.stringify(catalog, null, 4)
          ),
          fs.writeFile(
              path.join(__dirname, "../../responses/catalog.json"),
              JSON.stringify(catalogRawJSON, null, 4)
          ),
      ]);
      log.backend("Rotated Shop!");
      return newItems;
    }
  }
  
  export default Shop;