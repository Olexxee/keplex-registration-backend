const MAX_TOTAL_MINOR = 999_999_999_999n;

const toMinorUnits = (value) => {
  const normalized = String(value).trim();
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new TypeError("Unit price must be a valid amount with at most two decimal places");
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
};

const fromMinorUnits = (value) => {
  const major = value / 100n;
  const minor = String(value % 100n).padStart(2, "0");
  return `${major}.${minor}`;
};

export const calculateSouvenirPrice = (unitPrice, quantity) => {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100_000) {
    throw new RangeError("Quantity must be an integer between 1 and 100000");
  }

  const unitMinor = toMinorUnits(unitPrice);
  if (unitMinor <= 0n) throw new RangeError("Unit price must be greater than zero");

  const totalMinor = unitMinor * BigInt(quantity);
  if (totalMinor > MAX_TOTAL_MINOR) {
    throw new RangeError("Calculated souvenir order total exceeds the supported amount");
  }

  return {
    unitPriceSnapshot: fromMinorUnits(unitMinor),
    totalPriceSnapshot: fromMinorUnits(totalMinor),
  };
};
