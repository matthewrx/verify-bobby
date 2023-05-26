type errorObject = {
  error: boolean;
  error_message: string;
};

type metaAttribute = {
  traitType: string;
  value: string;
};

export type user_bobBois_type = {
  mint: string;
  filter: {
    trait_type: string;
    trait_value: string;
  }
}

export type userBobResponse = {
  user_bobBackgrounds: string[];
  user_bobShirts: string[];
  user_bobBois: user_bobBois_type[];
  user_datbois: string[];
  error: errorObject[];
};

export type heliusNFT_response = {
  account: string;
  offChainMetadata: {
    metadata: {
      attributes: metaAttribute[];
      description: string;
      image: string;
      name: string;
      properties: {};
      sellerFeeBasisPoints: number;
      symbol: string;
    };
    uri: string;
  };
};

export type configType = {
  RPC_ENDPOINT: string;
  HELIUS_API_KEY: string;
  ATTRIBUTE_VALUE_FILTER: string[];
}
