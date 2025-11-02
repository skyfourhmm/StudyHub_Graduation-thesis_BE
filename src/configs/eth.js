import { ethers } from "ethers";
import abi from "./CertificateRegistry.abi.json" assert { type: "json" };
import config from "../configs/config";

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.adminPk, provider);
export const contract = new ethers.Contract(
  config.contractAddress,
  abi,
  wallet
);
