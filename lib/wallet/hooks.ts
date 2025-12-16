'use client';

import { useState, useEffect } from 'react';
import { createWalletClient, custom, type Address } from 'viem';
import { createSIWEMessage } from '@/lib/auth/siwe';
import { authAPI } from '@/lib/api/client';

// Get chain ID from environment (client-side only)
const CHAIN_ID = typeof window !== 'undefined' 
  ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '5042002', 10)
  : 5042002;

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isLoading: false,
    error: null,
  });
  
  // Track if connection is in progress to prevent multiple simultaneous attempts
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if wallet is already connected on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      checkConnection();
    }
  }, []);

  async function checkConnection() {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        setState({
          isConnected: true,
          address: accounts[0],
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      // Don't update state on error during check
    }
  }

  async function connect() {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState((prev) => ({
        ...prev,
        error: 'MetaMask not installed. Please install MetaMask to continue.',
        isLoading: false,
      }));
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('Connection already in progress, ignoring duplicate request');
      return;
    }

    setIsConnecting(true);
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0] as Address;

      // Authenticate with backend using SIWE
      // Nonce is obtained right before signature to minimize expiration risk
      await authenticate(address);

      setState({
        isConnected: true,
        address,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // Don't log user cancellation as an error
      const isUserCancellation = error.message?.includes('User rejected') || 
                                 error.message?.includes('rejected') ||
                                 error.message?.includes('cancelled') ||
                                 error.message?.includes('Signature request was cancelled');
      
      if (!isUserCancellation) {
        console.error('Error connecting wallet:', error);
      }
      
      setState({
        isConnected: false,
        address: null,
        isLoading: false,
        error: error.message || 'Failed to connect wallet',
      });
      
      // Re-throw the error so it can be handled by the caller (e.g., show toast)
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }

  async function authenticate(address: Address): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot authenticate on server side');
    }

    try {
      // Get nonce from backend RIGHT BEFORE requesting signature
      // This minimizes the chance of expiration
      const { nonce } = await authAPI.getNonce();

      // Create SIWE message
      const message = createSIWEMessage({
        domain: window.location.hostname,
        address,
        statement: 'Sign in to Arc Index',
        uri: window.location.origin,
        version: '1',
        chainId: CHAIN_ID,
        nonce,
      });

      // Get wallet client
      const walletClient = createWalletClient({
        transport: custom(window.ethereum!),
      });

      // Request signature (this opens MetaMask)
      const signature = await walletClient.signMessage({
        account: address,
        message,
      });

      // Verify with backend immediately after signature
      await authAPI.verify({
        walletAddress: address,
        message,
        signature,
        nonce,
      });
    } catch (error: any) {
      // Don't log user cancellation as an error
      const isUserCancellation = error.message?.includes('User rejected') || 
                                 error.message?.includes('rejected') ||
                                 error.message?.includes('cancelled') ||
                                 error.code === 4001; // MetaMask user rejection code
      
      if (!isUserCancellation) {
        console.error('Error authenticating:', error);
      }
      
      // Provide clear error messages
      if (error.message?.includes('Invalid or expired nonce') || error.error === 'Invalid or expired nonce') {
        throw new Error('The authentication request expired. Please try connecting again.');
      }
      
      if (isUserCancellation) {
        throw new Error('Signature request was cancelled. Please try again.');
      }
      
      throw new Error(error.message || error.error || 'Authentication failed. Please try again.');
    }
  }

  async function disconnect() {
    setState({
      isConnected: false,
      address: null,
      isLoading: false,
      error: null,
    });

    // Clear session cookie by calling logout endpoint (if exists)
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore errors
    }
  }

  return {
    ...state,
    connect,
    disconnect,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
