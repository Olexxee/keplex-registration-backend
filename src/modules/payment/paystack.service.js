import "dotenv/config";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

const getSecretKey = () => {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  return secret;
};

const paystackRequest = async (path, options = {}) => {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.status) {
    throw new Error(result?.message || "Paystack request failed");
  }

  return result.data;
};

export const initializePaystackTransaction = (data) =>
  paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const verifyPaystackTransaction = (reference) =>
  paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
