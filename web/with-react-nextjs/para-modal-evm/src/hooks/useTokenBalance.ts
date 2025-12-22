import { useQuery } from "@tanstack/react-query";
import { formatUnits, createPublicClient, http, type Address } from "viem";
import { rootstock, rootstockTestnet } from "wagmi/chains";

// ERC20 ABI - formato compatible con viem
const ERC20_ABI = [
  {
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface TokenBalance {
  balance: string;
  symbol: string;
  decimals: number;
}

export interface UseTokenBalanceReturn {
  tokenBalance: TokenBalance | undefined;
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

export function useTokenBalance(
  address?: string,
  tokenAddress?: Address,
  chainId?: number
): UseTokenBalanceReturn {
  const client = chainId === 30 ? rootstockClient : rootstockTestnetClient;

  const query = useQuery({
    queryKey: ["tokenBalance", address, tokenAddress, chainId],
    queryFn: async () => {
      if (!address || !tokenAddress) {
        throw new Error("Address and token address required");
      }

      try {
        const [balance, decimals, symbol] = await Promise.all([
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address as Address],
          }),
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "decimals",
          }),
          client.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: "symbol",
          }),
        ]);

        return {
          balance: formatUnits(balance as bigint, decimals as number),
          symbol: symbol as string,
          decimals: decimals as number,
        };
      } catch (error) {
        console.error(`Error fetching token balance for ${tokenAddress} on chain ${chainId}:`, error);
        throw error;
      }
    },
    enabled: !!address && !!tokenAddress,
    staleTime: 15_000, // 15 seconds
    gcTime: 15_000,
    retry: 1,
    retryOnMount: false, // No reintentar automáticamente si falla
  });

  return {
    tokenBalance: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
}

