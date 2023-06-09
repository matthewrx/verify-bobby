import PromptSync from "prompt-sync";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  bobShirtEditions,
  bobBackgroundEditions,
  datbois_hash,
} from "./bobhash.js";
import { config } from "./config/config.js";
import axios from "axios";

// prompt asking for wallet address at program start
const prompt = PromptSync();

// check if the entered wallet address is a valid solana wallet
function isValidPubkey(userWallet) {
  try {
    let pubkey = new web3.PublicKey(userWallet);
    let data = web3.PublicKey.isOnCurve(pubkey);
    return data;
  } catch (error) {
    return false;
  }
}

// taking in our array of mints and grabbing metadata
async function getMetaData(mints) {
  const { data } = await axios.post(
    `https://api.helius.xyz/v0/token-metadata?api-key=${config.HELIUS_API_KEY}`,
    {
      mintAccounts: mints,
      includeOffChain: true,
      disableCache: false,
    }
  );
  return data;
}

function checkHash(hashlistArray, token_mints) {
  let response = [];
  for (let i = 0; i < token_mints.length; i++) {
    if (hashlistArray.includes(token_mints[i])) {
      response.push(token_mints[i]);
    }
  }
  return response;
}

async function fetchUserBobs(connection, walletAddress) {
  let user_token_accounts = [];
  let userBobs = {
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
      const token_mint =
        userTokenAccounts.value[i].account.data.parsed.info.mint;
      const token_amount =
        userTokenAccounts.value[i].account.data.parsed.info.tokenAmount
          .uiAmount;
      if (token_amount == 1) {
        user_token_accounts.push(token_mint);
      }
    }
    if (user_token_accounts.length > 0) {
      userBobs.user_bobBackgrounds = checkHash(
        bobBackgroundEditions,
        user_token_accounts
      );
      userBobs.user_bobShirts = checkHash(
        bobShirtEditions,
        user_token_accounts
      );
      userBobs.user_datbois = checkHash(datbois_hash, user_token_accounts);
    }
    if (userBobs.user_datbois.length > 0) {
      await getMetaData(userBobs.user_datbois).then((val) => {
        for (let w = 0; w < val.length; w++) {
          let nftMint = val[w].account;
          let nftAttributes = val[w].offChainMetadata.metadata.attributes;
          for (let j = 0; j < nftAttributes.length; j++) {
            let attributeValue = nftAttributes[j].value;
            if (config.ATTRIBUTE_VALUE_FILTER.includes(attributeValue)) {
              userBobs.user_bobBois.push(nftMint);
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
  if (config.HELIUS_API_KEY != "" && config.ATTRIBUTE_VALUE_FILTER.length > 0) {
    const connection = new web3.Connection(
      config.RPC_ENDPOINT
        ? config.RPC_ENDPOINT
        : "https://api.mainnet-beta.solana.com"
    );
    let walletAddress = prompt("Enter wallet address: ");
    let checkAddressValid = isValidPubkey(walletAddress);
    console.log("address is valid?:", checkAddressValid);
    if (checkAddressValid) {
      console.log("searching wallet for bobby...");
      await fetchUserBobs(connection, new web3.PublicKey(walletAddress)).then(
        (val) => {
          console.log(val);
        }
      );
    } else {
      console.log("Invalid wallet address");
    }
  } else {
    console.log("helius api key and attribute filter are required in config");
  }
}

main();
