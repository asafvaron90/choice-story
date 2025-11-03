import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import { RootLayout as AppLayout } from "./components/common/RootLayout";
import { metadata } from "./metadata";
import AuthProviderWrapper from "./ui/components/AuthProviderWrapper";
import { Toaster } from "../components/ui/toaster"
import { ErrorReportingProvider } from "./components/ui/ErrorReportingProvider";

const inter = Inter({ subsets: ["latin"] });

export { metadata };

// Root layout that provides the context
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <LanguageProvider>
          <AuthProviderWrapper>
            <ErrorReportingProvider>
              <AppLayout>{children}</AppLayout>
            </ErrorReportingProvider>
          </AuthProviderWrapper>
        </LanguageProvider>
        <Toaster />
      </body>
    </html>
  );
}
