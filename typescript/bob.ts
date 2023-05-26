import PromptSync from "prompt-sync";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  bobShirtEditions,
  bobBackgroundEditions,
  datbois_hash,
} from "../hashlists/bobhash.js";
import {
  userBobResponse,
  user_bobBois_type,
  heliusNFT_response,
  configType,
} from "./types.js";
import { config } from '../config/config.js';
import axios from "axios";

const configFile: configType = config;

const hard_wallet = '522GVifs4XRZ7Gpnfu6s9gHWD1NQuwMVUkAEt52bPdBo'

const prompt = PromptSync({});

function isValidPubkey(userWallet: string) {
  try {
    let pubkey = new web3.PublicKey(userWallet);
    let data = web3.PublicKey.isOnCurve(pubkey);
    return data;
  } catch (error) {
    return false;
  }
}

async function getMetaData(mints: string[]) {
  const { data } = await axios.post<heliusNFT_response[]>(`https://api.helius.xyz/v0/token-metadata?api-key=${configFile.HELIUS_API_KEY}`, {
    mintAccounts: mints,
    includeOffChain: true,
    disableCache: false,
  });
  return data;
}

function checkHash(hashlistArray: string[], token_mints: string[]) {
  let response: string[] = [];
  for (let i = 0; i < token_mints.length; i++){
    if (hashlistArray.includes(token_mints[i])) {
      response.push(token_mints[i]);
    }
  }
  return response;
}

async function fetchUserBobs(connection: web3.Connection, walletAddress: web3.PublicKey) {
  let user_token_accounts: string[] = [];
  let userBobs: userBobResponse = {
    user_bobBackgrounds: [],
    user_bobShirts: [],
    user_bobBois: [],
    user_datbois: [],
    error: [],
  };
  try {
    const userTokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      {
        programId: splToken.TOKEN_PROGRAM_ID,
      }
    );
    for (let i = 0; i < userTokenAccounts.value.length; i++) {
      const token_mint: string =
        userTokenAccounts.value[i].account.data.parsed.info.mint;
      const token_amount: number =
        userTokenAccounts.value[i].account.data.parsed.info.tokenAmount
          .uiAmount;
      if (token_amount == 1) {
        user_token_accounts.push(token_mint);
      }
    }
    if (user_token_accounts.length > 0) {
      userBobs.user_bobBackgrounds = checkHash(bobBackgroundEditions, user_token_accounts);
      userBobs.user_bobShirts = checkHash(bobShirtEditions, user_token_accounts);
      userBobs.user_datbois = checkHash(datbois_hash, user_token_accounts);
    }

    if (userBobs.user_datbois.length > 0){
      await getMetaData(userBobs.user_datbois).then((val) => {
        for (let w = 0; w < val.length; w++) {
          let nftMint = val[w].account;
          let nftAttributes = val[w].offChainMetadata.metadata.attributes;
          for (let j = 0; j < nftAttributes.length; j++) {
            let attributeType = nftAttributes[j].traitType;
            let attributeValue = nftAttributes[j].value;
            if (configFile.ATTRIBUTE_VALUE_FILTER.includes(attributeValue)) {
              let bobBoi_obj: user_bobBois_type = {
                mint: nftMint,
                filter: {
                  trait_type: attributeType,
                  trait_value: attributeValue
                }
              }
              userBobs.user_bobBois.push(bobBoi_obj);
            }
          }
        }
      });
    }
  } catch (error) {
    console.log(error);
    let errorObject = {
      error: false,
      error_message: "",
    };
    errorObject.error = true;
    errorObject.error_message = error.message;
    userBobs.error.push(errorObject);
  }
  return userBobs;
}

async function main() {
  if (configFile.HELIUS_API_KEY != "" && configFile.ATTRIBUTE_VALUE_FILTER.length > 0) {
    const connection = new web3.Connection(
      configFile.RPC_ENDPOINT
        ? configFile.RPC_ENDPOINT
        : "https://api.mainnet-beta.solana.com"
    );
    let walletAddress = "";
    const enterWallet: string = prompt("Enter wallet address: ");
    if (enterWallet == "") {
      walletAddress = hard_wallet;
    } else {
      walletAddress = enterWallet
    }
    let checkAddressValid = isValidPubkey(walletAddress);
    console.log("address is valid?:", checkAddressValid);
    if (checkAddressValid) {
      console.log(`searching wallet: ${walletAddress} for bobby.. brb`);
      await fetchUserBobs(connection, new web3.PublicKey(walletAddress)).then((val) => {
        console.log(JSON.stringify(val, null, 4));
      });
    } else {
      console.log("Invalid wallet address");
    }
  } else {
    console.log("helius api key and attribute filter are required in config");
  }
}

main();
