import { useQuery } from "@tanstack/react-query";
import { formatEther, createPublicClient, http } from "viem";
import { rootstock, rootstockTestnet } from "wagmi/chains";

export interface Balance {
  wei: bigint;
  ether: string;
}

export interface UseBalanceReturn {
  balance: Balance | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

const rootstockClient = createPublicClient({
  chain: rootstock,
  transport: http("https://public-node.rsk.co"),
});

const rootstockTestnetClient = createPublicClient({
  chain: rootstockTestnet,
  transport: http("https://public-node.testnet.rsk.co"),
});

export function useBalance(address?: string, chainId?: number): UseBalanceReturn {
  const client = chainId === 30 ? rootstockClient : rootstockTestnetClient;
  const chainName = chainId === 30 ? "Rootstock" : "Rootstock Testnet";

  const query = useQuery({
    queryKey: ["balance", address, chainId],
    queryFn: async () => {
      if (!address) {
        throw new Error("No address provided");
      }

      const balance = await client.getBalance({
        address: address as `0x${string}`,
      });

      return {
        wei: balance,
        ether: formatEther(balance),
      };
    },
    enabled: !!address,
    staleTime: 15_000, // 15 seconds
    gcTime: 15_000, // 15 seconds (formerly cacheTime)
    retry: 1,
  });

  return {
    balance: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}

