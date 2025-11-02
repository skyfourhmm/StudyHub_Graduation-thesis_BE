module.exports = {
  mongoDBUri: process.env.MONGODB_URI,
  rpcUrl: process.env.SEPOLIA_RPC_URL,
  adminPk: process.env.PRIVATE_KEY,
  contractAddress: process.env.CONTRACT_ADDRESS,
  adminAddress: process.env.ADMIN_ADDRESS,
  pinataJwt: process.env.PINATA_JWT,
  pinataGatewayBase: process.env.PINATA_GATEWAY_BASE,
  jwtKey: process.env.JWT_SECRET,
  redisUrl: process.env.REDIS_URL,
};
