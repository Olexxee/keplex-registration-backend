const MAX_QUANTITY = 100_000;

export const formatPriceBandLabel = ({ minQuantity, maxQuantity }) =>
  maxQuantity == null ? `${minQuantity}+` : `${minQuantity}–${maxQuantity}`;

export const buildPricingBands = (input) => {
  if (!Array.isArray(input) || input.length === 0 || input.length > 50) {
    throw new TypeError("A pricing schedule must contain between 1 and 50 bands");
  }

  input.forEach((band, index) => {
    if (!Number.isSafeInteger(band.minQuantity) || band.minQuantity < 1 || band.minQuantity > MAX_QUANTITY) {
      throw new TypeError(`Band ${index + 1}: minimum quantity must be an integer between 1 and ${MAX_QUANTITY}`);
    }
    if (index > 0 && band.minQuantity <= input[index - 1].minQuantity) {
      throw new TypeError("Band minimum quantities must be strictly increasing");
    }
  });

  const starts = input.map((band, index) => {
    const price = String(band.unitPrice ?? "").trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(price) || !/[1-9]/.test(price.replace(".", ""))) {
      throw new TypeError(`Band ${index + 1}: unit price must be greater than zero with at most two decimal places`);
    }
    const [major, minor = ""] = price.split(".");
    const normalizedPrice = `${BigInt(major)}.${minor.padEnd(2, "0")}`;
    if (BigInt(major) > 9_999_999_999n || (BigInt(major) === 9_999_999_999n && Number(minor.padEnd(2, "0")) > 99)) {
      throw new TypeError(`Band ${index + 1}: unit price exceeds the supported amount`);
    }

    const maxQuantity = index === input.length - 1 ? null : input[index + 1].minQuantity - 1;
    if (maxQuantity != null && maxQuantity < band.minQuantity) {
      throw new TypeError(`Band ${index + 1}: quantity range is invalid`);
    }
    return {
      minQuantity: band.minQuantity,
      maxQuantity,
      unitPrice: normalizedPrice,
      currency: "NGN",
      label: formatPriceBandLabel({ minQuantity: band.minQuantity, maxQuantity }),
      displayOrder: index,
    };
  });

  return starts;
};

export const isValidCurrentSchedule = (bands, version) => {
  if (!Array.isArray(bands) || bands.length === 0) return false;
  const ordered = [...bands].sort((a, b) => a.minQuantity - b.minQuantity);
  if (ordered.some((band) => band.version !== version || !band.isCurrent || band.currency !== "NGN" || band.unitPrice == null)) return false;
  if (ordered.at(-1).maxQuantity != null) return false;
  return ordered.every((band, index) => {
    if (!Number.isSafeInteger(band.minQuantity) || band.minQuantity < 1) return false;
    if (band.maxQuantity != null && (!Number.isSafeInteger(band.maxQuantity) || band.maxQuantity < band.minQuantity)) return false;
    return index === 0 || ordered[index - 1].maxQuantity === band.minQuantity - 1;
  });
};
