"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from '@/app/hooks/useTranslation';
import { Menu, LogIn, LogOut, LayoutDashboard, Images, Shield, Plus } from 'lucide-react';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Account } from '@/models';
import * as Sentry from '@sentry/nextjs';

// Israel Flag Component with PNG Star of David
const IsraelFlag = ({ className }: { className?: string }) => (
  <div className={cn("relative", className)} style={{ width: '24px', height: '24px' }}>
    <svg viewBox="0 0 24 24" className="absolute inset-0" fill="none">
      <rect width="24" height="24" rx="2" fill="white"/>
      <rect y="3" width="24" height="3" fill="#0037b8aa"/>
      <rect y="18" width="24" height="3" fill="#0037b8aa"/>
    </svg>
    <div className="absolute inset-0 flex items-center justify-center">
      <Image
        src="/icons/star-of-david.png"
        alt="Star of David"
        width={10}
        height={10}
        className="object-contain"
      />
    </div>
  </div>
);

// US Flag SVG Component
const USFlag = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 24" className={className}>
    <rect width="28" height="24" rx="2" fill="#B22234"/>
    <rect y="1.85" width="28" height="1.54" fill="white"/>
    <rect y="4.92" width="28" height="1.54" fill="white"/>
    <rect y="8" width="28" height="1.54" fill="white"/>
    <rect y="11.08" width="28" height="1.54" fill="white"/>
    <rect y="14.15" width="28" height="1.54" fill="white"/>
    <rect y="17.23" width="28" height="1.54" fill="white"/>
    <rect y="20.31" width="28" height="1.54" fill="white"/>
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

interface ActionButtonExtendedProps extends ActionButtonProps {
  roundedCorner?: 'none' | 'bottom-left' | 'bottom-right';
}

const ActionButton = ({ icon, label, onClick, isActive, roundedCorner = 'none' }: ActionButtonExtendedProps) => {
  const cornerClass = {
    'none': '',
    'bottom-left': 'rounded-bl-2xl',
    'bottom-right': 'rounded-br-2xl'
  }[roundedCorner];

  const borderClass = {
    'none': 'border border-t-0 border-gray-200',
    'bottom-left': 'border border-t-0 border-r-0 border-gray-200',
    'bottom-right': 'border border-t-0 border-l-0 border-gray-200'
  }[roundedCorner];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[70px] transition-all hover:bg-gray-100",
        isActive ? "bg-blue-100" : "bg-gray-50",
        cornerClass,
        borderClass
      )}
    >
      <div className={cn(
        "flex items-center justify-center transition-all",
        isActive ? "w-[39px] h-[39px]" : "w-[31.2px] h-[31.2px]"
      )}>
        {icon}
      </div>
      <span className={cn(
        "transition-all h-[14px] flex items-center text-gray-700",
        isActive ? "text-[14px] font-bold" : "text-xs font-medium"
      )}>{label}</span>
    </button>
  );
};

// Language Action Button with flags
interface LanguageButtonProps {
  language: string;
  onClick: () => void;
  roundedCorner?: 'none' | 'bottom-left' | 'bottom-right' | 'both';
}

const LanguageButton = ({ language, onClick, roundedCorner = 'none' }: LanguageButtonProps) => {
  const cornerClass = {
    'none': '',
    'bottom-left': 'rounded-bl-2xl',
    'bottom-right': 'rounded-br-2xl',
    'both': 'rounded-b-2xl'
  }[roundedCorner];

  const borderClass = {
    'none': 'border border-t-0 border-gray-200',
    'bottom-left': 'border border-t-0 border-r-0 border-gray-200',
    'bottom-right': 'border border-t-0 border-l-0 border-gray-200',
    'both': 'border border-t-0 border-gray-200'
  }[roundedCorner];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 px-4 py-2 min-w-[70px] transition-colors bg-gray-50 hover:bg-gray-100",
        cornerClass,
        borderClass
      )}
    >
      <div className="w-[31.2px] h-[31.2px] flex items-center justify-center">
        {language === 'he' ? <IsraelFlag className="w-[31.2px] h-[31.2px]" /> : <USFlag className="w-[31.2px] h-[31.2px]" />}
      </div>
      <span className="text-xs font-medium text-gray-700 h-[14px] flex items-center">
        {language === 'he' ? 'עברית' : 'English'}
      </span>
    </button>
  );
};

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, direction, isRTL, language, setLanguage } = useTranslation();
  const { currentUser, logout, googleSignIn, firebaseUser } = useAuth();
  const [currentPath, setCurrentPath] = useState("/");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userAccountData, setUserAccountData] = useState<Account | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      // Show confirmation modal before logging out
      setShowLogoutConfirm(true);
    } else {
      try {
        await googleSignIn();
      } catch (error) {
        console.error("Google sign in failed:", error);
      }
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      setShowLogoutConfirm(false);
      router.push('/'); // Navigate to home page immediately
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
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

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-transparent backdrop-blur-sm z-50 h-24">
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
              className="relative flex flex-row items-center px-6 py-4 rounded-b-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-t-0 border-gray-200"
            >
              <span className="text-m mx-2 font-medium text-gray-600">
                {t.nav.newProfile}
              </span>
              <Image
                src="/icons/kids.svg"
                alt="New Profile"
                width={52}
                height={52}
              />
              {/* Plus button positioned at bottom, overlapping border */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Desktop Navigation - Conditional rendering based on user state */}
        <div className={cn(
          "hidden md:flex absolute top-0 right-4 z-10",
          isRTL ? "flex-row-reverse" : "flex-row"
        )}>
          {!currentUser ? (
            /* Logged Out State: Only show Language Selector with both corners rounded */
            <LanguageButton 
              language={language} 
              onClick={toggleLanguage} 
              roundedCorner="both"
            />
          ) : (
            /* Logged In State: Full navigation */
            <>
              {/* Left Section: Language Selector with bottom-left rounded corner */}
              <LanguageButton 
                language={language} 
                onClick={toggleLanguage} 
                roundedCorner="bottom-left"
              />
              
              {/* Divider after language */}
              <div className="w-px h-20 bg-[#E5E7EB] mt-0" />
              
              {/* Middle Section: Navigation buttons without rounded corners */}
              {/* Management Button - Admin users only */}
              {hasAdminAccess && (
                <>
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
                  <div className="w-px h-20 bg-[#E5E7EB]" />
                </>
              )}
              
              {/* Dashboard Button - Only for users with write/admin access */}
              {hasWriteAccess && (
                <>
                  <ActionButton
                    icon={
                      <Image
                        src="/icons/dashboard.svg"
                        alt={t.nav.dashboard}
                        width={24}
                        height={24}
                      />
                    }
                    label={t.nav.dashboard}
                    onClick={goToDashboard}
                    isActive={isActive('/dashboard')}
                  />
                  <div className="w-px h-20 bg-[#E5E7EB]" />
                </>
              )}
              
              {/* Library/Gallery Button - Available to ALL users */}
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
              
              {/* Divider before logout */}
              <div className="w-px h-20 bg-[#E5E7EB]" />
              
              {/* Right Section: Logout/Login with bottom-right rounded corner */}
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
                roundedCorner="bottom-right"
              />
            </>
          )}
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
                        className="relative w-full flex flex-col items-center gap-2 px-6 pt-4 pb-8 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100"
                      >
                        <Image
                          src="/icons/kids.svg"
                          alt="New Profile"
                          width={48}
                          height={48}
                          className="opacity-80"
                        />
                        <span className="text-sm font-medium text-gray-600">
                          {t.nav.newProfile}
                        </span>
                        {/* Plus button positioned at bottom, overlapping border */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                            <Plus className="w-5 h-5 text-white" />
                          </div>
                        </div>
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
                        {/* Gallery - Available to all users */}
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
                        {/* Management - Write/Admin users */}
                        {hasWriteAccess && (
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
                    
                    {/* Library - Available to all users */}
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
                  </div>
                </div>
              </nav>
            </DrawerContent>
          </Drawer>
        </div>
      </header>
      {/* Spacer for fixed header - only present when header is rendered */}
      <div className="h-24" aria-hidden="true" />

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className={cn("sm:max-w-[425px]", direction)}>
          <DialogHeader>
            <DialogTitle className={cn(isRTL ? "text-right" : "text-left")}>
              {t.logoutConfirmation.title}
            </DialogTitle>
            <DialogDescription className={cn(isRTL ? "text-right" : "text-left")}>
              {t.logoutConfirmation.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={cn("gap-2", isRTL ? "flex-row-reverse" : "flex-row")}>
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
            >
              {t.logoutConfirmation.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutConfirm}
            >
              {t.logoutConfirmation.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;
