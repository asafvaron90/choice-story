"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { useTranslation } from '@/app/hooks/useTranslation';
import { Menu, LogIn, LogOut, LayoutDashboard, Info, MessageCircle, Images, Shield } from 'lucide-react';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/app/context/AuthContext';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { LanguageSelector } from '../LanguageSelector';
import { Account } from '@/models';
import * as Sentry from '@sentry/nextjs';

export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t, direction, isRTL } = useTranslation();
  const { currentUser, logout, googleSignIn, firebaseUser } = useAuth();
  const [isHomePage, setIsHomePage] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userAccountData, setUserAccountData] = useState<Account | null>(null);

  // Update path state whenever pathname changes
  useEffect(() => {
    setIsHomePage(pathname === '/');
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

  const scrollToSection = (sectionClass: string) => {
    const section = document.querySelector(sectionClass);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setIsDrawerOpen(false);
    }
  };

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
      <header className="fixed top-0 left-0 right-0 bg-white z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
          {/* Logo - centered on mobile, left/right aligned based on direction */}
          <div className={cn(
            "flex items-center",
            isRTL ? "order-3 md:order-3" : "order-1 md:order-1"
          )}>
            <Link href="/" prefetch={true} className="relative">
              <div className="w-[140px] h-[84px]">
                <Image
                  src="/landing-page-images/logo.svg"
                  alt="Choice Story"
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className={cn(
            "hidden md:flex items-center gap-4",
            isRTL ? "order-1" : "order-3"
          )}>
            <LanguageSelector />
            <Button 
              onClick={handleAuth}
              variant="ghost"
            >
              {currentUser ? t.nav.signOut : t.nav.signIn}
            </Button>
            {currentUser && (
              <>
                {hasReadAccess && (
                  <Button 
                    onClick={goToGallery}
                    variant="default"
                  >
                    {t.nav.gallery}
                  </Button>
                )}
                {hasWriteAccess && (
                  <Button 
                    onClick={goToDashboard}
                    variant="default"
                  >
                    {t.nav.dashboard}
                  </Button>
                )}
                {hasAdminAccess && (
                  <Button 
                    onClick={goToAdminPanel}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    {t.nav.adminPanel}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className={cn(
            "md:hidden",
            isRTL ? "order-1" : "order-3"
          )}>
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
                          src="/landing-page-images/logo.svg" 
                          alt="Choice Story" 
                          width={220}
                          height={84}
                          className="cover"
                        />
                      </Link>
                    </motion.div>

                    {/* Account Section */}
                    <div className="px-4 py-3 mb-6 bg-gray-50 rounded-lg">
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

                  {/* Bottom Grid Navigation */}
                  <div className={cn(
                    "grid grid-cols-2 gap-3 px-4 py-4 border-t",
                    isRTL ? "text-right" : "text-left"
                  )}>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (isHomePage) {
                          scrollToSection('.hero__block');
                        } else {
                          router.push('/');
                        }
                        setIsDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 h-auto py-4",
                        isRTL ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Info className="h-5 w-5" />
                      {t.nav.about}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (isHomePage) {
                          scrollToSection('.contact__form');
                        } else {
                          router.push('/#contact');
                        }
                        setIsDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 h-auto py-4",
                        isRTL ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <MessageCircle className="h-5 w-5" />
                      {t.nav.contact}
                    </Button>
                  </div>
                </nav>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
      </header>
      {/* Spacer for fixed header - only present when header is rendered */}
      <div className="h-16" aria-hidden="true" />
    </>
  );
};

export default Header;
