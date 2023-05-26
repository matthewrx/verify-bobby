import PromptSync from "prompt-sync";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  bobShirtEditions,
  bobBackgroundEditions,
  datbois_hash,
} from "./bobhash.js";
import axios from "axios";

// place your RPC endpoint here
const connection = new web3.Connection("RPC_ENDPOINT");
// place your HELIUS API KEY here
const HELIUS_API_KEY = "";
const GET_META_ENDPOINT = `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`;

// attribute values when searching datboi metadata
const bobBois_Shirt_attribute = "Bobois Shirt";
const bobBois_Background_attribute = "Bobois";

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
  const { data } = await axios.post(GET_META_ENDPOINT, {
    mintAccounts: mints,
    includeOffChain: true,
    disableCache: false,
  });
  return data;
}

// doin the thing
async function fetchUserBobs(walletAddress) {
  // placeholder object, this is what we will be returning
  let userBobs = {
    user_bobBois: [],
    user_bobBackgrounds: [],
    user_bobShirts: [],
    errors: [],
  };

  let user_datbois = [];

  try {
    // grab all of the token accounts from the wallet address
    const userTokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      {
        programId: splToken.TOKEN_PROGRAM_ID,
      }
    );
    for (let i = 0; i < userTokenAccounts.value.length; i++) {
      // uncomment console log to see what is returned

      // console.log(value[i].account.data.parsed.info)
      const token_mint =
        userTokenAccounts.value[i].account.data.parsed.info.mint;
      const token_amount =
        userTokenAccounts.value[i].account.data.parsed.info.tokenAmount
          .uiAmount;
      // we're checking to see if our token account mint is inside of our bobShirtEditions array '&&' if our token amount is equal to 1
      if (bobShirtEditions.includes(token_mint) && token_amount == 1) {
        // if this is true- we will push the mint address to the user_bobShirts array in our placeholder object
        userBobs.user_bobShirts.push(token_mint);
      } else if (
        // checking for bob backgrounds
        bobBackgroundEditions.includes(token_mint) &&
        token_amount == 1
      ) {
        userBobs.user_bobBackgrounds.push(token_mint);
      }
      // checking for datbois
      else if (datbois_hash.includes(token_mint) && token_amount == 1) {
        user_datbois.push(token_mint);
      }
    }
    // if our user_datbois array is greater than 0, that means we found a datboi, but we don't know if it contains a bob attribute
    if (user_datbois.length > 0) {
      // let's grab the metadata for our datbois
      await getMetaData(user_datbois).then((val) => {
        for (let w = 0; w < val.length; w++) {
          // figure it out bob
          let nftMint = val[w].account;
          let nftAttributes = val[w].offChainMetadata.metadata.attributes;
          for (let j = 0; j < nftAttributes.length; j++) {
            let attributeValue = nftAttributes[j].value;
            if (
              attributeValue == bobBois_Shirt_attribute ||
              attributeValue == bobBois_Background_attribute
            ) {
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
    userBobs.errors.push(errorObject);
  }
  return userBobs;
}

async function main() {
  let walletAddress = prompt("Enter wallet address: ");
  let checkAddressValid = isValidPubkey(walletAddress);
  console.log("address is valid?:", checkAddressValid);
  if (checkAddressValid) {
    console.log("searching wallet for bobby...");
    await fetchUserBobs(new web3.PublicKey(walletAddress)).then((val) => {
      console.log(val);
    });
  } else {
    console.log("Invalid wallet address");
  }
}

main();
