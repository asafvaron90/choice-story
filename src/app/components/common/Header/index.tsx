"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from '@/app/hooks/useTranslation';
import { Menu, LogIn, LogOut, LayoutDashboard, Images, Shield, Plus } from 'lucide-react';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Account } from '@/models';
import * as Sentry from '@sentry/nextjs';

// Israel Flag SVG Component
const IsraelFlag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="2" fill="white"/>
    <rect y="3" width="24" height="3" fill="#0038B8"/>
    <rect y="18" width="24" height="3" fill="#0038B8"/>
    <path d="M12 7L14.5 11H9.5L12 7Z" stroke="#0038B8" strokeWidth="1.5" fill="none"/>
    <path d="M12 17L9.5 13H14.5L12 17Z" stroke="#0038B8" strokeWidth="1.5" fill="none"/>
  </svg>
);

// US Flag SVG Component
const USFlag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect width="24" height="24" rx="2" fill="#B22234"/>
    <rect y="1.85" width="24" height="1.54" fill="white"/>
    <rect y="4.92" width="24" height="1.54" fill="white"/>
    <rect y="8" width="24" height="1.54" fill="white"/>
    <rect y="11.08" width="24" height="1.54" fill="white"/>
    <rect y="14.15" width="24" height="1.54" fill="white"/>
    <rect y="17.23" width="24" height="1.54" fill="white"/>
    <rect y="20.31" width="24" height="1.54" fill="white"/>
    <rect width="9.6" height="12.92" fill="#3C3B6E"/>
  </svg>
);

// Vertical Action Button Component
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

const ActionButton = ({ icon, label, onClick, isActive }: ActionButtonProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[70px] rounded-lg transition-colors",
      "hover:bg-gray-100",
      isActive && "bg-primary/10 text-primary"
    )}
  >
    <div className="w-6 h-6 flex items-center justify-center">
      {icon}
    </div>
    <span className="text-xs font-medium text-gray-700">{label}</span>
  </button>
);

// Language Action Button with flags
interface LanguageButtonProps {
  language: string;
  onClick: () => void;
}

const LanguageButton = ({ language, onClick }: LanguageButtonProps) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[70px] rounded-lg transition-colors hover:bg-gray-100"
  >
    <div className="w-6 h-6 flex items-center justify-center">
      {language === 'he' ? <IsraelFlag className="w-6 h-6" /> : <USFlag className="w-6 h-6" />}
    </div>
    <span className="text-xs font-medium text-gray-700">
      {language === 'he' ? 'עברית' : 'English'}
    </span>
  </button>
);

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, direction, isRTL, language, setLanguage } = useTranslation();
  const { currentUser, logout, googleSignIn, firebaseUser } = useAuth();
  const [currentPath, setCurrentPath] = useState("/");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userAccountData, setUserAccountData] = useState<Account | null>(null);

  // Update path state whenever pathname changes
  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  // Fetch user account data to check for role
  const fetchUserAccount = useCallback(async () => {
    if (!firebaseUser || !currentUser) {
      setUserAccountData(null);
      return;
    }

    try {
      const token = await firebaseUser.getIdToken();
      
      const response = await fetch(`/api/account/me?uid=${currentUser.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user account');
      }

      const data = await response.json();
      setUserAccountData(data.account);
    } catch (err) {
      console.error('Error fetching user account:', err);
      Sentry.captureException(err);
      setUserAccountData(null);
    }
  }, [firebaseUser, currentUser]);

  // Fetch user account when user logs in
  useEffect(() => {
    if (currentUser && firebaseUser) {
      fetchUserAccount();
    } else {
      setUserAccountData(null);
    }
  }, [currentUser, firebaseUser, fetchUserAccount]);


  const handleAuth = async () => {
    if (currentUser) {
      try {
        await logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }
    } else {
      try {
        await googleSignIn();
      } catch (error) {
        console.error("Google sign in failed:", error);
      }
    }
  };

  const goToCreateKid = () => {
    router.push("/create-a-kid");
    setIsDrawerOpen(false);
  };

  const goToDashboard = () => {
    router.push("/dashboard");
    setIsDrawerOpen(false);
  };

  const goToGallery = () => {
    router.push("/gallery");
    setIsDrawerOpen(false);
  };

  const goToAdminPanel = () => {
    router.push("/admin-panel");
    setIsDrawerOpen(false);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'he' ? 'en' : 'he');
  };

  const isActive = (path: string) => {
    return currentPath === path;
  };

  // Check if user has admin access (role must be "admin")
  const hasAdminAccess = userAccountData?.role === "admin";
  
  // Check role for dashboard and gallery (admins get access to everything)
  // Write role implies read access (write users can see both dashboard and gallery)
  const hasWriteAccess = userAccountData?.role === "write" || hasAdminAccess;
  const hasReadAccess = userAccountData?.role === "read" || userAccountData?.role === "write" || hasAdminAccess;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white z-50 h-24">
        {/* Logo - Always on the left */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20">
          <Link href="/" prefetch={true}>
            <div className="w-[220px] h-[165px] relative">
              <Image
                src="/landing-page-images/logo-v2.svg"
                alt="Choice Story"
                fill
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
          </Link>
        </div>

        {/* Center - New Profile Button (only for writers & admins on dashboard) */}
        {currentUser && hasWriteAccess && isActive('/dashboard') && (
          <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={goToCreateKid}
              className="flex flex-col items-center gap-1 px-8 pt-4 pb-3 rounded-b-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-t-0 border-gray-200"
            >
              <div className="relative">
                <Image
                  src="/icons/kids.svg"
                  alt="New Profile"
                  width={48}
                  height={48}
                  className="opacity-80"
                />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600 mt-1">
                {t.nav.newProfile}
              </span>
            </button>
          </div>
        )}

        {/* Desktop Navigation - Always on the right */}
        <div className="hidden md:block absolute top-0 right-4 z-10">
          <div className={cn(
            "flex items-center gap-1 bg-gray-50 rounded-b-2xl px-3 pt-0 pb-0 border border-t-0 border-gray-200",
            isRTL ? "flex-row-reverse" : "flex-row"
          )}>
            {/* Language Selector */}
            <LanguageButton language={language} onClick={toggleLanguage} />
            
            {/* Divider */}
            <div className="w-px h-20 bg-[#E5E7EB]" />
            
            {/* Logout/Login Button */}
            <ActionButton
              icon={
                <Image
                  src="/icons/log-out.svg"
                  alt={currentUser ? t.nav.signOut : t.nav.signIn}
                  width={24}
                  height={24}
                />
              }
              label={currentUser ? t.nav.signOut : t.nav.signIn}
              onClick={handleAuth}
            />
            
            {/* Library/Gallery Button - Only for users with read/write/admin access */}
            {currentUser && hasReadAccess && (
              <>
                <div className="w-px h-20 bg-[#E5E7EB]" />
                <ActionButton
                  icon={
                    <Image
                      src="/icons/library.svg"
                      alt={t.nav.library}
                      width={24}
                      height={24}
                    />
                  }
                  label={t.nav.library}
                  onClick={goToGallery}
                  isActive={isActive('/gallery')}
                />
              </>
            )}
            
            {/* Management Button - Admin only */}
            {currentUser && hasAdminAccess && (
              <>
                <div className="w-px h-20 bg-[#E5E7EB]" />
                <ActionButton
                  icon={
                    <Image
                      src="/icons/control-panel.svg"
                      alt={t.nav.management}
                      width={24}
                      height={24}
                    />
                  }
                  label={t.nav.management}
                  onClick={goToAdminPanel}
                  isActive={isActive('/admin-panel')}
                />
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button - Always on the right */}
        <div className="md:hidden absolute top-1/2 -translate-y-1/2 right-4">
          <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </DrawerTrigger>
            <DrawerContent 
              side={isRTL ? "left" : "right"}
              className={cn("w-[300px]", direction)}
            >
              <DrawerTitle className="sr-only">
                {t.common.navigationMenu}
              </DrawerTitle>
              <nav className="flex flex-col h-full">
                <div className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center mb-6"
                  >
                    <Link
                      href="/"
                      prefetch={true}
                      onClick={() => setIsDrawerOpen(false)}
                      className="hover:opacity-80 transition-opacity"
                    >
                      <Image 
                        src="/landing-page-images/logo-v2.svg" 
                        alt="Choice Story" 
                        width={220}
                        height={84}
                        className="cover"
                      />
                    </Link>
                  </motion.div>

                  {/* New Profile Button for Mobile (writers & admins on dashboard) */}
                  {currentUser && hasWriteAccess && isActive('/dashboard') && (
                    <div className="px-4 mb-6">
                      <button
                        onClick={goToCreateKid}
                        className="w-full flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                      >
                        <div className="relative">
                          <Image
                            src="/icons/kids.svg"
                            alt="New Profile"
                            width={48}
                            height={48}
                            className="opacity-80"
                          />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Plus className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {t.nav.newProfile}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Account Section */}
                  <div className="px-4 py-3 mb-6 bg-gray-50 rounded-lg mx-4">
                    <h3 className={cn(
                      "text-sm font-medium text-gray-500 mb-3",
                      isRTL ? "text-right" : "text-left"
                    )}>
                      {t.nav.account}
                    </h3>
                    
                    {currentUser && (
                      <>
                        <div className={cn(
                          "text-sm text-gray-600 mb-3 break-words",
                          isRTL ? "text-right" : "text-left"
                        )}>
                          {currentUser.email}
                        </div>
                        {hasReadAccess && (
                          <Button
                            variant="ghost"
                            onClick={goToGallery}
                            className={cn(
                              "w-full flex items-center gap-3 mb-2 justify-start",
                              isActive('/gallery') ? "bg-primary/10 text-primary" : "hover:bg-gray-100",
                              isRTL ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <Images className="h-5 w-5" />
                            {t.nav.gallery}
                          </Button>
                        )}
                        {hasWriteAccess && (
                          <Button
                            variant="ghost"
                            onClick={goToDashboard}
                            className={cn(
                              "w-full flex items-center gap-3 mb-2 justify-start",
                              isActive('/dashboard') ? "bg-primary/10 text-primary" : "hover:bg-gray-100",
                              isRTL ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <LayoutDashboard className="h-5 w-5" />
                            {t.nav.dashboard}
                          </Button>
                        )}
                        {hasAdminAccess && (
                          <Button
                            variant="ghost"
                            onClick={goToAdminPanel}
                            className={cn(
                              "w-full flex items-center gap-3 mb-2 justify-start",
                              isActive('/admin-panel') ? "bg-primary/10 text-primary" : "hover:bg-gray-100",
                              isRTL ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <Shield className="h-5 w-5" />
                            {t.nav.adminPanel}
                          </Button>
                        )}
                      </>
                    )}

                    <Button
                      onClick={handleAuth}
                      variant="outline"
                      className={cn(
                        "w-full flex items-center gap-2",
                        isRTL ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {currentUser ? <LogOut className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                      {currentUser ? t.nav.signOut : t.nav.signIn}
                    </Button>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="px-4 py-4 border-t">
                  <div className={cn(
                    "flex justify-center gap-2 bg-gray-50 rounded-2xl p-2",
                    isRTL ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* Language */}
                    <LanguageButton language={language} onClick={toggleLanguage} />
                    
                    <div className="w-px h-12 bg-gray-200 self-center" />
                    
                    {/* Logout */}
                    <ActionButton
                      icon={
                        <Image
                          src="/icons/log-out.svg"
                          alt={currentUser ? t.nav.signOut : t.nav.signIn}
                          width={24}
                          height={24}
                        />
                      }
                      label={currentUser ? t.nav.signOut : t.nav.signIn}
                      onClick={handleAuth}
                    />
                    
                    {/* Library - Only for users with read/write/admin access */}
                    {currentUser && hasReadAccess && (
                      <>
                        <div className="w-px h-12 bg-gray-200 self-center" />
                        <ActionButton
                          icon={
                            <Image
                              src="/icons/library.svg"
                              alt={t.nav.library}
                              width={24}
                              height={24}
                            />
                          }
                          label={t.nav.library}
                          onClick={goToGallery}
                          isActive={isActive('/gallery')}
                        />
                      </>
                    )}
                  </div>
                </div>
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </header>
      {/* Spacer for fixed header - only present when header is rendered */}
      <div className="h-24" aria-hidden="true" />
    </>
  );
};

export default Header;
