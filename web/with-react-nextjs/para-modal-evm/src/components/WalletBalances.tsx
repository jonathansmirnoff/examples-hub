"use client";

import { useState } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { SendRBTC } from "@/components/SendRBTC";
import type { Address } from "viem";

interface WalletBalancesProps {
  address?: string;
}

// Tokens comunes en Rootstock Mainnet (direcciones en lowercase)
const MAINNET_TOKENS: Array<{ address: Address; name: string }> = [
  {
    address: "0x2d919f19d4892381d58edebeca66d5642cef1a1f" as Address, // DOC (Dollar on Chain)
    name: "DOC",
  },
  {
    address: "0x2acc95758f8b5f583470ba265eb685a8f45fc9d5" as Address, // RIF Token
    name: "RIF",
  },
  {
    address: "0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37" as Address, // USDRIF
    name: "USDRIF",
  },
];

// Tokens comunes en Rootstock Testnet (direcciones en lowercase)
const TESTNET_TOKENS: Array<{ address: Address; name: string }> = [
  {
    address: "0x19f64674d8a5b4e652319f5e239efd3bc969a1fe" as Address, // tRIF Token (Testnet)
    name: "tRIF",
  },
  {
    address: "0x3a15461d8ae0f0fb5fa2629e9da7d66a794a6e37" as Address, // USDRIF (Testnet)
    name: "USDRIF",
  },
];

function TokenBalanceItem({
  address,
  tokenAddress,
  tokenName,
  chainId,
}: {
  address?: string;
  tokenAddress: Address;
  tokenName: string;
  chainId: number;
}) {
  const { tokenBalance, isLoading, isError, error } = useTokenBalance(address, tokenAddress, chainId);

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-none">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-900">{tokenName}</p>
            <p className="text-xs text-gray-500">Chain ID: {chainId}</p>
          </div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    // Mostrar error en desarrollo para debug
    if (process.env.NODE_ENV === "development") {
      console.error(`Error loading ${tokenName} (${tokenAddress}):`, error);
    }
    return null; // No mostrar tokens con error
  }

  if (!tokenBalance || Number(tokenBalance.balance) === 0) {
    return null; // No mostrar tokens con balance 0
  }

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-none">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-gray-900">{tokenBalance.symbol || tokenName}</p>
          <p className="text-xs text-gray-500">Chain ID: {chainId}</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-gray-900">
            {Number(tokenBalance.balance).toFixed(4)} {tokenBalance.symbol || tokenName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WalletBalances({ address }: WalletBalancesProps) {
  const { balance: mainnetBalance, isLoading: isLoadingMainnet } = useBalance(address, 30);
  const { balance: testnetBalance, isLoading: isLoadingTestnet } = useBalance(address, 31);
  const [showSendMainnet, setShowSendMainnet] = useState(false);
  const [showSendTestnet, setShowSendTestnet] = useState(false);

  if (!address) {
    return null;
  }

  return (
    <div className="bg-white rounded-none border border-gray-200 p-6 mb-4">
      <h3 className="text-lg font-medium mb-4 text-black">Wallet Balances</h3>
      <div className="space-y-4">
        {/* Rootstock Mainnet Section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Rootstock Mainnet (Chain ID: 30)</h4>
          <div className="space-y-2">
            {/* Native RBTC Balance */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-none">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">RBTC</p>
                  <p className="text-xs text-gray-500">Native Token</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {isLoadingMainnet ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : mainnetBalance ? (
                      <p className="text-lg font-semibold text-gray-900">
                        {Number(mainnetBalance.ether).toFixed(4)} RBTC
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">--</p>
                    )}
                  </div>
                  {mainnetBalance && Number(mainnetBalance.ether) > 0 && (
                    <button
                      onClick={() => setShowSendMainnet(!showSendMainnet)}
                      className="px-3 py-1 text-xs bg-gray-900 text-white rounded-none hover:bg-gray-950 transition-colors font-medium">
                      {showSendMainnet ? "Hide" : "Send"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {showSendMainnet && <SendRBTC chainId={30} />}

            {/* ERC20 Tokens on Mainnet */}
            {MAINNET_TOKENS.map((token) => (
              <TokenBalanceItem
                key={token.address}
                address={address}
                tokenAddress={token.address}
                tokenName={token.name}
                chainId={30}
              />
            ))}
          </div>
        </div>

        {/* Rootstock Testnet Section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Rootstock Testnet (Chain ID: 31)</h4>
          <div className="space-y-2">
            {/* Native tRBTC Balance */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-none">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900">tRBTC</p>
                  <p className="text-xs text-gray-500">Native Token</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {isLoadingTestnet ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : testnetBalance ? (
                      <p className="text-lg font-semibold text-gray-900">
                        {Number(testnetBalance.ether).toFixed(4)} tRBTC
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">--</p>
                    )}
                  </div>
                  {testnetBalance && Number(testnetBalance.ether) > 0 && (
                    <button
                      onClick={() => setShowSendTestnet(!showSendTestnet)}
                      className="px-3 py-1 text-xs bg-gray-900 text-white rounded-none hover:bg-gray-950 transition-colors font-medium">
                      {showSendTestnet ? "Hide" : "Send"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {showSendTestnet && <SendRBTC chainId={31} />}

            {/* ERC20 Tokens on Testnet */}
            {TESTNET_TOKENS.map((token) => (
              <TokenBalanceItem
                key={token.address}
                address={address}
                tokenAddress={token.address}
                tokenName={token.name}
                chainId={31}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

