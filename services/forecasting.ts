// services/forecasting.ts
// IA calculant les récoltes futures basées sur les CropCycle (Predictive Analytics)

import { prisma } from "@/lib/prisma";

interface CropCycleInput {
    farmId: string;
    cropType: string;
    areaSize: number;
    plantedAt: Date;
    status: string;
}

interface YieldForecast {
    totalExpectedYield: number;
    harvestStarts: Date | null;
    activeFarmsCount: number;
}

interface CropCycleYield {
    expectedYield: number;
    expectedHarvestDate: Date;
}

export async function createCropCycle(data: CropCycleInput) {
  const yieldEstimates: Record<string, number> = {
    "MAIZE": 2000,
    "RICE": 3000,
    "SORGHUM": 1500,
    "SOYBEAN": 1800,
  };
  
  const estimatePerHa = yieldEstimates[data.cropType.toUpperCase()] || 1000;
  const expectedYield = estimatePerHa * data.areaSize;
  const expectedHarvestDate = new Date(data.plantedAt.getTime() + 120 * 24 * 60 * 60 * 1000);

  return await prisma.cropCycle.create({
    data: {
      farmId: data.farmId,
      cropType: data.cropType,
      areaSize: data.areaSize,
      plantedAt: data.plantedAt,
      expectedYield,
      expectedHarvestDate,
      status: data.status,
    },
  });
}

export async function getLocationYieldForecast(locationId: string, cropType: string): Promise<YieldForecast> {
    const cycles: CropCycleYield[] = await prisma.cropCycle.findMany({
        where: {
            status: "GROWING",
            cropType,
            farm: {
              zoneId: locationId
            }
        },
        select: {
            expectedYield: true,
            expectedHarvestDate: true
        }
    });

    const totalYield: number = cycles.reduce((acc, c) => acc + c.expectedYield, 0);
  const earliestHarvest = cycles.length > 0 ? cycles.sort((a,b) => a.expectedHarvestDate.getTime() - b.expectedHarvestDate.getTime())[0].expectedHarvestDate : null;

  return {
    totalExpectedYield: totalYield,
    harvestStarts: earliestHarvest,
    activeFarmsCount: cycles.length
  };
}
