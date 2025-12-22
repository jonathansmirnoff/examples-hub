"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useWallet, useAccount, useClient } from "@getpara/react-sdk";
import { useAccount as useWagmiAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { createParaAccount, createParaViemClient } from "@getpara/viem-v2-integration";
import { createPublicClient, http, parseEther, formatEther, type Address } from "viem";
import { rootstock, rootstockTestnet } from "wagmi/chains";
import { StatusAlert } from "@/components/ui/StatusAlert";

interface SendRBTCProps {
  chainId: number;
}

export function SendRBTC({ chainId }: SendRBTCProps) {
  const { data: wallet } = useWallet();
  const { isConnected } = useAccount();
  const para = useClient();
  const { address: wagmiAddress } = useWagmiAccount();
  const {
    sendTransaction,
    data: hash,
    isPending: isSending,
    isError: isSendError,
    error: sendError,
  } = useSendTransaction();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    isError: isConfirmError,
  } = useWaitForTransactionReceipt({ hash });
  
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const address = wallet?.address || wagmiAddress;
  // Check if it's an external wallet: 
  // 1. If wagmiAddress exists, it means we're using MetaMask/WalletConnect (external)
  // 2. If no Para wallet ID or wallet ID is empty/undefined, it's external
  const isExternalWallet = !!wagmiAddress || !wallet?.id || wallet.id === "" || wallet.id === undefined || wallet.id === null;
  const chain = chainId === 30 ? rootstock : rootstockTestnet;
  const rpcUrl = chainId === 30 
    ? "https://public-node.rsk.co" 
    : "https://public-node.testnet.rsk.co";
  const tokenName = chainId === 30 ? "RBTC" : "tRBTC";
  
  const isLoading = isSending || isConfirming;
  const txHash = hash;

  // Handle status updates from wagmi
  React.useEffect(() => {
    if (isSending) {
      setStatus({
        show: true,
        type: "info",
        message: "Please confirm the transaction in your wallet...",
      });
    } else if (isConfirming) {
      setStatus({
        show: true,
        type: "info",
        message: "Transaction submitted. Waiting for confirmation...",
      });
    } else if (isConfirmed) {
      setStatus({
        show: true,
        type: "success",
        message: `Successfully sent ${amount} ${tokenName}!`,
      });
      setTo("");
      setAmount("");
      setTimeout(() => window.location.reload(), 2000);
    } else if (isSendError || isConfirmError) {
      setStatus({
        show: true,
        type: "error",
        message: sendError?.message || "Failed to send RBTC. Please try again.",
      });
    }
  }, [isSending, isConfirming, isConfirmed, isSendError, isConfirmError, sendError, amount, tokenName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ show: false, type: "success", message: "" });

    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet to send tokens.");
      }

      // Validate address format
      if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error("Invalid recipient address format.");
      }

      // Validate amount
      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat) || amountFloat <= 0) {
        throw new Error("Please enter a valid amount greater than 0.");
      }

      const amountWei = parseEther(amount);

      // Debug logging
      console.log("Wallet info:", { 
        hasWallet: !!wallet, 
        walletId: wallet?.id, 
        walletAddress: wallet?.address,
        wagmiAddress,
        isExternalWallet 
      });

      // If external wallet (MetaMask/WalletConnect), use wagmi directly
      // NEVER use createParaAccount for external wallets
      if (isExternalWallet) {
        console.log("Using external wallet (MetaMask/WalletConnect) - using wagmi, NOT Para SDK");
        setStatus({
          show: true,
          type: "info",
          message: "Preparing transaction...",
        });

        sendTransaction({
          to: to as Address,
          value: amountWei,
        });
        return; // IMPORTANT: Return early to avoid Para SDK code
      }

      // For Para embedded wallets ONLY, use Para SDK
      // Only reach here if it's NOT an external wallet
      if (!para) {
        throw new Error("Para client not available. Please reconnect your wallet.");
      }

      if (!wallet?.id || wallet.id === "" || wallet.id === undefined || wallet.id === null) {
        throw new Error("No valid wallet ID found. Please reconnect your wallet.");
      }

      console.log("Using Para embedded wallet with ID:", wallet.id);

      setStatus({
        show: true,
        type: "info",
        message: "Preparing transaction...",
      });

      // Create Para account and clients
      const viemAccount = createParaAccount(para);
      const walletClient = createParaViemClient(para, {
        account: viemAccount,
        chain: chain,
        transport: http(rpcUrl),
      });
      const publicClient = createPublicClient({
        chain: chain,
        transport: http(rpcUrl),
      });

      // Validate balance
      const balance = await publicClient.getBalance({
        address: address as Address,
      });
      
      // Estimate gas
      const estimatedGas = await publicClient.estimateGas({
        account: address as Address,
        to: to as Address,
        value: amountWei,
      });

      const gasPrice = await publicClient.getGasPrice();
      const estimatedGasCost = estimatedGas * gasPrice;
      const totalCost = amountWei + estimatedGasCost;

      if (balance < totalCost) {
        throw new Error(`Insufficient ${tokenName} balance. You need at least ${formatEther(totalCost)} ${tokenName} (including gas fees).`);
      }

      setStatus({
        show: true,
        type: "info",
        message: "Preparing transaction...",
      });

      // Prepare transaction request
      const request = await walletClient.prepareTransactionRequest({
        account: viemAccount,
        to: to as Address,
        value: amountWei,
        chain: chain,
      });

      setStatus({
        show: true,
        type: "info",
        message: "Please confirm the transaction in your wallet...",
      });

      // Sign the transaction
      const signedTx = await walletClient.signTransaction(request);

      setStatus({
        show: true,
        type: "info",
        message: "Sending transaction...",
      });

      // Send the signed transaction
      const hash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx,
      });

      console.log("Transaction submitted:", hash);

      setStatus({
        show: true,
        type: "info",
        message: "Transaction submitted. Waiting for confirmation...",
      });

      await publicClient.waitForTransactionReceipt({
        hash,
      });

      setStatus({
        show: true,
        type: "success",
        message: `Successfully sent ${amount} ${tokenName}!`,
      });

      // Reset form
      setTo("");
      setAmount("");

      // Trigger a page refresh or balance update
      window.location.reload();
    } catch (error) {
      console.error("Error sending RBTC:", error);
      setStatus({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to send RBTC. Please try again.",
      });
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="bg-white rounded-none border border-gray-200 p-6 mb-4 text-black">
      <h3 className="text-lg font-medium mb-4">Send {tokenName}</h3>
      
      <StatusAlert
        show={status.show}
        type={status.type}
        message={status.message}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            id="to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm text-gray-900"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({tokenName})
          </label>
          <input
            id="amount"
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-2 border border-gray-200 rounded-none focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900"
            required
          />
        </div>

        {txHash && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-none">
            <p className="text-sm text-gray-600 mb-1">Transaction Hash:</p>
            <p className="text-sm font-mono text-gray-900 break-all">{txHash}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-gray-900 text-white rounded-none hover:bg-gray-950 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium">
          {isLoading ? (isSending ? "Sending..." : "Confirming...") : `Send ${tokenName}`}
        </button>
      </form>
    </div>
  );
}

