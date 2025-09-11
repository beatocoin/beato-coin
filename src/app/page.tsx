// Trigger rebuild - deployment test
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createClient } from "@/utils/supabase/client";
import { 
  WalletIcon, 
  QrCodeIcon, 
  CurrencyDollarIcon,
  GiftIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { useTheme } from "../contexts/ThemeContext"
import CountdownClock from '../components/CountdownClock';
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalClose } from "../../nextjs-template/src/components/ui/modal";

// Feature component to use in multiple sections
interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

const Feature = ({ icon, title, description, className = "" }: FeatureProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-md transform hover:scale-105 transition-transform duration-200 ${className} p-[25px]`}>
      <div className="text-[#36A486] mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <div className={`text-gray-600 text-[0.9rem] md:text-[1.1rem] ${className}`} dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
};

// Placeholder for RemainingSpots component
const RemainingSpots = () => {
  return (
    <div className="bg-green-100 px-6 py-2 rounded-full">
      <span className="text-green-600 font-semibold">76 spots remaining</span>
    </div>
  );
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = createClient();
  const { colors } = useTheme();
  const [presaleEndDate, setPresaleEndDate] = useState<Date | null>(null);

  const handleRegister = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`
      }
    });
  };

  useEffect(() => {
    // Ensure video plays
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log("Video autoplay failed:", error);
      });
    }
    // Fetch presale_end_date from crypto_settings
    const fetchPresaleEndDate = async () => {
      const { data, error } = await supabase
        .from('crypto_settings')
        .select('presale_end_date')
        .single();
      if (!error && data?.presale_end_date) {
        const date = new Date(data.presale_end_date);
        if (date > new Date()) {
          setPresaleEndDate(date);
        }
      }
    };
    fetchPresaleEndDate();
  }, [supabase]);

  return (
    <main className="pt-0 pr-0 pl-0 pb-8 w-full">
      {/* Hero Section */}
      <section className="relative border-b w-full" style={{ borderColor: colors.secondary, zIndex: 10 }}>
        {/* Image Background */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: `url('/home-banner.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)' }} />
          {/* Fallback gradient overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, ${colors.dark}CC 0%, ${colors.accent1}80 60%, ${colors.accent2}80 100%)`,
              opacity: 0.8
            }}
          />
        </div>
        
        {/* Content */}
        <div
          className="relative z-10 w-full"
          style={{
            maxWidth: '1100px',
            margin: 'auto',
            paddingTop: '5rem',
            paddingBottom: '5rem',
            width: '95%',
            boxSizing: 'border-box',
          }}
        >
          <h1
            className="text-[1.4rem] leading-[1.75rem] md:text-[3rem] lg:text-[3rem] md:leading-[3.75rem] font-bold mb-6 text-center md:pb-4"
            style={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent1}, ${colors.accent2})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            <style>{`
              @media (max-width: 767px) {
                .hero-h1-overwrite { line-height: 2rem !important; }
                .hero-p-overwrite { font-size: 1.05rem !important; line-height: 1.5rem !important; }
              }
            `}</style>
            <span className="hero-h1-overwrite">Beato Coin: The Future of Water Security</span>
          </h1>
          <p className="text-[1.1rem] leading-[1.6rem] md:text-xl mb-12 text-center hero-p-overwrite" style={{ color: 'white' }}>
            The Beato Coin Token merges physical and digital assets by tokenizing your water supply. Each Beato Coin represents a case of water that you can redeem at a later date. Secure your future water needs and peace of mind knowing that your water inventory is ready and available when you need it most.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth?tab=register" className="w-[300px]">
              <button className="w-full px-[50px] py-3 text-white font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: colors.accent2 }}>
                Create Account
              </button>
            </Link>
            <a href="https://www.aquabeato.shop/pre-buy/" target="_blank" rel="noopener noreferrer" className="w-[300px]">
              <button className="w-full px-[50px] py-3 text-white font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: colors.accent1 }}>
                Buy $BEATO
              </button>
            </a>
            <Modal>
              <ModalTrigger asChild>
                <button
                  className="w-[300px] px-[50px] py-3 text-white font-semibold rounded-lg transition-colors"
                  style={{ backgroundColor: colors.accent2 }}
                >
                  About Beato Crypto
                </button>
              </ModalTrigger>
              <ModalContent
                style={{
                  width: '750px',
                  maxWidth: '95vw',
                  padding: '0',
                  borderRadius: '16px',
                  background: '#fff',
                }}
              >
                <div
                  style={{
                    padding: '25px',
                    maxWidth: '95vw',
                  }}
                  className="sm:p-[25px] p-[10px] flex flex-col items-center justify-center"
                >
                  <ModalHeader>
                    <ModalTitle>About Beato Crypto</ModalTitle>
                  </ModalHeader>
                  <video
                    src="/aqua-beato-coin-overview.mp4"
                    controls
                    style={{
                      width: '100%',
                      maxWidth: '650px',
                      height: '400px',
                      borderRadius: '12px',
                      background: '#000',
                      margin: '0 auto',
                      display: 'block',
                    }}
                  />
                </div>
                <ModalClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <span className="sr-only">Close</span>
                </ModalClose>
              </ModalContent>
            </Modal>
          </div>
        </div>
      </section>

      {/* Countdown Clock Section */}
      {presaleEndDate && (
        <div style={{ maxWidth: '95%', margin: 'auto' }}>
          <CountdownClock endDate={presaleEndDate} />
        </div>
      )}

      {/* How It Works */}
      <section className="w-full py-20" style={{ backgroundColor: colors.secondary }}>
        <div className="w-full" style={{ maxWidth: '95%', margin: 'auto' }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Block 1 */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px] flex flex-col items-center border border-[#d8d8d8]">
              <div className="rounded-full w-16 h-16 flex items-center justify-center mb-4" style={{ backgroundColor: colors.accent1 }}>
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-center">Create a Free Account</h3>
              <p className="text-gray-600 text-[0.9rem] md:text-[1rem] mb-6 text-center">Create your free account to get started securing your future water needs.</p>
              <Link href="/auth?tab=register">
                <button className="px-[50px] py-2 text-white font-medium rounded-lg transition-colors" style={{ backgroundColor: colors.accent2 }}>
                  Create Account
                </button>
              </Link>
            </div>
            {/* Block 2 */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px] flex flex-col items-center border border-[#d8d8d8]">
              <div className="rounded-full w-16 h-16 flex items-center justify-center mb-4" style={{ backgroundColor: colors.accent2 }}>
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-center">Create or Connect Your Wallet</h3>
              <p className="text-gray-600 text-[0.9rem] md:text-[1rem] mb-6 text-center">Connect your choice of over 400 Wallets or create a Beato Wallet that offers special rewards like AirDrops and Beato NFTs.</p>
              <Link href="/wallet">
                <button className="px-[50px] py-2 text-white font-medium rounded-lg transition-colors" style={{ backgroundColor: colors.primary }}>
                  Wallet
                </button>
              </Link>
            </div>
            {/* Block 3 */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px] flex flex-col items-center border border-[#d8d8d8]">
              <div className="rounded-full w-16 h-16 flex items-center justify-center mb-4" style={{ backgroundColor: colors.primary }}>
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-2 text-center">Buy Beato Tokens</h3>
              <p className="text-gray-600 text-[0.9rem] md:text-[1rem] mb-6 text-center">Each token represents a case of water and retains its stable value at your purchased price or increases in value with market demand and token supply.</p>
              <a href="https://www.aquabeato.shop/pre-buy/" target="_blank" rel="noopener noreferrer">
                <button className="px-[50px] py-2 text-white font-medium rounded-lg transition-colors" style={{ backgroundColor: colors.accent1 }}>
                  Buy $BEATO
                </button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Info Blocks Section */}
      <section className="w-full py-12" style={{ backgroundColor: colors.secondary }} id="water-security">
        <div className="w-full" style={{ maxWidth: '95%', margin: 'auto' }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* First Block */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px]">
              <div className="flex justify-center mb-2">
                <ShieldCheckIcon className="w-14 h-14" style={{ color: colors.accent1 }} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.dark }}>
                Water Security Assurance
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  In an era of climate uncertainty and water scarcity, Beato Coin tokens provide peace of mind. Secure your future water supply, no matter what challenges arise.
                </p>
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  Token holders have a tangible claim on essential resources, protected from supply chain disruptions and environmental risks.
                </p>
              </div>
            </div>

            {/* Second Block */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px]">
              <div className="flex justify-center mb-2">
                <ChartBarIcon className="w-14 h-14" style={{ color: colors.primary }} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.accent1 }}>
                Asset Tokenization
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  Our blockchain-based model creates a transparent, real-time record of future demand, enabling efficient production planning and reducing waste.
                </p>
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  Beato Coin optimizes resource allocation throughout the supply chain, setting a new standard for inventory management.
                </p>
              </div>
            </div>

            {/* Third Block: Environmental Benefits */}
            <div className="bg-[#fafafa] rounded-2xl shadow-lg py-6 px-[25px]">
              <div className="flex justify-center mb-2">
                <ArrowsRightLeftIcon className="w-14 h-14" style={{ color: colors.dark }} />
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
                Environmental Benefits
              </h2>
              <div className="space-y-3">
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  Choosing Beato Coin means choosing water packaged in recycled aluminum cans, not plastic bottles. Aluminum is infinitely recyclable and has a much lower environmental impact than single-use plastics.
                </p>
                <p className="text-gray-600 text-[0.9rem] md:text-[1rem]">
                  By supporting aluminum over plastic, you help reduce ocean and landfill pollution, conserve resources, and support a circular economy for packaging materials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20" style={{ backgroundColor: colors.secondary }}>
        <div className="w-full" style={{ maxWidth: '95%', margin: 'auto' }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Block 1 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <WalletIcon className="w-14 h-14" style={{ color: colors.accent1 }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.dark }}>
                Market Positioning
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Beato Coin stands at the intersection of essential commodities and digital assets, appealing to both sustainability-conscious consumers and forward-thinking investors.
              </div>
            </div>
            {/* Block 2 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <GiftIcon className="w-14 h-14" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.accent1 }}>
                Democratized Access
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Our token system allows anyone to secure future water supplies—no storage space or complex logistics required. Perfect for urban dwellers and organizations alike.
              </div>
            </div>
            {/* Block 3 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <QrCodeIcon className="w-14 h-14" style={{ color: colors.dark }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
                Transparency Benefits
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Every token's history is immutably recorded, offering unprecedented transparency in water sourcing, production, and inventory.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full py-20" style={{ backgroundColor: colors.secondary }}>
        <div className="w-full" style={{ maxWidth: '95%', margin: 'auto' }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Block 1 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ShieldCheckIcon className="w-14 h-14" style={{ color: colors.accent1 }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.dark }}>
                Token Appreciation
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Part of the roadmap for the Beato Coin is to create a secondary market for the token, allowing holders to buy and sell their tokens on a decentralized exchange.
              </div>
            </div>
            {/* Block 2 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ChartBarIcon className="w-14 h-14" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.accent1 }}>
                AirDrops
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Create a Beato Wallet and hold Beato Tokens to be eligable for AirDrops of Beato Tokens and other amazing rewards.
              </div>
            </div>
            {/* Block 3 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ArrowsRightLeftIcon className="w-14 h-14" style={{ color: colors.dark }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
                Simple Process for Anyone
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                Even if you have never owned crypto before, you can easily create a Beato Wallet and start holding Beato Tokens in under 60 seconds.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="w-full py-20" style={{ backgroundColor: colors.secondary }}>
        <div className="w-full" style={{ maxWidth: '95%', margin: 'auto' }}>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Block 1 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ShieldCheckIcon className="w-14 h-14" style={{ color: colors.accent1 }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.dark }}>
                AI Agent
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                The Beato AI Agent is an expert in a wide range of topics, including water security, environmental sustainability, blockchain technology, and the future of the digital asset economy.
              </div>
            </div>
            {/* Block 2 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ChartBarIcon className="w-14 h-14" style={{ color: colors.primary }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.accent1 }}>
                NFT Integration
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem]">
                The Beato Wallet is able to hold a wide range of tokens and NFTs, including Beato Tokens, Beato NFTs, and other digital assets.
              </div>
            </div>
            {/* Block 3 */}
            <div className="bg-white rounded-xl shadow-md p-[25px]">
              <div className="flex justify-center mb-2">
                <ArrowsRightLeftIcon className="w-14 h-14" style={{ color: colors.dark }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-center" style={{ color: colors.primary }}>
                Fiat On-Ramps
              </h3>
              <div className="text-gray-600 text-[0.9rem] md:text-[1.1rem] whitespace-pre-line">
                Easily buy Beato Tokens with a credit card or bank transfer and have the Beato Tokens deposited into your Wallet with a garaunteed blockchain smart contract.
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer Section */}
      <footer className="w-full bg-[#222] text-white py-8 text-center text-sm md:text-[1.25rem] font-medium" style={{padding: '15px'}}>
        Experience the future of hydration. Secure your water, embrace transparency, and join a new era of water security with Beato Coin.
      </footer>
    </main>
  );
} 